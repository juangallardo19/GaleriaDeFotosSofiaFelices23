import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, degrees, rgb, type Color, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'

// Piezas comunes de las tarjetas imprimibles (QR de invitados y capitanes de mesa)
export const MM = 72 / 25.4
const hex = (value: number) => rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
export const COLOR = {
  vino: hex(0x5a1238),
  fucsia: hex(0xe6157a),
  naranja: hex(0xff8a1f),
  crema: hex(0xfff7f0),
  blanco: rgb(1, 1, 1),
}

// Fuentes y adornos del álbum (se cargan desde /assets/tarjeta); sin ellos la tarjeta sale con las fuentes básicas del PDF
export interface CardArt {
  script?: Uint8Array
  serif?: Uint8Array
  banderines?: Uint8Array
  corazon?: Uint8Array
  estrella?: Uint8Array
  globoRosa?: Uint8Array
  globoNaranja?: Uint8Array
  bolaDisco?: Uint8Array
  shots?: Uint8Array
}

export interface Fonts {
  script: PDFFont
  serif: PDFFont
}

export type Ornaments = { [K in Exclude<keyof CardArt, 'script' | 'serif'>]?: PDFImage }

const HEART = 'M12 21.3C9.3 19.6 2 14.9 2 9.1 2 6 4.4 3.6 7.4 3.6c1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 3 0 5.4 2.4 5.4 5.5 0 5.8-7.3 10.5-10 12.2z'

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

// El nombre va lo más grande posible en una línea; si no cabe ni con el tamaño mínimo, se parte en dos líneas
export function fitName(font: PDFFont, name: string, { maxWidth, maxSize, minSize }: { maxWidth: number; maxSize: number; minSize: number }) {
  const oneLine = Math.min(maxSize, (maxWidth / font.widthOfTextAtSize(name, 1)) * 0.999)
  if (oneLine >= minSize) return { size: Math.floor(oneLine * 10) / 10, lines: [name] }
  const words = name.split(' ')
  let best = { size: 0, lines: [name] }
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')]
    const widest = Math.max(...lines.map((l) => font.widthOfTextAtSize(l, 1)))
    const size = Math.min(maxSize * 0.8, (maxWidth / widest) * 0.999)
    if (size > best.size) best = { size: Math.floor(size * 10) / 10, lines }
  }
  return best
}

// Dibuja en coordenadas "desde arriba" de la tarjeta, como se diseña, y las pasa a las del PDF
export class CardPen {
  readonly cx: number

  constructor(
    readonly page: PDFPage,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
  ) {
    this.cx = x + w / 2
  }

  py(top: number) {
    return this.y + this.h - top
  }

  text(text: string, font: PDFFont, size: number, top: number, color: Color = COLOR.vino) {
    this.page.drawText(text, { x: this.cx - font.widthOfTextAtSize(text, size) / 2, y: this.py(top), size, font, color })
  }

  // Versalitas con espacio entre letras, como los títulos de una invitación
  spaced(text: string, font: PDFFont, size: number, top: number, tracking: number, color: Color = COLOR.vino, left?: number) {
    const chars = [...text]
    const width = chars.reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) + tracking * (chars.length - 1)
    let x = left ?? this.cx - width / 2
    for (const ch of chars) {
      this.page.drawText(ch, { x, y: this.py(top), size, font, color })
      x += font.widthOfTextAtSize(ch, size) + tracking
    }
  }

  textAt(text: string, font: PDFFont, size: number, left: number, top: number, color: Color = COLOR.vino) {
    this.page.drawText(text, { x: left, y: this.py(top), size, font, color })
  }

  heart(cx: number, top: number, size: number, color: Color = COLOR.fucsia) {
    this.page.drawSvgPath(HEART, { x: cx - size / 2, y: this.py(top), scale: size / 24, color })
  }

  // Línea, corazón, línea: el separador de la tarjeta
  divider(top: number, half = 64, heart = 7) {
    const y = this.py(top)
    const gap = heart * 0.9
    this.page.drawLine({ start: { x: this.cx - half, y }, end: { x: this.cx - gap, y }, thickness: 0.6, color: COLOR.naranja })
    this.page.drawLine({ start: { x: this.cx + gap, y }, end: { x: this.cx + half, y }, thickness: 0.6, color: COLOR.naranja })
    this.heart(this.cx, top - heart / 2, heart)
  }

  image(img: PDFImage, left: number, top: number, width: number, rotate = 0) {
    const height = (img.height / img.width) * width
    this.page.drawImage(img, { x: left, y: this.py(top + height), width, height, rotate: degrees(rotate) })
    return height
  }

  // Trazo SVG con origen en (left, top) de la tarjeta
  path(d: string, left: number, top: number, style: Parameters<PDFPage['drawSvgPath']>[1] = {}) {
    this.page.drawSvgPath(d, { x: left, y: this.py(top), ...style })
  }

  // Fondo crema, marco naranja y la costura punteada fucsia del álbum
  frame() {
    this.page.drawRectangle({ x: this.x, y: this.y, width: this.w, height: this.h, color: COLOR.crema })
    this.roundRect(8, 9, { borderColor: COLOR.naranja, borderWidth: 0.8 })
    this.roundRect(12.5, 6, { borderColor: COLOR.fucsia, borderWidth: 0.6, borderOpacity: 0.55, borderDashArray: [2.4, 2] })
  }

  private roundRect(inset: number, r: number, style: Parameters<PDFPage['drawSvgPath']>[1]) {
    const w = this.w - inset * 2
    const h = this.h - inset * 2
    const path = `M${r},0 H${w - r} Q${w},0 ${w},${r} V${h - r} Q${w},${h} ${w - r},${h} H${r} Q0,${h} 0,${h - r} V${r} Q0,0 ${r},0 Z`
    this.page.drawSvgPath(path, { x: this.x + inset, y: this.y + this.h - inset, ...style })
  }
}

// Nombre grande en cursiva; devuelve dónde termina para seguir dibujando debajo
export function drawName(p: CardPen, name: string, fonts: Fonts, top: number, maxSize: number, margin = 76) {
  const fit = fitName(fonts.script, name, { maxWidth: p.w - margin, maxSize, minSize: maxSize * 0.68 })
  const lineHeight = fit.size * 0.98
  fit.lines.forEach((line, i) => p.text(line, fonts.script, fit.size, top + fit.size * 0.78 + i * lineHeight, COLOR.fucsia))
  // Las letras de Pinyon bajan casi media letra (p, g, z): se deja ese espacio antes de seguir
  return top + fit.size * 0.78 + (fit.lines.length - 1) * lineHeight + fit.size * 0.42
}

export async function embedFonts(doc: PDFDocument, art?: CardArt): Promise<Fonts> {
  if (art?.script && art.serif) {
    doc.registerFontkit(fontkit)
    return { script: await doc.embedFont(art.script, { subset: true }), serif: await doc.embedFont(art.serif, { subset: true }) }
  }
  return { script: await doc.embedFont(StandardFonts.TimesRomanBoldItalic), serif: await doc.embedFont(StandardFonts.TimesRoman) }
}

export async function embedOrnaments(doc: PDFDocument, art?: CardArt): Promise<Ornaments> {
  const ornaments: Ornaments = {}
  for (const key of ['banderines', 'corazon', 'estrella', 'globoRosa', 'globoNaranja', 'bolaDisco', 'shots'] as const) {
    const bytes = art?.[key]
    if (bytes) ornaments[key] = await doc.embedPng(bytes)
  }
  return ornaments
}
