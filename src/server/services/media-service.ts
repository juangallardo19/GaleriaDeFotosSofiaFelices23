import { canDeleteComment, canEditComment, validateComment, type CommentInput } from '@/features/comments/comments'
import type { SortKey } from '@/features/gallery/sort'
import type { GalleryFilter } from '@/features/gallery/types'
import { classifyFile, type MediaKind } from '@/features/media/media-kind'
import { buildQuotaEmail, crossedThreshold, shouldCheckQuota } from '@/features/storage/quota'
import type { Author, Comment, CommentView, Media, MediaView, Viewer } from '../domain'
import { AppError } from '../errors'
import type { Mailer } from '../mail/types'
import type { CommentRepository, GuestRepository, LikeRepository, MediaRepository, SettingsRepository } from '../repositories/types'
import type { ThumbStore } from '../storage/thumbs'
import type { StorageProvider } from '../storage/types'

export interface RegisterInput {
  driveFileId: string
  kind: MediaKind
  thumbUrl: string
  previewUrl?: string | null
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
  sizeBytes: number
}

export const MAX_BATCH = 100
const BATCH_CONCURRENCY = 4

export interface MediaServiceDeps {
  media: MediaRepository
  likes: LikeRepository
  comments: CommentRepository
  settings: SettingsRepository
  guests: GuestRepository
  storage: StorageProvider
  thumbs?: ThumbStore
  mailer: Mailer
  alertEmail: string
  now?: () => Date
  newId?: () => string
}

interface QuotaState {
  lastCheckedAt: string | null
  lastRatio: number
}

const QUOTA_KEY = 'quota'
const UNKNOWN_AUTHOR = 'Invitado'

