import { PDFDocument, type PDFPage } from 'pdf-lib'
import { CardPen, COLOR, MM, drawName, embedFonts, embedOrnaments, type CardArt, type Fonts, type Ornaments } from './card-pen'
import { CAPTAIN_SHOTS, CAPTAIN_TABLE, CARD_SIGNATURE } from './card-text'
import { captainTexts, type Captain } from './captains'

// Media hoja A4 por tarjeta: la hoja va acostada y se corta a la mitad; queda margen para la impresora
const PAGE = { w: 297 * MM, h: 210 * MM }
const CARD = { w: 140 * MM, h: 198 * MM }
const PER_PAGE = 2

// Silueta de flor centrada en (0, 0), como el recorte de las etiquetas para botella
function scallop(r: number, petals = 12) {
  const at = (a: number, k: number) => `${(Math.cos(a) * r * k).toFixed(2)},${(Math.sin(a) * r * k).toFixed(2)}`
  let d = `M${at(-Math.PI / 2, 1)}`
  for (let i = 1; i <= petals; i++) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2
    d += ` Q${at(a - Math.PI / petals, 1.24)} ${at(a, 1)}`
  }
  return `${d} Z`
}

const SPARKLE = 'M0,-10 C1,-3 3,-1 10,0 C3,1 1,3 0,10 C-1,3 -3,1 -10,0 C-3,-1 -1,-3 0,-10 Z'

function drawCaptainCard(page: PDFPage, x: number, y: number, captain: Captain, fonts: Fonts, o: Ornaments, date: string) {
  const p = new CardPen(page, x, y, CARD.w, CARD.h)
  p.frame()

  // Recorte para el cuello de la botella y la bola disco colgando de él
  const hole = { top: 54, r: 32 }
  p.path(scallop(hole.r), p.cx, hole.top, { borderColor: COLOR.fucsia, borderWidth: 0.9, borderDashArray: [3, 2.4] })
  p.spaced('RECORTA', fonts.serif, 6.4, hole.top + 2.2, 1.4, COLOR.fucsia)
  if (o.bolaDisco) p.image(o.bolaDisco, p.cx - 32, hole.top + hole.r * 1.12, 64)
  p.path(SPARKLE, p.x + 46, 120, { scale: 0.9, color: COLOR.naranja })
  p.path(SPARKLE, p.x + p.w - 48, 104, { scale: 1.1, color: COLOR.fucsia })

  const nameEnd = drawName(p, captain.name, fonts, 182, 58, 84)
  let t = nameEnd + 4
  p.divider(t, 84)

  const texts = captainTexts(captain.title)
  p.spaced(texts.intro, fonts.serif, 10, t + 23, 2.2)
  const heading = t + 23 + 46
  // En plural la palabra es más larga: se achica para no chocar con los globos
  const headingSize = Math.min(42, (p.w - 130) / (fonts.serif.widthOfTextAtSize(texts.heading, 1) + (3 * (texts.heading.length - 1)) / 42))
  p.spaced(texts.heading, fonts.serif, headingSize, heading, 3 * (headingSize / 42))
  p.spaced(CAPTAIN_TABLE, fonts.serif, 21, heading + 28, 6)
  if (o.globoRosa) p.image(o.globoRosa, p.x + 28, heading - 46, 22, 8)
  if (o.globoNaranja) p.image(o.globoNaranja, p.x + p.w - 56, heading - 42, 28, -8)
  t = heading + 42
  p.divider(t, 84)

  p.spaced(texts.task, fonts.serif, 9.6, t + 21, 1.7)
  // "¡Shots!" en cursiva con las copitas brindando al lado
  const size = 58
  const word = fonts.script.widthOfTextAtSize(CAPTAIN_SHOTS, size)
  const glasses = o.shots ? 58 : 0
  const left = p.cx - (word + (glasses ? glasses + 8 : 0)) / 2
  const baseline = t + 21 + 52
  p.textAt(CAPTAIN_SHOTS, fonts.script, size, left, baseline, COLOR.fucsia)
  if (o.shots) p.image(o.shots, left + word + 8, baseline - 50, glasses)
  p.text(texts.mission, fonts.serif, 11.4, baseline + 27)

  t = baseline + 40
  p.divider(t, 44, 6)
  p.spaced(CARD_SIGNATURE, fonts.serif, 7.4, t + 17, 1.4)
  p.text('Sofi', fonts.script, 28, t + 17 + 24, COLOR.fucsia)
  p.spaced(date.toUpperCase(), fonts.serif, 6.6, t + 17 + 24 + 19, 0.9)
}

export async function generateCaptainCardsPdf(opts: { captains: Captain[]; date: string; art?: CardArt }): Promise<Uint8Array> {
  if (opts.captains.length === 0) throw new Error('No hay capitanes para generar tarjetas')
  const doc = await PDFDocument.create()
  doc.setTitle('Capitanes de mesa · 23 de Sofi')
  const fonts = await embedFonts(doc, opts.art)
  const ornaments = await embedOrnaments(doc, opts.art)
  const marginX = (PAGE.w / 2 - CARD.w) / 2
  const marginY = (PAGE.h - CARD.h) / 2
  for (let i = 0; i < opts.captains.length; i += PER_PAGE) {
    const page = doc.addPage([PAGE.w, PAGE.h])
    // Guía para cortar la hoja a la mitad
    page.drawLine({
      start: { x: PAGE.w / 2, y: 2 * MM },
      end: { x: PAGE.w / 2, y: PAGE.h - 2 * MM },
      thickness: 0.5,
      color: COLOR.fucsia,
      opacity: 0.35,
      dashArray: [4, 4],
    })
    opts.captains.slice(i, i + PER_PAGE).forEach((captain, j) => {
      drawCaptainCard(page, j * (PAGE.w / 2) + marginX, marginY, captain, fonts, ornaments, opts.date)
    })
  }
  return doc.save()
}
