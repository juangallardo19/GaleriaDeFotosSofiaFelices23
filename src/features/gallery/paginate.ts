import { SORTS, decodeCursor, encodeCursor, type SortKey } from './sort'
import type { MediaLike } from './types'

export const PAGE_SIZE = 24
const MAX_PAGE = 60

export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return PAGE_SIZE
  return Math.min(MAX_PAGE, Math.max(1, Math.floor(limit)))
}

export function paginate<T extends MediaLike>(items: T[], opts: { sort: SortKey; cursor?: string | null; limit?: number }) {
  const strategy = SORTS[opts.sort]
  const limit = clampLimit(opts.limit)
  const cursor = decodeCursor(opts.cursor)
  const sorted = [...items].sort(strategy.compare)
  const start = cursor ? sorted.filter((m) => strategy.isAfter(m, cursor)) : sorted
  const page = start.slice(0, limit)
  const hasMore = start.length > limit
  return { items: page, nextCursor: hasMore ? encodeCursor(strategy.cursorOf(page.at(-1)!)) : null }
}
