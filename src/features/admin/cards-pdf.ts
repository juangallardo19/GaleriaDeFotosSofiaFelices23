import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { CardSheetBuilder, type CardGuest, type CardSlot } from './card-sheet'
import { qrPng } from './qr-image'

const MM = 72 / 25.4
const A4 = { w: 210 * MM, h: 297 * MM }
const COLOR = {
  vino: rgb(0x5a / 255, 0x12 / 255, 0x38 / 255),
  fucsia: rgb(0xe6 / 255, 0x15 / 255, 0x7a / 255),
  oro: rgb(0xd4 / 255, 0xaf / 255, 0x37 / 255),
  crema: rgb(1, 0xf7 / 255, 0xf0 / 255),
}

export interface CardArt {
  banderines?: Uint8Array
  sofi?: Uint8Array
}

interface Fonts {
  title: PDFFont
  script: PDFFont
  body: PDFFont
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, y: number, color = COLOR.vino) {
  page.drawText(text, { x: cx - font.widthOfTextAtSize(text, size) / 2, y, size, font, color })
}

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

function frame(page: PDFPage, s: CardSlot) {
  const x = s.x * MM
  const y = A4.h - (s.y + s.h) * MM
  page.drawRectangle({ x, y, width: s.w * MM, height: s.h * MM, color: COLOR.crema })
  page.drawRectangle({ x: x + 10, y: y + 10, width: s.w * MM - 20, height: s.h * MM - 20, borderColor: COLOR.oro, borderWidth: 0.8, opacity: 0 })
  return { x, y, w: s.w * MM, h: s.h * MM, cx: x + (s.w * MM) / 2 }
}

function drawQrCard(page: PDFPage, s: CardSlot, qr: PDFImage, fonts: Fonts, date: string, art?: PDFImage) {
  const c = frame(page, s)
  let top = c.y + c.h - 22
  if (art) {
    const w = c.w * 0.6
    const h = (art.height / art.width) * w
    page.drawImage(art, { x: c.cx - w / 2, y: top - h, width: w, height: h })
    top -= h + 4
  }
  centered(page, 'CAPTURA TUS', fonts.title, 10, c.cx, top - 12)
  centered(page, 'Recuerdos', fonts.script, 26, c.cx, top - 40, COLOR.fucsia)
  centered(page, s.guest.name, fonts.title, 12, c.cx, top - 58)
  const message = 'Gracias por estar en este día tan especial. Baila, come rico, toma muchas fotos y no te vayas sin abrazar a Sofi.'
  wrap(message, fonts.body, 7.5, c.w - 50).forEach((line, i) => centered(page, line, fonts.body, 7.5, c.cx, top - 74 - i * 10))
  const size = 92
  const qrY = c.y + 78
  page.drawRectangle({ x: c.x + 24, y: qrY - 4, width: size + 8, height: size + 8, borderColor: COLOR.oro, borderWidth: 0.8, color: rgb(1, 1, 1) })
  page.drawImage(qr, { x: c.x + 28, y: qrY, width: size, height: size })
  const tx = c.x + 24 + size + 18
  page.drawText('ESCANEA EL QR', { x: tx, y: qrY + size - 14, size: 8, font: fonts.title, color: COLOR.vino })
  wrap('y sube tus fotos y videos de la fiesta al álbum de Sofi.', fonts.body, 7.5, c.x + c.w - tx - 22).forEach((line, i) =>
    page.drawText(line, { x: tx, y: qrY + size - 30 - i * 10, size: 7.5, font: fonts.body, color: COLOR.vino }),
  )
  centered(page, 'CON CARIÑO,', fonts.title, 7.5, c.cx, c.y + 56)
  centered(page, 'Sofi', fonts.script, 20, c.cx, c.y + 36, COLOR.fucsia)
  centered(page, date, fonts.body, 7.5, c.cx, c.y + 24)
}

function drawFrontCard(page: PDFPage, s: CardSlot, fonts: Fonts, art?: PDFImage) {
  const c = frame(page, s)
  if (art) {
    const w = c.w * 0.7
    const h = (art.height / art.width) * w
    page.drawImage(art, { x: c.cx - w / 2, y: c.y + c.h - 18 - h, width: w, height: h })
  }
  centered(page, 'ESTE LUGAR ES PARA', fonts.title, 10, c.cx, c.y + c.h * 0.62)
  centered(page, s.guest.name, fonts.script, 30, c.cx, c.y + c.h * 0.5, COLOR.fucsia)
  wrap('Gracias por acompañarnos a celebrar los 23 años de nuestro angelito.', fonts.body, 8.5, c.w - 60).forEach((line, i) =>
    centered(page, line, fonts.body, 8.5, c.cx, c.y + c.h * 0.4 - i * 12),
  )
  centered(page, 'Voltea la tarjeta y escanea tu QR', fonts.body, 7.5, c.cx, c.y + 24)
}

export async function generateCardsPdf(opts: { guests: CardGuest[]; duplex?: boolean; date: string; art?: CardArt }): Promise<Uint8Array> {
  if (opts.guests.length === 0) throw new Error('No hay invitados para generar tarjetas')
  const doc = await PDFDocument.create()
  doc.setTitle('Tarjetas · 23 de Sofi')
  const fonts: Fonts = {
    title: await doc.embedFont(StandardFonts.TimesRoman),
    script: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
    body: await doc.embedFont(StandardFonts.Helvetica),
  }
  const art = opts.art?.banderines ? await doc.embedPng(opts.art.banderines) : undefined
  const qrs = new Map<string, PDFImage>()
  for (const g of opts.guests) qrs.set(g.url, await doc.embedPng(await qrPng(g.url)))
  const sheets = new CardSheetBuilder().addGuests(opts.guests).doubleSided(!!opts.duplex).build()
  for (const sheet of sheets) {
    const page = doc.addPage([A4.w, A4.h])
    for (const slot of sheet.slots) {
      if (sheet.side === 'qr') drawQrCard(page, slot, qrs.get(slot.guest.url)!, fonts, opts.date, art)
      else drawFrontCard(page, slot, fonts, art)
    }
  }
  return doc.save()
}
