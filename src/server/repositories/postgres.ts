import { and, asc, desc, eq, gt, inArray, sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn, PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { clampLimit } from '@/features/gallery/paginate'
import { SORTS, decodeCursor, encodeCursor, type SortKey } from '@/features/gallery/sort'
import type { Sticker } from '@/features/comments/comments'
import type { Comment, Guest, Media } from '../domain'
import { DDL, comments, guests, likes, media, schema, settings } from '../db/schema'
import type {
  CommentRepository,
  CounterField,
  GuestRepository,
  LikeRepository,
  MediaPageQuery,
  MediaRepository,
  SettingsRepository,
} from './types'
import type { Repos } from '../container'

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

const idC = sql`${media.id} collate "C"`
const tsParam = (ms: number) => sql`${new Date(ms).toISOString()}::timestamptz`

const COUNTER_COLUMN = { likesCount: media.likesCount, commentsCount: media.commentsCount, downloadsCount: media.downloadsCount } as const
const SORT_COLUMN: Record<Exclude<SortKey, 'recientes' | 'antiguos'>, AnyPgColumn> = {
  likes: media.likesCount,
  comentarios: media.commentsCount,
  descargas: media.downloadsCount,
}

// Keyset pagination: el cursor se compara como tupla en el mismo orden que la estrategia de orden
function orderAndCursor(sort: SortKey, cursorText: string | null | undefined): { order: SQL[]; after: SQL | null } {
  const c = decodeCursor(cursorText)
  if (sort === 'recientes') return { order: [desc(media.createdAt), desc(idC)], after: c ? sql`(${media.createdAt}, ${idC}) < (${tsParam(c.t)}, ${c.id} collate "C")` : null }
  if (sort === 'antiguos') return { order: [asc(media.createdAt), asc(idC)], after: c ? sql`(${media.createdAt}, ${idC}) > (${tsParam(c.t)}, ${c.id} collate "C")` : null }
  const col = SORT_COLUMN[sort]
  return {
    order: [desc(col), desc(media.createdAt), desc(idC)],
    after: c ? sql`(${col}, ${media.createdAt}, ${idC}) < (${c.v}, ${tsParam(c.t)}, ${c.id} collate "C")` : null,
  }
}

class PgGuestRepository implements GuestRepository {
  constructor(private db: Db) {}
  async create(input: { name: string; token: string }) {
    const [row] = await this.db.insert(guests).values({ id: crypto.randomUUID(), name: input.name, token: input.token }).returning()
    return row as Guest
  }
  async findByToken(token: string) {
    return ((await this.db.select().from(guests).where(eq(guests.token, token)).limit(1))[0] as Guest | undefined) ?? null
  }
  async findById(id: string) {
    return ((await this.db.select().from(guests).where(eq(guests.id, id)).limit(1))[0] as Guest | undefined) ?? null
  }
  async findByIds(ids: string[]) {
    if (ids.length === 0) return []
    return (await this.db.select().from(guests).where(inArray(guests.id, ids))) as Guest[]
  }
  async list() {
    return (await this.db.select().from(guests)) as Guest[]
  }
  async remove(id: string) {
    await this.db.delete(guests).where(eq(guests.id, id))
  }
  async touch(id: string, at: Date) {
    await this.db.update(guests).set({ lastSeenAt: at }).where(eq(guests.id, id))
  }
  async lastSeenAll() {
    return (await this.db.select({ at: guests.lastSeenAt }).from(guests)).map((r) => r.at)
  }
}

class PgMediaRepository implements MediaRepository {
  constructor(private db: Db) {}
  async insert(m: Media) {
    await this.db.insert(media).values(m)
  }
  async findById(id: string) {
    return ((await this.db.select().from(media).where(eq(media.id, id)).limit(1))[0] as Media | undefined) ?? null
  }
  async page(q: MediaPageQuery) {
    const limit = clampLimit(q.limit)
    const { order, after } = orderAndCursor(q.sort, q.cursor)
    const conds: SQL[] = []
    if (!q.filter.includeHidden) conds.push(eq(media.hidden, false))
    if (q.filter.kind) conds.push(eq(media.kind, q.filter.kind))
    if (q.filter.authorId) conds.push(eq(media.guestId, q.filter.authorId))
    if (q.filter.mine) conds.push(eq(media.guestId, q.viewer.id))
    if (q.filter.liked) conds.push(q.viewer.likedIds.size ? inArray(media.id, [...q.viewer.likedIds]) : sql`false`)
    if (after) conds.push(after)
    const rows = (await this.db
      .select()
      .from(media)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(...order)
      .limit(limit + 1)) as Media[]
    const items = rows.slice(0, limit)
    const nextCursor = rows.length > limit ? encodeCursor(SORTS[q.sort].cursorOf(items.at(-1)!)) : null
    return { items, nextCursor }
  }
  async newerThan(since: Date, includeHidden: boolean) {
    const conds = [gt(media.createdAt, since)]
    if (!includeHidden) conds.push(eq(media.hidden, false))
    return (await this.db.select().from(media).where(and(...conds)).orderBy(desc(media.createdAt)).limit(100)) as Media[]
  }
  async setHidden(id: string, hidden: boolean) {
    await this.db.update(media).set({ hidden }).where(eq(media.id, id))
  }
  async increment(id: string, field: CounterField, by: number) {
    const col = COUNTER_COLUMN[field]
    const rows = await this.db
      .update(media)
      .set({ [field]: sql`greatest(0, ${col} + ${by})` })
      .where(eq(media.id, id))
      .returning({ value: col })
    return rows[0]?.value ?? 0
  }
  async remove(id: string) {
    await this.db.delete(media).where(eq(media.id, id))
  }
  async stats() {
    const [r] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        photos: sql<number>`(count(*) filter (where ${media.kind} = 'photo'))::int`,
        videos: sql<number>`(count(*) filter (where ${media.kind} = 'video'))::int`,
        bytes: sql<number>`coalesce(sum(${media.sizeBytes}), 0)::float8`,
        photoBytes: sql<number>`coalesce(sum(${media.sizeBytes}) filter (where ${media.kind} = 'photo'), 0)::float8`,
      })
      .from(media)
    return { count: Number(r.count), photos: Number(r.photos), videos: Number(r.videos), bytes: Number(r.bytes), photoBytes: Number(r.photoBytes) }
  }
  async countByGuest() {
    const rows = await this.db.select({ guestId: media.guestId, n: sql<number>`count(*)::int` }).from(media).groupBy(media.guestId)
    return Object.fromEntries(rows.map((r) => [r.guestId, Number(r.n)]))
  }
}

