import { describe, expect, it } from 'vitest'
import { MAX_CARD_RATIO, appendPage, cardRatio, mediaQuery, patchItem, prependNew, removeItem } from '@/features/gallery/gallery-state'

const m = (id: string, extra: Record<string, unknown> = {}) => ({ id, likesCount: 0, ...extra })

describe('Estado de la galería en el navegador', () => {
  it('agrega la página siguiente sin repetir recuerdos', () => {
    expect(appendPage([m('a'), m('b')], [m('b'), m('c')]).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('pone arriba los recuerdos nuevos sin duplicar', () => {
    expect(prependNew([m('a'), m('b')], [m('c'), m('a')]).map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })

  it('actualiza un recuerdo (like optimista) sin tocar los demás', () => {
    const items = [m('a'), m('b')]
    const next = patchItem(items, 'b', { likesCount: 3 })
    expect(next[1].likesCount).toBe(3)
    expect(next[0]).toBe(items[0])
  })

  it('quita un recuerdo borrado', () => {
    expect(removeItem([m('a'), m('b')], 'a').map((x) => x.id)).toEqual(['b'])
  })
})

describe('Proporción de las cards del masonry', () => {
  it('usa la proporción real de la foto', () => {
    expect(cardRatio(600, 800)).toBeCloseTo(800 / 600)
    expect(cardRatio(1600, 900)).toBeCloseTo(900 / 1600)
  })

  it('las fotos muy altas se recortan para no hacer columnas eternas', () => {
    expect(MAX_CARD_RATIO).toBe(1.6)
    expect(cardRatio(400, 2000)).toBe(1.6)
  })

  it('si faltan medidas usa 4:5', () => {
    expect(cardRatio(0, 0)).toBe(1.25)
  })
})

describe('Consulta a la API de la galería', () => {
  it('arma la URL con orden, filtros y cursor', () => {
    expect(mediaQuery({ sort: 'likes', filter: { kind: 'video', liked: true }, cursor: 'abc' })).toBe('/api/media?sort=likes&limit=24&kind=video&liked=1&cursor=abc')
    expect(mediaQuery({ sort: 'recientes', filter: { mine: true } })).toBe('/api/media?sort=recientes&limit=24&mine=1')
    expect(mediaQuery({ sort: 'recientes', filter: { includeHidden: true } })).toBe('/api/media?sort=recientes&limit=24&hidden=1')
  })
})
