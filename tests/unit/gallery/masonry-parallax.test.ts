import { describe, expect, it } from 'vitest'
import { columnsForWidth, distribute } from '@/features/gallery/masonry'
import { COLUMN_FACTORS, HERO_LAYERS, TEXT_SPEED, cardOffset, layerOffset } from '@/features/gallery/parallax'

describe('RF-04 · masonry', () => {
  it.each([
    [390, 2],
    [768, 3],
    [1280, 4],
    [1440, 5],
  ])('%d px => %d columnas', (w, cols) => {
    expect(columnsForWidth(w)).toBe(cols)
  })

  it('cada card va a la columna más baja y el orden se lee de izquierda a derecha', () => {
    const items = [
      { id: '1', height: 300 },
      { id: '2', height: 100 },
      { id: '3', height: 100 },
      { id: '4', height: 100 },
      { id: '5', height: 100 },
    ]
    const cols = distribute(items, 2, 10)
    expect(cols.map((c) => c.map((x) => x.id))).toEqual([
      ['1', '5'],
      ['2', '3', '4'],
    ])
  })

  it('reparte las primeras cards una por columna', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i), height: 200 }))
    expect(distribute(items, 5).map((c) => c[0].id)).toEqual(['0', '1', '2', '3', '4'])
  })
})

describe('Parallax por capas', () => {
  const required = ['banderines', 'happy-birthday', 'corazon', 'estrella', 'globo-rosa', 'globo-naranja', 'globo-2', 'globo-3', 'sofi', 'pastel']

  it('cada asset de la portada vive en su propia capa', () => {
    const layerIds = HERO_LAYERS.map((l) => l.id)
    expect(new Set(layerIds).size).toBe(layerIds.length)
    for (const id of required) expect(layerIds).toContain(id)
  })

  it('las velocidades son suaves (0.2 a 1.3) y hay al menos 3 planos de profundidad', () => {
    for (const l of HERO_LAYERS) {
      expect(l.speed).toBeGreaterThanOrEqual(0.2)
      expect(l.speed).toBeLessThanOrEqual(1.3)
    }
    expect(new Set(HERO_LAYERS.map((l) => l.speed)).size).toBeGreaterThanOrEqual(3)
  })

  it('los textos se mueven a velocidad normal', () => {
    expect(TEXT_SPEED).toBe(1)
    expect(layerOffset(500, TEXT_SPEED)).toBe(0)
  })

  it('una capa lenta se queda atrás y una rápida se adelanta', () => {
    expect(layerOffset(100, 0.25)).toBe(75)
    expect(layerOffset(100, 1.2)).toBe(-20)
  })

  it('respeta "reducir movimiento"', () => {
    expect(layerOffset(300, 0.25, true)).toBe(0)
    expect(cardOffset({ centerY: 900, viewportH: 844, k: 0.15, reduced: true })).toBe(0)
  })

  it('el desfase de las cards está acotado y nunca invierte el orden (no se chocan)', () => {
    const k = 0.15
    let prev = -Infinity
    for (let y = -2000; y <= 4000; y += 50) {
      const off = cardOffset({ centerY: y, viewportH: 844, k })
      expect(Math.abs(off)).toBeLessThanOrEqual(56)
      expect(y + off).toBeGreaterThanOrEqual(prev)
      prev = y + off
    }
  })

  it('cada columna tiene su propio ritmo', () => {
    expect(COLUMN_FACTORS.mobile).toHaveLength(2)
    expect(COLUMN_FACTORS.desktop).toHaveLength(5)
    for (const k of [...COLUMN_FACTORS.mobile, ...COLUMN_FACTORS.desktop]) expect(k).toBeGreaterThan(0)
    expect(new Set(COLUMN_FACTORS.desktop).size).toBeGreaterThan(1)
  })
})