class PgLikeRepository implements LikeRepository {
  constructor(private db: Db) {}
  async toggle(guestId: string, mediaId: string) {
    const removed = await this.db
      .delete(likes)
      .where(and(eq(likes.guestId, guestId), eq(likes.mediaId, mediaId)))
      .returning({ g: likes.guestId })
    if (removed.length) return false
    await this.db.insert(likes).values({ guestId, mediaId }).onConflictDoNothing()
    return true
  }
  async likedIds(guestId: string) {
    return new Set((await this.db.select({ id: likes.mediaId }).from(likes).where(eq(likes.guestId, guestId))).map((r) => r.id))
  }
  async removeForMedia(mediaId: string) {
    await this.db.delete(likes).where(eq(likes.mediaId, mediaId))
  }
}

const toComment = (r: typeof comments.$inferSelect): Comment => ({ ...r, sticker: r.sticker as Sticker | null })

class PgCommentRepository implements CommentRepository {
  constructor(private db: Db) {}
  async insert(c: Comment) {
    await this.db.insert(comments).values(c)
  }
  async findById(id: string) {
    const r = (await this.db.select().from(comments).where(eq(comments.id, id)).limit(1))[0]
    return r ? toComment(r) : null
  }
  async listForMedia(mediaId: string) {
    return (await this.db.select().from(comments).where(eq(comments.mediaId, mediaId)).orderBy(asc(comments.createdAt))).map(toComment)
  }
  async update(id: string, patch: { body: string; editedAt: Date }) {
    await this.db.update(comments).set(patch).where(eq(comments.id, id))
  }
  async remove(id: string) {
    await this.db.delete(comments).where(eq(comments.id, id))
  }
  async removeForMedia(mediaId: string) {
    await this.db.delete(comments).where(eq(comments.mediaId, mediaId))
  }
}

class PgSettingsRepository implements SettingsRepository {
  constructor(private db: Db) {}
  async get<T>(key: string) {
    const r = (await this.db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1))[0]
    return (r?.value as T | undefined) ?? null
  }
  async set<T>(key: string, value: T) {
    await this.db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  }
}

export function createRepos(db: Db): Repos {
  return {
    guests: new PgGuestRepository(db),
    media: new PgMediaRepository(db),
    likes: new PgLikeRepository(db),
    comments: new PgCommentRepository(db),
    settings: new PgSettingsRepository(db),
  }
}

async function neonDb(url: string): Promise<Db> {
  const { neon } = await import('@neondatabase/serverless')
  const { drizzle } = await import('drizzle-orm/neon-http')
  return drizzle({ client: neon(url), schema }) as unknown as Db
}

export async function createPostgresRepos(url: string): Promise<Repos> {
  return createRepos(await neonDb(url))
}

export async function setupDatabase(url: string) {
  const { neon } = await import('@neondatabase/serverless')
  const client = neon(url)
  for (const statement of DDL) await client.query(statement)
}

export async function resetDatabase(url: string) {
  const { neon } = await import('@neondatabase/serverless')
  const client = neon(url)
  await client.query('DROP TABLE IF EXISTS comments, likes, media, guests, settings')
  for (const statement of DDL) await client.query(statement)
}
