import type { GalleryFilter, GalleryViewer, MediaLike } from './types'

export function applyFilters<T extends MediaLike>(items: T[], filter: GalleryFilter, viewer: GalleryViewer): T[] {
  return items.filter(
    (m) =>
      (filter.includeHidden || !m.hidden) &&
      (!filter.kind || m.kind === filter.kind) &&
      (!filter.authorId || m.guestId === filter.authorId) &&
      (!filter.mine || m.guestId === viewer.id) &&
      (!filter.liked || viewer.likedIds.has(m.id)),
  )
}
