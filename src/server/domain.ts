import type { MediaLike } from '@/features/gallery/types'
import type { Sticker } from '@/features/comments/comments'

export interface Guest {
  id: string
  name: string
  token: string
  createdAt: Date
  lastSeenAt: Date | null
}

export interface Media extends MediaLike {
  driveFileId: string
  thumbUrl: string
  previewUrl: string | null
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
  sizeBytes: number
}

export interface Comment {
  id: string
  mediaId: string
  guestId: string
  body: string
  sticker: Sticker | null
  createdAt: Date
  editedAt: Date | null
}

export interface Author {
  id: string
  name: string
}

export interface MediaView extends Media {
  author: Author
  likedByViewer: boolean
}

export interface CommentView extends Comment {
  author: Author
}

export interface Viewer {
  id: string
  role: 'guest' | 'admin'
}

export const ADMIN_VIEWER_ID = 'admin'
