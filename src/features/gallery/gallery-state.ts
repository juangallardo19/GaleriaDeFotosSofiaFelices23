import type { SortKey } from './sort'
import type { GalleryFilter } from './types'
import { PAGE_SIZE } from './paginate'

interface Identified {
  id: string
}

export function appendPage<T extends Identified>(items: T[], page: T[]): T[] {
  const seen = new Set(items.map((i) => i.id))
  return [...items, ...page.filter((i) => !seen.has(i.id))]
}

export function prependNew<T extends Identified>(items: T[], fresh: T[]): T[] {
  const ids = new Set(fresh.map((i) => i.id))
  return [...fresh, ...items.filter((i) => !ids.has(i.id))]
}

export function patchItem<T extends Identified>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((i) => (i.id === id ? { ...i, ...patch } : i))
}

export function removeItem<T extends Identified>(items: T[], id: string): T[] {
  return items.filter((i) => i.id !== id)
}

export const MAX_CARD_RATIO = 1.6

export function cardRatio(width: number, height: number): number {
  if (!width || !height) return 1.25
  return Math.min(height / width, MAX_CARD_RATIO)
}

export function mediaQuery(opts: { sort: SortKey; filter: GalleryFilter; cursor?: string | null; limit?: number }): string {
  const q = new URLSearchParams({ sort: opts.sort, limit: String(opts.limit ?? PAGE_SIZE) })
  if (opts.filter.kind) q.set('kind', opts.filter.kind)
  if (opts.filter.mine) q.set('mine', '1')
  if (opts.filter.liked) q.set('liked', '1')
  if (opts.filter.includeHidden) q.set('hidden', '1')
  if (opts.cursor) q.set('cursor', opts.cursor)
  return `/api/media?${q}`
}
