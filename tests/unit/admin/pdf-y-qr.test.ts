import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { qrDataUrl, qrPng } from '@/features/admin/qr-image'
import { generateCardsPdf } from '@/features/admin/cards-pdf'

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

describe('RF-14 · PDF de tarjetas para imprimir', () => {
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
