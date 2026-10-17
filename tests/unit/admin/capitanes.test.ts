import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { MAX_CAPTAINS, captainHeading, captainTexts, type Captain } from '@/features/admin/captains'
import { generateCaptainCardsPdf } from '@/features/admin/captain-cards-pdf'
import { MemorySettingsRepository } from '@/server/repositories/memory'
import { createCaptainService } from '@/server/services/captain-service'

const DATE = 'Viernes 16 de octubre de 2026'
const A4_ACOSTADA = { w: 841.89, h: 595.28 }

describe('Capitanes de mesa', () => {
  it('empieza sin capitanes y guarda la lista limpia, con un id para cada uno', async () => {
    let n = 0
    const service = createCaptainService({ settings: new MemorySettingsRepository(), newId: () => `c${++n}` })
    expect(await service.list()).toEqual([])
    const saved = await service.save([
      { name: '  Juliana   Pérez ', title: 'capitana' },
      { name: 'Andrés', title: 'capitan' },
    ])
    expect(saved).toEqual([
      { id: 'c1', name: 'Juliana Pérez', title: 'capitana' },
      { id: 'c2', name: 'Andrés', title: 'capitan' },
    ])
    expect(await service.list()).toEqual(saved)
  })

  it('al cambiar el nombre conserva el mismo capitán', async () => {
    const service = createCaptainService({ settings: new MemorySettingsRepository(), newId: () => 'nuevo' })
    const [c] = await service.save([{ name: 'Andres', title: 'capitan' }])
    expect(await service.save([{ id: c.id, name: 'Andrés', title: 'capitan' }])).toEqual([{ id: 'nuevo', name: 'Andrés', title: 'capitan' }])
  })

  it('no acepta nombres vacíos ni listas enormes', async () => {
    const service = createCaptainService({ settings: new MemorySettingsRepository() })
    await expect(service.save([{ name: '   ', title: 'capitan' }])).rejects.toThrow(/Nombre/)
    const muchos = Array.from({ length: MAX_CAPTAINS + 1 }, (_, i) => ({ name: `Capitán ${i}`, title: 'capitan' as const }))
    await expect(service.save(muchos)).rejects.toThrow(/capitanes/)
  })

  it('el título va según la persona: capitán o capitana', () => {
    expect(captainHeading('capitan')).toBe('CAPITÁN')
    expect(captainHeading('capitana')).toBe('CAPITANA')
  })

  it('en plural (dos o más en la misma mesa) toda la tarjeta habla en plural', () => {
    expect(captainTexts('capitanes')).toEqual({
      label: 'Capitanes de mesa',
      intro: 'LOS HEMOS ELEGIDO COMO',
      heading: 'CAPITANES',
      task: 'TOMEN ESTA BOTELLA Y REPARTAN',
      mission: 'y pongan a toda la mesa a bailar hasta el suelo.',
    })
    expect(captainTexts('capitanas')).toMatchObject({ intro: 'LAS HEMOS ELEGIDO COMO', heading: 'CAPITANAS', label: 'Capitanas de mesa' })
    expect(captainTexts('capitana')).toMatchObject({ intro: 'TE HEMOS ELEGIDO COMO', task: 'TOMA ESTA BOTELLA Y REPARTE', label: 'Capitana de mesa' })
  })
})

describe('Tarjetas de capitanes para colgar de la botella', () => {
  const asset = (name: string) => new Uint8Array(readFileSync(resolve('public/assets/tarjeta', name)))
  const art = () => ({
    script: asset('pinyon-script.ttf'),
    serif: asset('radley.ttf'),
    globoRosa: asset('globo-rosa.png'),
    globoNaranja: asset('globo-naranja.png'),
    bolaDisco: asset('bola-disco.png'),
    shots: asset('shots.png'),
  })
  const capitanes = (n: number): Captain[] => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name: `Capitán ${i + 1}`, title: 'capitan' }))

  async function fuentes(bytes: Uint8Array) {
    const pdf = await PDFDocument.load(bytes)
    return pdf.context
      .enumerateIndirectObjects()
      .map(([, obj]) => (obj instanceof PDFDict ? obj.lookup(PDFName.of('BaseFont')) : undefined))
      .filter((n): n is PDFName => n instanceof PDFName)
      .map((n) => n.decodeText())
  }

  it('media hoja cada una: 2 tarjetas por hoja A4 acostada', async () => {
    const pdf = await PDFDocument.load(await generateCaptainCardsPdf({ captains: capitanes(3), date: DATE }))
    expect(pdf.getPageCount()).toBe(2)
    const { width, height } = pdf.getPage(0).getSize()
    expect(width).toBeCloseTo(A4_ACOSTADA.w, 0)
    expect(height).toBeCloseTo(A4_ACOSTADA.h, 0)
  })

  it('también genera la tarjeta en plural, con los nombres juntos', async () => {
    const bytes = await generateCaptainCardsPdf({ captains: [{ id: 'a', name: 'Juliana y Andrés', title: 'capitanes' }], date: DATE, art: art() })
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })

  it('sin capitanes no genera nada', async () => {
    await expect(generateCaptainCardsPdf({ captains: [], date: DATE })).rejects.toThrow(/No hay capitanes/)
  })

  it('usa la cursiva y la letra con serifa del álbum, también con tildes y eñes', async () => {
    const bytes = await generateCaptainCardsPdf({ captains: [{ id: 'a', name: 'Tía Esperanza Muñoz', title: 'capitana' }], date: DATE, art: art() })
    const nombres = await fuentes(bytes)
    expect(nombres.some((n) => n.includes('PinyonScript'))).toBe(true)
    expect(nombres.some((n) => n.includes('Radley'))).toBe(true)
  })
})
