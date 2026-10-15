import type { CommentView, MediaView } from './domain'

export interface PublicMedia {
  id: string
  kind: MediaView['kind']
  thumbUrl: string
  previewUrl: string | null
  streamUrl: string | null
  downloadPath: string
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
  author: { id: string; name: string }
  likesCount: number
  commentsCount: number
  downloadsCount: number
  likedByViewer: boolean
  hidden: boolean
  createdAt: string
}

export function toPublicMedia(m: MediaView, streamUrl: (m: MediaView) => string): PublicMedia {
  return {
    id: m.id,
    kind: m.kind,
    thumbUrl: m.thumbUrl,
    previewUrl: m.previewUrl,
    streamUrl: m.kind === 'video' ? streamUrl(m) : null,
    downloadPath: `/api/media/${m.id}/download`,
    width: m.width,
    height: m.height,
    dominantColor: m.dominantColor,
    durationSec: m.durationSec,
    author: m.author,
    likesCount: m.likesCount,
    commentsCount: m.commentsCount,
    downloadsCount: m.downloadsCount,
    likedByViewer: m.likedByViewer,
    hidden: m.hidden,
    createdAt: m.createdAt.toISOString(),
  }
}

export function toPublicComment(c: CommentView) {
  return {
    id: c.id,
    mediaId: c.mediaId,
    guestId: c.guestId,
    body: c.body,
    sticker: c.sticker,
    author: c.author,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt?.toISOString() ?? null,
  }
}
