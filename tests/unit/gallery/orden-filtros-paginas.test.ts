import { describe, expect, it } from 'vitest'
import { SORTS, decodeCursor, encodeCursor, type SortKey } from '@/features/gallery/sort'
import { paginate } from '@/features/gallery/paginate'
import { applyFilters } from '@/features/gallery/filters'
import type { MediaLike } from '@/features/gallery/types'

const m = (id: string, p: Partial<MediaLike> = {}): MediaLike => ({
  id,
  guestId: 'g1',
  kind: 'photo',
  createdAt: new Date('2026-10-16T20:00:00Z'),
  likesCount: 0,
  commentsCount: 0,
  downloadsCount: 0,
  hidden: false,
  ...p,
})
const at = (min: number) => new Date(Date.UTC(2026, 9, 16, 20, min))

const items: MediaLike[] = [
  m('a', { createdAt: at(1), likesCount: 5, commentsCount: 1, downloadsCount: 9 }),
  m('b', { createdAt: at(2), likesCount: 9, commentsCount: 3, downloadsCount: 1 }),
  m('c', { createdAt: at(3), likesCount: 5, commentsCount: 3, downloadsCount: 4 }),
  m('d', { createdAt: at(4), likesCount: 0, commentsCount: 0, downloadsCount: 0, kind: 'video', guestId: 'g2' }),
]
const ids = (list: MediaLike[]) => list.map((x) => x.id)
const sorted = (key: SortKey) => ids([...items].sort(SORTS[key].compare))

describe('RF-10 · estrategias de orden (Strategy)', () => {
  it('más recientes y más antiguos', () => {
    expect(sorted('recientes')).toEqual(['d', 'c', 'b', 'a'])
    expect(sorted('antiguos')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('más likes, comentarios y descargas desempatan por fecha', () => {
    expect(sorted('likes')).toEqual(['b', 'c', 'a', 'd'])
    expect(sorted('comentarios')).toEqual(['c', 'b', 'a', 'd'])
    expect(sorted('descargas')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('el cursor se codifica y decodifica sin perder datos', () => {
    const c = SORTS.likes.cursorOf(items[1])
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
    expect(decodeCursor('no-es-un-cursor')).toBeNull()
  })
})

describe('RNF-04 · paginación por cursor (scroll infinito)', () => {
  const many = Array.from({ length: 53 }, (_, i) => m(`m${String(i).padStart(2, '0')}`, { createdAt: at(i % 7), likesCount: i % 5 }))

  it.each<SortKey>(['recientes', 'antiguos', 'likes', 'comentarios', 'descargas'])('recorre todo sin duplicados ni huecos (%s)', (sort) => {
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const page: { items: MediaLike[]; nextCursor: string | null } = paginate(many, { sort, cursor, limit: 24 })
      seen.push(...ids(page.items))
      cursor = page.nextCursor
      pages++
    } while (cursor && pages < 10)
    expect(pages).toBe(3)
    expect(new Set(seen).size).toBe(53)
    expect(seen).toEqual(ids([...many].sort(SORTS[sort].compare)))
  })

  it('limita el tamaño de página entre 1 y 60', () => {
    expect(paginate(many, { sort: 'recientes', limit: 500 }).items).toHaveLength(53)
    expect(paginate(many, { sort: 'recientes', limit: 0 }).items).toHaveLength(1)
  })
})

describe('RF-11 · filtros', () => {
  const viewer = { id: 'g1', likedIds: new Set(['b']) }
  const withHidden = [...items, m('h', { hidden: true })]

  it('por tipo', () => {
    expect(ids(applyFilters(withHidden, { kind: 'video' }, viewer))).toEqual(['d'])
    expect(ids(applyFilters(withHidden, { kind: 'photo' }, viewer))).toEqual(['a', 'b', 'c'])
  })

  it('mis recuerdos y mis likes', () => {
    expect(ids(applyFilters(withHidden, { mine: true }, viewer))).toEqual(['a', 'b', 'c'])
    expect(ids(applyFilters(withHidden, { liked: true }, viewer))).toEqual(['b'])
  })

  it('por persona', () => {
    expect(ids(applyFilters(withHidden, { authorId: 'g2' }, viewer))).toEqual(['d'])
  })

  it('RF-15 · lo oculto por el admin no aparece salvo que se pida', () => {
    expect(ids(applyFilters(withHidden, {}, viewer))).not.toContain('h')
    expect(ids(applyFilters(withHidden, { includeHidden: true }, viewer))).toContain('h')
  })
})
