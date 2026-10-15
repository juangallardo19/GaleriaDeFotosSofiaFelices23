import { beforeEach, describe, expect, it } from 'vitest'
import type { CommentRepository, GuestRepository, LikeRepository, MediaRepository, SettingsRepository } from '@/server/repositories/types'
import {
  MemoryCommentRepository,
  MemoryGuestRepository,
  MemoryLikeRepository,
  MemoryMediaRepository,
  MemorySettingsRepository,
} from '@/server/repositories/memory'
import type { Media } from '@/server/domain'

interface Repos {
  guests: GuestRepository
  media: MediaRepository
  likes: LikeRepository
  comments: CommentRepository
  settings: SettingsRepository
}

// Misma batería para cualquier implementación (memoria hoy, Postgres cuando TEST_DATABASE_URL esté definida)
const implementations: [string, () => Promise<Repos>][] = [
  [
    'memoria',
    async () => ({
      guests: new MemoryGuestRepository(),
      media: new MemoryMediaRepository(),
      likes: new MemoryLikeRepository(),
      comments: new MemoryCommentRepository(),
      settings: new MemorySettingsRepository(),
    }),
  ],
  [
    'postgres (PGlite)',
    async () => {
      const { createPgliteRepos } = await import('../helpers/pglite')
      return createPgliteRepos()
    },
  ],
]
if (process.env.TEST_DATABASE_URL) {
  implementations.push([
    'postgres',
    async () => {
      const { createPostgresRepos, resetDatabase } = await import('@/server/repositories/postgres')
      await resetDatabase(process.env.TEST_DATABASE_URL!)
      return createPostgresRepos(process.env.TEST_DATABASE_URL!)
    },
  ])
}

const at = (min: number) => new Date(Date.UTC(2026, 9, 16, 20, min))
const media = (id: string, guestId: string, p: Partial<Media> = {}): Media => ({
  id,
  guestId,
  kind: 'photo',
  driveFileId: `d-${id}`,
  thumbUrl: 'https://cdn/t.webp',
  previewUrl: null,
  width: 600,
  height: 800,
  dominantColor: '#aa3366',
  durationSec: null,
  sizeBytes: 1000,
  likesCount: 0,
  commentsCount: 0,
  downloadsCount: 0,
  hidden: false,
  createdAt: at(0),
  ...p,
})

