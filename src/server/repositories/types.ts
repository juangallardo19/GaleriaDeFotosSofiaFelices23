import type { SortKey } from '@/features/gallery/sort'
import type { GalleryFilter, GalleryViewer } from '@/features/gallery/types'
import type { Comment, Guest, Media } from '../domain'

export interface GuestRepository {
  create(input: { name: string; token: string }): Promise<Guest>
  findByToken(token: string): Promise<Guest | null>
  findById(id: string): Promise<Guest | null>
  findByIds(ids: string[]): Promise<Guest[]>
  list(): Promise<Guest[]>
  remove(id: string): Promise<void>
  rename(id: string, name: string): Promise<void>
  touch(id: string, at: Date): Promise<void>
  lastSeenAll(): Promise<(Date | null)[]>
}

export type CounterField = 'likesCount' | 'commentsCount' | 'downloadsCount'

export interface MediaPageQuery {
  sort: SortKey
  cursor?: string | null
  limit?: number
  filter: GalleryFilter
  viewer: GalleryViewer
}

export interface MediaRepository {
  insert(media: Media): Promise<void>
  findById(id: string): Promise<Media | null>
  page(query: MediaPageQuery): Promise<{ items: Media[]; nextCursor: string | null }>
  newerThan(since: Date, includeHidden: boolean): Promise<Media[]>
  setHidden(id: string, hidden: boolean): Promise<void>
  updateVisuals(id: string, visuals: Pick<Media, 'thumbUrl' | 'width' | 'height' | 'durationSec'>): Promise<void>
  increment(id: string, field: CounterField, by: number): Promise<number>
  remove(id: string): Promise<void>
  stats(): Promise<{ count: number; photos: number; videos: number; bytes: number; photoBytes: number }>
  countByGuest(): Promise<Record<string, number>>
}

export interface LikeRepository {
  toggle(guestId: string, mediaId: string): Promise<boolean>
  likedIds(guestId: string): Promise<Set<string>>
  removeForMedia(mediaId: string): Promise<void>
}

export interface CommentRepository {
  insert(comment: Comment): Promise<void>
  findById(id: string): Promise<Comment | null>
  listForMedia(mediaId: string): Promise<Comment[]>
  update(id: string, patch: { body: string; editedAt: Date }): Promise<void>
  remove(id: string): Promise<void>
  removeForMedia(mediaId: string): Promise<void>
}

export interface SettingsRepository {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
}
