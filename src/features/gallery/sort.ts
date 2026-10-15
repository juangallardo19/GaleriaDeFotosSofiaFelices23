import type { MediaLike } from './types'

export type SortKey = 'recientes' | 'antiguos' | 'likes' | 'comentarios' | 'descargas'
export const SORT_KEYS: SortKey[] = ['recientes', 'antiguos', 'likes', 'comentarios', 'descargas']

export interface Cursor {
  v: number
  t: number
  id: string
}

export interface SortStrategy {
  key: SortKey
  compare: (a: MediaLike, b: MediaLike) => number
  cursorOf: (m: MediaLike) => Cursor
  isAfter: (m: MediaLike, cursor: Cursor) => boolean
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Orden descendente por un valor, desempatando por fecha y luego por id (determinístico)
function descending(key: SortKey, value: (m: MediaLike) => number): SortStrategy {
  const tuple = (m: MediaLike): Cursor => ({ v: value(m), t: m.createdAt.getTime(), id: m.id })
  const cmp = (a: Cursor, b: Cursor) => b.v - a.v || b.t - a.t || byId(b.id, a.id)
  return {
    key,
    compare: (a, b) => cmp(tuple(a), tuple(b)),
    cursorOf: tuple,
    isAfter: (m, c) => cmp(tuple(m), c) > 0,
  }
}

const oldestFirst: SortStrategy = (() => {
  const tuple = (m: MediaLike): Cursor => ({ v: 0, t: m.createdAt.getTime(), id: m.id })
  const cmp = (a: Cursor, b: Cursor) => a.t - b.t || byId(a.id, b.id)
  return { key: 'antiguos', compare: (a, b) => cmp(tuple(a), tuple(b)), cursorOf: tuple, isAfter: (m, c) => cmp(tuple(m), c) > 0 }
})()

export const SORTS: Record<SortKey, SortStrategy> = {
  recientes: descending('recientes', () => 0),
  antiguos: oldestFirst,
  likes: descending('likes', (m) => m.likesCount),
  comentarios: descending('comentarios', (m) => m.commentsCount),
  descargas: descending('descargas', (m) => m.downloadsCount),
}

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as string[]).includes(value)
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url')
}

export function decodeCursor(text: string | null | undefined): Cursor | null {
  if (!text) return null
  try {
    const c = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'))
    if (typeof c?.v === 'number' && typeof c?.t === 'number' && typeof c?.id === 'string') return { v: c.v, t: c.t, id: c.id }
    return null
  } catch {
    return null
  }
}
