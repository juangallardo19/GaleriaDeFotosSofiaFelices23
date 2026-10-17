import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import fontkit from '@pdf-lib/fontkit'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { qrDataUrl, qrPng } from '@/features/admin/qr-image'
import { fitName, generateCardsPdf } from '@/features/admin/cards-pdf'

const guests = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Invitado ${i + 1}`, url: `https://sofi23.vercel.app/i/${'A'.repeat(21)}${i % 10}` }))
const A4_PT = { w: 595.28, h: 841.89 }

describe('Imagen del QR', () => {
  it('genera un PNG listo para mostrar en el admin', async () => {
    const url = await qrDataUrl('https://sofi23.vercel.app/i/abc')
    expect(url).toMatch(/^data:image\/png;base64,/)
  })

  it('genera bytes PNG para el PDF', async () => {
    const png = await qrPng('https://sofi23.vercel.app/i/abc')
    expect(Array.from(png.slice(1, 4))).toEqual([0x50, 0x4e, 0x47])
  })
})

// Genera varios QR y el PDF: con todas las pruebas en paralelo pasa de los 5 s por defecto
describe('RF-14 · PDF de tarjetas para imprimir', { timeout: 20_000 }, () => {
  it('una sola cara: 4 tarjetas por hoja A4', async () => {
    const pdf = await PDFDocument.load(await generateCardsPdf({ guests: guests(9), date: 'Viernes 16 de octubre de 2026' }))
    expect(pdf.getPageCount()).toBe(3)
    const { width, height } = pdf.getPage(0).getSize()
    expect(width).toBeCloseTo(A4_PT.w, 0)
    expect(height).toBeCloseTo(A4_PT.h, 0)
  })

  it('a doble cara intercala la hoja del frente', async () => {
    const pdf = await PDFDocument.load(await generateCardsPdf({ guests: guests(5), duplex: true, date: 'Viernes 16 de octubre de 2026' }))
    expect(pdf.getPageCount()).toBe(4)
  })

  it('sin invitados no genera nada', async () => {
    await expect(generateCardsPdf({ guests: [], date: '' })).rejects.toThrow(/No hay invitados/)
  })

  it('soporta tildes y eñes en los nombres', async () => {
    const bytes = await generateCardsPdf({ guests: [{ name: 'Tía Marta Muñoz', url: 'https://x/i/1' }], date: 'Viernes 16 de octubre de 2026' })
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })
})

describe('Diseño de la tarjeta con el nombre en cursiva', () => {
  const asset = (name: string) => new Uint8Array(readFileSync(resolve('public/assets/tarjeta', name)))
  const art = () => ({
    script: asset('pinyon-script.ttf'),
    serif: asset('radley.ttf'),
    banderines: asset('banderines.png'),
    corazon: asset('corazon.png'),
    estrella: asset('estrella.png'),
    globoRosa: asset('globo-rosa.png'),
    globoNaranja: asset('globo-naranja.png'),
  })

  async function fuentes(bytes: Uint8Array) {
    const pdf = await PDFDocument.load(bytes)
    return pdf.context
      .enumerateIndirectObjects()
      .map(([, obj]) => (obj instanceof PDFDict ? obj.lookup(PDFName.of('BaseFont')) : undefined))
      .filter((n): n is PDFName => n instanceof PDFName)
      .map((n) => n.decodeText())
  }

  it('el nombre corto va grande en una sola línea', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const script = await doc.embedFont(art().script)
    const fit = fitName(script, 'Albita', { maxWidth: 220, maxSize: 46, minSize: 30 })
    expect(fit).toEqual({ size: 46, lines: ['Albita'] })
  })

  it('el nombre largo se achica y, si aun así no cabe, pasa a dos líneas sin salirse de la tarjeta', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const script = await doc.embedFont(art().script)
    const medio = fitName(script, 'Tía Esperanza', { maxWidth: 220, maxSize: 46, minSize: 30 })
    expect(medio.lines).toHaveLength(1)
    expect(script.widthOfTextAtSize(medio.lines[0], medio.size)).toBeLessThanOrEqual(220)
    const largo = fitName(script, 'Carlos amigo de Albita Fernández', { maxWidth: 220, maxSize: 46, minSize: 30 })
    expect(largo.lines).toHaveLength(2)
    for (const line of largo.lines) expect(script.widthOfTextAtSize(line, largo.size)).toBeLessThanOrEqual(220)
  })

  it('con las fuentes del álbum, el PDF lleva la cursiva (Pinyon Script) y la letra con serifa (Radley)', async () => {
    const bytes = await generateCardsPdf({ guests: [{ name: 'Tía Marta Muñoz', url: 'https://x/i/1' }], date: 'Viernes 16 de octubre de 2026', art: art() })
    const nombres = await fuentes(bytes)
    expect(nombres.some((n) => n.includes('PinyonScript'))).toBe(true)
    expect(nombres.some((n) => n.includes('Radley'))).toBe(true)
  })

  it('a doble cara el frente también usa las fuentes del álbum', async () => {
    const bytes = await generateCardsPdf({ guests: guests(2), duplex: true, date: 'Viernes 16 de octubre de 2026', art: art() })
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
    expect((await fuentes(bytes)).some((n) => n.includes('PinyonScript'))).toBe(true)
  })
})
