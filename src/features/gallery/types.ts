import type { MediaKind } from '@/features/media/media-kind'

export interface MediaLike {
  id: string
  guestId: string
  kind: MediaKind
  createdAt: Date
  likesCount: number
  commentsCount: number
  downloadsCount: number
  hidden: boolean
}

export interface GalleryViewer {
  id: string
  likedIds: Set<string>
}

export interface GalleryFilter {
  kind?: MediaKind
  authorId?: string
  mine?: boolean
  liked?: boolean
  includeHidden?: boolean
}
