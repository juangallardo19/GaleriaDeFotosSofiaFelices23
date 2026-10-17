import { PDFDocument, type PDFImage, type PDFPage } from 'pdf-lib'
import { CardPen, COLOR, MM, drawName, embedFonts, embedOrnaments, fitName, wrap, type CardArt, type Fonts, type Ornaments } from './card-pen'
import { CardSheetBuilder, type CardGuest, type CardSlot } from './card-sheet'
import { CARD_MESSAGE, CARD_QR_LINES, CARD_QR_TITLE, CARD_SIGNATURE } from './card-text'
import { qrPng } from './qr-image'

export { fitName, type CardArt }

const A4 = { w: 210 * MM, h: 297 * MM }

function pen(page: PDFPage, s: CardSlot) {
  return new CardPen(page, s.x * MM, A4.h - (s.y + s.h) * MM, s.w * MM, s.h * MM)
}

function drawTop(p: CardPen, o: Ornaments) {
  if (o.banderines) p.image(o.banderines, p.cx - p.w * 0.37, 15, p.w * 0.74)
  if (o.corazon) p.image(o.corazon, p.x + 18, 50, 16, 14)
  if (o.estrella) p.image(o.estrella, p.x + p.w - 36, 47, 15, -12)
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
