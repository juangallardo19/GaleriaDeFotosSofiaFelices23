import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, degrees, rgb, type Color, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { CardSheetBuilder, type CardGuest, type CardSlot } from './card-sheet'
import { CARD_MESSAGE, CARD_QR_LINES, CARD_QR_TITLE, CARD_SIGNATURE } from './card-text'
import { qrPng } from './qr-image'

const MM = 72 / 25.4
const A4 = { w: 210 * MM, h: 297 * MM }
const hex = (value: number) => rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
const COLOR = {
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
}

interface Fonts {
  script: PDFFont
  serif: PDFFont
}

interface Ornaments {
  banderines?: PDFImage
  corazon?: PDFImage
  estrella?: PDFImage
  globoRosa?: PDFImage
  globoNaranja?: PDFImage
}

const HEART = 'M12 21.3C9.3 19.6 2 14.9 2 9.1 2 6 4.4 3.6 7.4 3.6c1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 3 0 5.4 2.4 5.4 5.5 0 5.8-7.3 10.5-10 12.2z'

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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
class CardPen {
  readonly cx: number

  constructor(
    private readonly page: PDFPage,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
  ) {
    this.cx = x + w / 2
  }

  private py(top: number) {
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

function pen(page: PDFPage, s: CardSlot) {
  return new CardPen(page, s.x * MM, A4.h - (s.y + s.h) * MM, s.w * MM, s.h * MM)
}

function drawTop(p: CardPen, o: Ornaments) {
  if (o.banderines) p.image(o.banderines, p.cx - p.w * 0.37, 15, p.w * 0.74)
  if (o.corazon) p.image(o.corazon, p.x + 18, 50, 16, 14)
  if (o.estrella) p.image(o.estrella, p.x + p.w - 36, 47, 15, -12)
}

// Nombre grande en cursiva; devuelve dónde termina para seguir dibujando debajo
function drawName(p: CardPen, name: string, fonts: Fonts, top: number, maxSize: number) {
  const fit = fitName(fonts.script, name, { maxWidth: p.w - 76, maxSize, minSize: maxSize * 0.68 })
  const lineHeight = fit.size * 0.98
  fit.lines.forEach((line, i) => p.text(line, fonts.script, fit.size, top + fit.size * 0.78 + i * lineHeight, COLOR.fucsia))
  return top + fit.size * 0.78 + (fit.lines.length - 1) * lineHeight + fit.size * 0.42
}

function drawQrCard(page: PDFPage, s: CardSlot, qr: PDFImage, fonts: Fonts, date: string, o: Ornaments) {
  const p = pen(page, s)
  p.frame()
  drawTop(p, o)

  const nameEnd = drawName(p, s.guest.name, fonts, 72, 46)
  // Con el nombre en dos líneas todo se aprieta un poco para que quepa
  const twoLines = nameEnd > 146
  let t = nameEnd + 4
  p.divider(t)

  const size = twoLines ? 9.2 : 9.6
  const lineHeight = twoLines ? 12.4 : 13.4
  const lines = wrap(CARD_MESSAGE, fonts.serif, size, 200)
  t += twoLines ? 15 : 17
  lines.forEach((line, i) => p.text(line, fonts.serif, size, t + i * lineHeight))
  t += (lines.length - 1) * lineHeight + 11
  p.divider(t)

  // QR con marco, línea con corazón y el texto al lado; un globo a cada lado
  const box = twoLines ? 84 : 94
  const textW = 88
  const blockW = box + 22 + textW
  const left = p.cx - blockW / 2
  const qrTop = t + (twoLines ? 10 : 12)
  page.drawRectangle({ x: left, y: p.y + p.h - qrTop - box, width: box, height: box, color: COLOR.blanco, borderColor: COLOR.naranja, borderWidth: 0.8 })
  page.drawImage(qr, { x: left + 4, y: p.y + p.h - qrTop - box + 4, width: box - 8, height: box - 8 })
  const lineX = left + box + 11
  page.drawLine({ start: { x: lineX, y: p.y + p.h - qrTop - 6 }, end: { x: lineX, y: p.y + p.h - qrTop - box + 6 }, thickness: 0.6, color: COLOR.naranja })
  p.heart(lineX, qrTop + box / 2 - 3, 6)
  const tx = lineX + 11
  const label = qrTop + box / 2 - 17
  p.spaced(CARD_QR_TITLE, fonts.serif, 7.6, label, 0.9, COLOR.fucsia, tx)
  CARD_QR_LINES.forEach((line, i) => p.textAt(line, fonts.serif, 8.4, tx, label + 13 + i * 10.6))
  if (o.globoRosa) p.image(o.globoRosa, left - 21, qrTop + 8, 14, 8)
  if (o.globoNaranja) p.image(o.globoNaranja, left + blockW + 6, qrTop + 12, 17, -8)
  t = qrTop + box + (twoLines ? 11 : 13)
  p.divider(t)

  const sofi = twoLines ? 32 : 36
  p.spaced(CARD_SIGNATURE, fonts.serif, 7.4, t + 18, 1.4)
  p.text('Sofi', fonts.script, sofi, t + 18 + sofi * 0.82, COLOR.fucsia)
  p.spaced(date.toUpperCase(), fonts.serif, 6.6, t + 18 + sofi * 0.82 + 23, 0.9)
}

function drawFrontCard(page: PDFPage, s: CardSlot, fonts: Fonts, o: Ornaments) {
  const p = pen(page, s)
  p.frame()
  drawTop(p, o)
  const twoLines = fitName(fonts.script, s.guest.name, { maxWidth: p.w - 76, maxSize: 50, minSize: 34 }).lines.length > 1
  const top = twoLines ? 128 : 148
  p.spaced('ESTE LUGAR ES PARA', fonts.serif, 8.4, top, 1.6)
  const nameEnd = drawName(p, s.guest.name, fonts, top + 10, 50)
  p.divider(nameEnd + 6)
  wrap('Gracias por acompañarnos a celebrar los 23 años de nuestro angelito.', fonts.serif, 10.4, 190).forEach((line, i) =>
    p.text(line, fonts.serif, 10.4, nameEnd + 26 + i * 14),
  )
  if (o.globoRosa) p.image(o.globoRosa, p.x + 30, p.h - 108, 20, 8)
  if (o.globoNaranja) p.image(o.globoNaranja, p.x + p.w - 58, p.h - 104, 27, -8)
  p.divider(p.h - 44, 40, 6)
  p.spaced('VOLTEA LA TARJETA Y ESCANEA TU QR', fonts.serif, 6.8, p.h - 26, 0.9)
}

async function embedFonts(doc: PDFDocument, art?: CardArt): Promise<Fonts> {
  if (art?.script && art.serif) {
    doc.registerFontkit(fontkit)
    return { script: await doc.embedFont(art.script, { subset: true }), serif: await doc.embedFont(art.serif, { subset: true }) }
  }
  return { script: await doc.embedFont(StandardFonts.TimesRomanBoldItalic), serif: await doc.embedFont(StandardFonts.TimesRoman) }
}

async function embedOrnaments(doc: PDFDocument, art?: CardArt): Promise<Ornaments> {
  const png = (bytes?: Uint8Array) => (bytes ? doc.embedPng(bytes) : undefined)
  return {
    banderines: await png(art?.banderines),
    corazon: await png(art?.corazon),
    estrella: await png(art?.estrella),
    globoRosa: await png(art?.globoRosa),
    globoNaranja: await png(art?.globoNaranja),
  }
}

export async function generateCardsPdf(opts: { guests: CardGuest[]; duplex?: boolean; date: string; art?: CardArt }): Promise<Uint8Array> {
  if (opts.guests.length === 0) throw new Error('No hay invitados para generar tarjetas')
  const doc = await PDFDocument.create()
  doc.setTitle('Tarjetas · 23 de Sofi')
  const fonts = await embedFonts(doc, opts.art)
  const ornaments = await embedOrnaments(doc, opts.art)
  const qrs = new Map<string, PDFImage>()
  for (const g of opts.guests) qrs.set(g.url, await doc.embedPng(await qrPng(g.url)))
  const sheets = new CardSheetBuilder().addGuests(opts.guests).doubleSided(!!opts.duplex).build()
  for (const sheet of sheets) {
    const page = doc.addPage([A4.w, A4.h])
    for (const slot of sheet.slots) {
      if (sheet.side === 'qr') drawQrCard(page, slot, qrs.get(slot.guest.url)!, fonts, opts.date, ornaments)
      else drawFrontCard(page, slot, fonts, ornaments)
    }
  }
  return doc.save()
}