// PGlite arranca un Postgres completo: con todas las suites en paralelo puede tardar más de 10 s
describe.each(implementations)('Contrato de repositorios (%s)', { timeout: 30_000 }, (_name, make) => {
  let r: Repos
  beforeEach(async () => {
    r = await make()
  })

  it('invitados: crear, buscar por token, tocar y borrar', async () => {
    const g = await r.guests.create({ name: 'Tía Marta', token: 'T'.repeat(22) })
    expect((await r.guests.findByToken('T'.repeat(22)))?.id).toBe(g.id)
    expect(await r.guests.findByToken('X'.repeat(22))).toBeNull()
    await r.guests.touch(g.id, at(5))
    expect((await r.guests.findById(g.id))?.lastSeenAt).toEqual(at(5))
    expect(await r.guests.lastSeenAll()).toEqual([at(5)])
    expect((await r.guests.findByIds([g.id, 'nadie'])).map((x) => x.name)).toEqual(['Tía Marta'])
    await r.guests.remove(g.id)
    expect(await r.guests.list()).toEqual([])
  })

  it('medios: paginar por orden y filtros', async () => {
    const g1 = await r.guests.create({ name: 'A', token: 'A'.repeat(22) })
    const g2 = await r.guests.create({ name: 'B', token: 'B'.repeat(22) })
    for (let i = 0; i < 30; i++) await r.media.insert(media(`m${String(i).padStart(2, '0')}`, i % 2 ? g1.id : g2.id, { createdAt: at(i), likesCount: i % 4, kind: i % 5 ? 'photo' : 'video' }))
    const viewer = { id: g1.id, likedIds: new Set(['m03']) }
    const p1 = await r.media.page({ sort: 'recientes', limit: 24, filter: {}, viewer })
    const p2 = await r.media.page({ sort: 'recientes', limit: 24, cursor: p1.nextCursor, filter: {}, viewer })
    expect(p1.items[0].id).toBe('m29')
    expect([...p1.items, ...p2.items]).toHaveLength(30)
    expect(p2.nextCursor).toBeNull()
    expect((await r.media.page({ sort: 'likes', limit: 3, filter: {}, viewer })).items.map((m) => m.likesCount)).toEqual([3, 3, 3])
    expect((await r.media.page({ sort: 'recientes', limit: 60, filter: { kind: 'video' }, viewer })).items).toHaveLength(6)
    expect((await r.media.page({ sort: 'recientes', limit: 60, filter: { mine: true }, viewer })).items).toHaveLength(15)
    expect((await r.media.page({ sort: 'recientes', limit: 60, filter: { liked: true }, viewer })).items.map((m) => m.id)).toEqual(['m03'])
  })

  it('medios: ocultar, contadores, nuevos, estadísticas y borrar', async () => {
    const g = await r.guests.create({ name: 'A', token: 'A'.repeat(22) })
    await r.media.insert(media('a', g.id, { createdAt: at(1), sizeBytes: 100 }))
    await r.media.insert(media('b', g.id, { createdAt: at(2), kind: 'video', sizeBytes: 200 }))
    await r.media.setHidden('a', true)
    const viewer = { id: g.id, likedIds: new Set<string>() }
    expect((await r.media.page({ sort: 'recientes', filter: {}, viewer })).items.map((m) => m.id)).toEqual(['b'])
    expect((await r.media.page({ sort: 'recientes', filter: { includeHidden: true }, viewer })).items).toHaveLength(2)
    expect(await r.media.increment('b', 'likesCount', 1)).toBe(1)
    expect(await r.media.increment('b', 'likesCount', -5)).toBe(0)
    expect((await r.media.newerThan(at(1), false)).map((m) => m.id)).toEqual(['b'])
    expect(await r.media.stats()).toEqual({ count: 2, photos: 1, videos: 1, bytes: 300, photoBytes: 100 })
    expect(await r.media.countByGuest()).toEqual({ [g.id]: 2 })
    await r.media.remove('a')
    expect(await r.media.findById('a')).toBeNull()
  })

  it('likes: alternar y listar los míos', async () => {
    expect(await r.likes.toggle('g1', 'm1')).toBe(true)
    expect(await r.likes.toggle('g1', 'm2')).toBe(true)
    expect(await r.likes.toggle('g1', 'm1')).toBe(false)
    expect([...(await r.likes.likedIds('g1'))]).toEqual(['m2'])
    await r.likes.removeForMedia('m2')
    expect((await r.likes.likedIds('g1')).size).toBe(0)
  })

  it('comentarios: orden, edición y borrado', async () => {
    await r.comments.insert({ id: 'c2', mediaId: 'm', guestId: 'g', body: 'segundo', sticker: null, createdAt: at(2), editedAt: null })
    await r.comments.insert({ id: 'c1', mediaId: 'm', guestId: 'g', body: 'primero 😍', sticker: 'gato-aplaudiendo', createdAt: at(1), editedAt: null })
    expect((await r.comments.listForMedia('m')).map((c) => c.body)).toEqual(['primero 😍', 'segundo'])
    await r.comments.update('c2', { body: 'editado', editedAt: at(3) })
    expect(await r.comments.findById('c2')).toMatchObject({ body: 'editado', editedAt: at(3) })
    await r.comments.remove('c1')
    await r.comments.removeForMedia('m')
    expect(await r.comments.listForMedia('m')).toEqual([])
  })

  it('ajustes: guardar y leer JSON', async () => {
    expect(await r.settings.get('quota')).toBeNull()
    await r.settings.set('quota', { lastRatio: 0.5, lastCheckedAt: '2026-10-16T20:00:00.000Z' })
    expect(await r.settings.get('quota')).toEqual({ lastRatio: 0.5, lastCheckedAt: '2026-10-16T20:00:00.000Z' })
  })
})