export function createMediaService(deps: MediaServiceDeps) {
  const now = deps.now ?? (() => new Date())
  const newId = deps.newId ?? (() => crypto.randomUUID())

  async function authorsFor(guestIds: string[]): Promise<Map<string, Author>> {
    const unique = [...new Set(guestIds)].filter((id) => id !== 'admin')
    const found = await deps.guests.findByIds(unique)
    const map = new Map<string, Author>(found.map((g) => [g.id, { id: g.id, name: g.name }]))
    map.set('admin', { id: 'admin', name: 'Anfitriones' })
    return map
  }

  async function toViews(viewer: Viewer, items: Media[]): Promise<MediaView[]> {
    const [authors, liked] = await Promise.all([authorsFor(items.map((m) => m.guestId)), deps.likes.likedIds(viewer.id)])
    return items.map((m) => ({ ...m, author: authors.get(m.guestId) ?? { id: m.guestId, name: UNKNOWN_AUTHOR }, likedByViewer: liked.has(m.id) }))
  }

  async function findBatch(ids: string[]) {
    const unique = [...new Set(ids)]
    if (unique.length === 0 || unique.length > MAX_BATCH) throw new AppError('invalido', `Elige entre 1 y ${MAX_BATCH} recuerdos`)
    return Promise.all(unique.map(mustFind))
  }

  async function destroy(m: Media) {
    await deps.storage.remove(m.driveFileId)
    await Promise.all([deps.likes.removeForMedia(m.id), deps.comments.removeForMedia(m.id)])
    await deps.media.remove(m.id)
    // Liberar el espacio de las miniaturas no debe impedir el borrado
    const urls = [m.thumbUrl, m.previewUrl].filter((u): u is string => !!u && !u.startsWith('/assets/'))
    await Promise.all(urls.map((u) => deps.thumbs?.remove?.(u).catch((err) => console.error('No se pudo borrar la miniatura', err))))
  }

  async function mustFind(mediaId: string) {
    const m = await deps.media.findById(mediaId)
    if (!m) throw new AppError('no-encontrado', 'El recuerdo no existe')
    return m
  }

  async function mustFindComment(commentId: string) {
    const c = await deps.comments.findById(commentId)
    if (!c) throw new AppError('no-encontrado', 'El comentario no existe')
    return c
  }

  async function checkQuota() {
    const state = (await deps.settings.get<QuotaState>(QUOTA_KEY)) ?? { lastCheckedAt: null, lastRatio: 0 }
    const at = now()
    if (!shouldCheckQuota(state.lastCheckedAt ? new Date(state.lastCheckedAt) : null, at)) return
    const { usedBytes, limitBytes } = await deps.storage.quota()
    if (limitBytes <= 0) return
    const ratio = usedBytes / limitBytes
    const threshold = crossedThreshold(state.lastRatio, ratio)
    if (threshold !== null) await deps.mailer.send({ to: deps.alertEmail, ...buildQuotaEmail({ usedBytes, limitBytes, threshold }) })
    await deps.settings.set<QuotaState>(QUOTA_KEY, { lastCheckedAt: at.toISOString(), lastRatio: ratio })
  }

  function mustParticipate(viewer: Viewer) {
    if (viewer.role === 'visitor') throw new AppError('prohibido', 'Para participar hay que entrar con el QR de la tarjeta')
  }

  return {
    async initUpload(viewer: Viewer, file: { name: string; size: number; type: string }, origin?: string) {
      mustParticipate(viewer)
      const c = classifyFile(file)
      if (!c.ok) throw new AppError('invalido', c.reason)
      const mime = file.type || (c.kind === 'photo' ? 'image/heic' : 'video/quicktime')
      const { uploadUrl } = await deps.storage.createUploadSession({
        name: `${viewer.id}-${Date.now()}-${file.name}`,
        size: file.size,
        mime,
        folder: c.kind === 'photo' ? 'fotos' : 'videos',
        origin,
      })
      return { uploadUrl, kind: c.kind }
    },

    async register(viewer: Viewer, input: RegisterInput): Promise<Media> {
      mustParticipate(viewer)
      await deps.storage.makePublic(input.driveFileId)
      const media: Media = {
        id: newId(),
        guestId: viewer.id,
        kind: input.kind,
        driveFileId: input.driveFileId,
        thumbUrl: input.thumbUrl,
        previewUrl: input.previewUrl ?? null,
        width: input.width,
        height: input.height,
        dominantColor: input.dominantColor,
        durationSec: input.durationSec,
        sizeBytes: input.sizeBytes,
        likesCount: 0,
        commentsCount: 0,
        downloadsCount: 0,
        hidden: false,
        createdAt: now(),
      }
      await deps.media.insert(media)
      await checkQuota().catch((err) => console.error('No se pudo revisar la cuota de Drive', err))
      return media
    },

    async list(viewer: Viewer, opts: { sort: SortKey; filter?: GalleryFilter; cursor?: string | null; limit?: number }) {
      const filter: GalleryFilter = { ...opts.filter, includeHidden: viewer.role === 'admin' && !!opts.filter?.includeHidden }
      const likedIds = filter.liked ? await deps.likes.likedIds(viewer.id) : new Set<string>()
      const page = await deps.media.page({ sort: opts.sort, cursor: opts.cursor, limit: opts.limit, filter, viewer: { id: viewer.id, likedIds } })
      return { items: await toViews(viewer, page.items), nextCursor: page.nextCursor }
    },

    async newerThan(viewer: Viewer, since: Date) {
      return toViews(viewer, await deps.media.newerThan(since, false))
    },

    async get(viewer: Viewer, mediaId: string) {
      const m = await mustFind(mediaId)
      if (m.hidden && viewer.role !== 'admin') throw new AppError('no-encontrado')
      return (await toViews(viewer, [m]))[0]
    },

    async toggleLike(viewer: Viewer, mediaId: string) {
      mustParticipate(viewer)
      await mustFind(mediaId)
      const liked = await deps.likes.toggle(viewer.id, mediaId)
      const count = await deps.media.increment(mediaId, 'likesCount', liked ? 1 : -1)
      return { liked, count }
    },

    async addComment(viewer: Viewer, mediaId: string, input: CommentInput): Promise<Comment> {
      mustParticipate(viewer)
      const v = validateComment(input)
      if (!v.ok) throw new AppError('invalido', v.error)
      await mustFind(mediaId)
      const comment: Comment = { id: newId(), mediaId, guestId: viewer.id, body: v.value.text, sticker: v.value.sticker, createdAt: now(), editedAt: null }
      await deps.comments.insert(comment)
      await deps.media.increment(mediaId, 'commentsCount', 1)
      return comment
    },

    async editComment(viewer: Viewer, commentId: string, text: string) {
      mustParticipate(viewer)
      const c = await mustFindComment(commentId)
      if (!canEditComment(viewer, c)) throw new AppError('prohibido', 'Solo el autor puede editar su comentario')
      const v = validateComment({ text, sticker: c.sticker })
      if (!v.ok) throw new AppError('invalido', v.error)
      await deps.comments.update(commentId, { body: v.value.text, editedAt: now() })
    },

    async deleteComment(viewer: Viewer, commentId: string) {
      mustParticipate(viewer)
      const c = await mustFindComment(commentId)
      if (!canDeleteComment(viewer, c)) throw new AppError('prohibido', 'No puedes borrar este comentario')
      await deps.comments.remove(commentId)
      await deps.media.increment(c.mediaId, 'commentsCount', -1)
    },

    async listComments(mediaId: string): Promise<CommentView[]> {
      const list = await deps.comments.listForMedia(mediaId)
      const authors = await authorsFor(list.map((c) => c.guestId))
      return list.map((c) => ({ ...c, author: authors.get(c.guestId) ?? { id: c.guestId, name: UNKNOWN_AUTHOR } }))
    },

    async registerDownload(mediaId: string) {
      const m = await mustFind(mediaId)
      await deps.media.increment(mediaId, 'downloadsCount', 1)
      return deps.storage.downloadUrl(m.driveFileId)
    },

    streamUrl: (m: Media) => deps.storage.streamUrl(m.driveFileId),

    async setHidden(viewer: Viewer, mediaId: string, hidden: boolean) {
      if (viewer.role !== 'admin') throw new AppError('prohibido')
      await mustFind(mediaId)
      await deps.media.setHidden(mediaId, hidden)
    },

    async setHiddenMany(viewer: Viewer, ids: string[], hidden: boolean) {
      if (viewer.role !== 'admin') throw new AppError('prohibido')
      const items = await findBatch(ids)
      await Promise.all(items.map((m) => deps.media.setHidden(m.id, hidden)))
      return { updated: items.length }
    },

    async remove(viewer: Viewer, mediaId: string) {
      mustParticipate(viewer)
      const m = await mustFind(mediaId)
      if (viewer.role !== 'admin' && viewer.id !== m.guestId) throw new AppError('prohibido', 'Solo puedes borrar tus propios recuerdos')
      await destroy(m)
    },

    // Todo o nada en los permisos: si hay uno ajeno o inexistente no se toca ninguno
    async removeMany(viewer: Viewer, ids: string[]) {
      mustParticipate(viewer)
      const items = await findBatch(ids)
      if (viewer.role !== 'admin' && items.some((m) => m.guestId !== viewer.id)) throw new AppError('prohibido', 'Solo puedes borrar tus propios recuerdos')
      for (let i = 0; i < items.length; i += BATCH_CONCURRENCY) await Promise.all(items.slice(i, i + BATCH_CONCURRENCY).map(destroy))
      return { removed: items.length }
    },

    stats: () => deps.media.stats(),

    async summary(viewer: Viewer) {
      const [s, byGuest, liked] = await Promise.all([deps.media.stats(), deps.media.countByGuest(), deps.likes.likedIds(viewer.id)])
      return { total: s.count, totalBytes: s.bytes, photos: s.photos, photosBytes: s.photoBytes, mine: byGuest[viewer.id] ?? 0, liked: liked.size }
    },
    uploadsByGuest: () => deps.media.countByGuest(),
    quota: () => deps.storage.quota(),
  }
}

export type MediaService = ReturnType<typeof createMediaService>
