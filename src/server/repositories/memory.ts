import { applyFilters } from '@/features/gallery/filters'
import { paginate } from '@/features/gallery/paginate'
import type { Comment, Guest, Media } from '../domain'
import type {
  CommentRepository,
  CounterField,
  GuestRepository,
  LikeRepository,
  MediaPageQuery,
  MediaRepository,
  SettingsRepository,
} from './types'

let counter = 0
const nextId = (prefix: string) => `${prefix}${++counter}-${Math.random().toString(36).slice(2, 8)}`

export class MemoryGuestRepository implements GuestRepository {
  private guests = new Map<string, Guest>()

  async create(input: { name: string; token: string }) {
    const guest: Guest = { id: nextId('g'), name: input.name, token: input.token, createdAt: new Date(), lastSeenAt: null }
    this.guests.set(guest.id, guest)
    return { ...guest }
  }
  async findByToken(token: string) {
    for (const g of this.guests.values()) if (g.token === token) return { ...g }
    return null
  }
  async findById(id: string) {
    const g = this.guests.get(id)
    return g ? { ...g } : null
  }
  async findByIds(ids: string[]) {
    return ids.map((id) => this.guests.get(id)).filter((g): g is Guest => !!g).map((g) => ({ ...g }))
  }
  async list() {
    return [...this.guests.values()].map((g) => ({ ...g }))
  }
  async remove(id: string) {
    this.guests.delete(id)
  }
  async touch(id: string, at: Date) {
    const g = this.guests.get(id)
    if (g) g.lastSeenAt = at
  }
  async lastSeenAll() {
    return [...this.guests.values()].map((g) => g.lastSeenAt)
  }
}

export class MemoryMediaRepository implements MediaRepository {
  private media = new Map<string, Media>()

  async insert(media: Media) {
    this.media.set(media.id, { ...media })
  }
  async findById(id: string) {
    const m = this.media.get(id)
    return m ? { ...m } : null
  }
  async page(q: MediaPageQuery) {
    const filtered = applyFilters([...this.media.values()], q.filter, q.viewer)
    const page = paginate(filtered, { sort: q.sort, cursor: q.cursor, limit: q.limit })
    return { items: page.items.map((m) => ({ ...m })), nextCursor: page.nextCursor }
  }
  async newerThan(since: Date, includeHidden: boolean) {
    return [...this.media.values()]
      .filter((m) => m.createdAt > since && (includeHidden || !m.hidden))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((m) => ({ ...m }))
  }
  async setHidden(id: string, hidden: boolean) {
    const m = this.media.get(id)
    if (m) m.hidden = hidden
  }
  async increment(id: string, field: CounterField, by: number) {
    const m = this.media.get(id)
    if (!m) return 0
    m[field] = Math.max(0, m[field] + by)
    return m[field]
  }
  async remove(id: string) {
    this.media.delete(id)
  }
  async countByGuest() {
    const counts: Record<string, number> = {}
    for (const m of this.media.values()) counts[m.guestId] = (counts[m.guestId] ?? 0) + 1
    return counts
  }
  async stats() {
    const all = [...this.media.values()]
    return {
      count: all.length,
      photos: all.filter((m) => m.kind === 'photo').length,
      videos: all.filter((m) => m.kind === 'video').length,
      bytes: all.reduce((s, m) => s + m.sizeBytes, 0),
    }
  }
}

export class MemoryLikeRepository implements LikeRepository {
  private likes = new Set<string>()
  private key = (g: string, m: string) => `${g}|${m}`

  async toggle(guestId: string, mediaId: string) {
    const k = this.key(guestId, mediaId)
    if (this.likes.has(k)) {
      this.likes.delete(k)
      return false
    }
    this.likes.add(k)
    return true
  }
  async likedIds(guestId: string) {
    const ids = new Set<string>()
    for (const k of this.likes) {
      const [g, m] = k.split('|')
      if (g === guestId) ids.add(m)
    }
    return ids
  }
  async removeForMedia(mediaId: string) {
    for (const k of [...this.likes]) if (k.endsWith(`|${mediaId}`)) this.likes.delete(k)
  }
}

export class MemoryCommentRepository implements CommentRepository {
  private comments = new Map<string, Comment>()

  async insert(comment: Comment) {
    this.comments.set(comment.id, { ...comment })
  }
  async findById(id: string) {
    const c = this.comments.get(id)
    return c ? { ...c } : null
  }
  async listForMedia(mediaId: string) {
    return [...this.comments.values()]
      .filter((c) => c.mediaId === mediaId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((c) => ({ ...c }))
  }
  async update(id: string, patch: { body: string; editedAt: Date }) {
    const c = this.comments.get(id)
    if (c) Object.assign(c, patch)
  }
  async remove(id: string) {
    this.comments.delete(id)
  }
  async removeForMedia(mediaId: string) {
    for (const [id, c] of this.comments) if (c.mediaId === mediaId) this.comments.delete(id)
  }
}

export class MemorySettingsRepository implements SettingsRepository {
  private values = new Map<string, unknown>()

  async get<T>(key: string) {
    return (this.values.has(key) ? structuredClone(this.values.get(key)) : null) as T | null
  }
  async set<T>(key: string, value: T) {
    this.values.set(key, structuredClone(value))
  }
}
