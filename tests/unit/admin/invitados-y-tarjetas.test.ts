import { describe, expect, it } from 'vitest'
import { parseGuestsCsv } from '@/features/admin/csv'
import { A4_MM, CARD_MM, CardSheetBuilder } from '@/features/admin/card-sheet'
import { guestUrl } from '@/features/admin/qr'

describe('RF-14 · importar la lista de invitados (CSV)', () => {
  it('lee una columna con o sin encabezado, con BOM, comas o punto y coma', () => {
    const csv = '﻿nombre;mesa\r\nTía Marta;4\r\n"Abuela Rosa";2\r\n\r\nCamilo,1\n'
    expect(parseGuestsCsv(csv)).toEqual(['Tía Marta', 'Abuela Rosa', 'Camilo'])
  })

  it('quita espacios y repetidos (sin importar tildes ni mayúsculas)', () => {
    expect(parseGuestsCsv('  Laura \nlaura\nLAURA\nAndrés\nandres')).toEqual(['Laura', 'Andrés'])
  })
})

describe('URL del QR', () => {
  it('apunta a /i/<token> sin barras dobles', () => {
    expect(guestUrl('https://sofi23.vercel.app/', 'abc')).toBe('https://sofi23.vercel.app/i/abc')
    expect(guestUrl('https://sofi23.vercel.app', 'abc')).toBe('https://sofi23.vercel.app/i/abc')
  })
})

describe('RF-14 · hoja A4 de tarjetas (Builder)', () => {
  const guests = Array.from({ length: 5 }, (_, i) => ({ name: `Invitado ${i + 1}`, url: `https://x/i/${i}` }))

  it('tarjetas de 10 × 14 cm, 4 por hoja A4', () => {
    expect(CARD_MM).toEqual({ w: 100, h: 140 })
    const sheets = new CardSheetBuilder().addGuests(guests).build()
    expect(sheets).toHaveLength(2)
    expect(sheets[0].slots).toHaveLength(4)
    expect(sheets[1].slots).toHaveLength(1)
    expect(sheets.every((s) => s.side === 'qr')).toBe(true)
  })

  it('todas las tarjetas caben en la hoja y no se pisan', () => {
    const [sheet] = new CardSheetBuilder().addGuests(guests).build()
    for (const s of sheet.slots) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.x + s.w).toBeLessThanOrEqual(A4_MM.w)
      expect(s.y + s.h).toBeLessThanOrEqual(A4_MM.h)
    }
    const [a, b, c] = sheet.slots
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.w)
    expect(c.y).toBeGreaterThanOrEqual(a.y + a.h)
  })

  it('a doble cara agrega el frente con las columnas espejadas para que coincida al imprimir', () => {
    const sheets = new CardSheetBuilder().addGuests(guests.slice(0, 2)).doubleSided().build()
    expect(sheets.map((s) => s.side)).toEqual(['qr', 'frente'])
    const [qr, front] = sheets
    expect(front.slots[0].guest.name).toBe(qr.slots[0].guest.name)
    expect(front.slots[0].x).toBe(qr.slots[1].x)
    expect(front.slots[1].x).toBe(qr.slots[0].x)
  })
})
