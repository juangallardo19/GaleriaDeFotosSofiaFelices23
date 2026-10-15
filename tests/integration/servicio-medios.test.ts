import { describe, expect, it } from 'vitest'
import { createMediaService, type RegisterInput } from '@/server/services/media-service'
import {
  MemoryCommentRepository,
  MemoryGuestRepository,
  MemoryLikeRepository,
  MemoryMediaRepository,
  MemorySettingsRepository,
} from '@/server/repositories/memory'
import type { Viewer } from '@/server/domain'
import { FakeMailer, FakeStorage, clock, sequentialIds } from '../helpers/fakes'

async function setup() {
  const c = clock()
  const guests = new MemoryGuestRepository()
  const storage = new FakeStorage()
  const mailer = new FakeMailer()
  const service = createMediaService({
    media: new MemoryMediaRepository(),
    likes: new MemoryLikeRepository(),
    comments: new MemoryCommentRepository(),
    settings: new MemorySettingsRepository(),
    guests,
    storage,
    mailer,
    alertEmail: 'sofiacumpleanosgaleriadefotos@gmail.com',
    now: c.now,
    newId: sequentialIds('m'),
  })
  const marta = await guests.create({ name: 'Tía Marta', token: 'T'.repeat(22) })
  const camilo = await guests.create({ name: 'Camilo', token: 'C'.repeat(22) })
  const asViewer = (id: string): Viewer => ({ id, role: 'guest' })
  const admin: Viewer = { id: 'admin', role: 'admin' }
  return { c, service, storage, mailer, marta: asViewer(marta.id), camilo: asViewer(camilo.id), admin }
}

const photo = (p: Partial<RegisterInput> = {}): RegisterInput => ({
  driveFileId: `drive-${Math.random()}`,
  kind: 'photo',
  thumbUrl: 'https://blob.fake/t.webp',
  width: 600,
  height: 800,
  dominantColor: '#aa3366',
  durationSec: null,
  sizeBytes: 3_000_000,
  ...p,
})

describe('RF-06 · iniciar subida', () => {
  it('pide a Drive una sesión reanudable en la carpeta según el tipo', async () => {
    const { service, storage, marta } = await setup()
    const r = await service.initUpload(marta, { name: 'VID.MOV', size: 600 * 1024 ** 2, type: 'video/quicktime' })
    expect(r).toEqual({ uploadUrl: 'https://upload.fake/1', kind: 'video' })
    expect(storage.sessions[0].folder).toBe('videos')
  })

  it('rechaza archivos de más de 1 GB o de otro tipo', async () => {
    const { service, marta } = await setup()
    await expect(service.initUpload(marta, { name: 'x.mp4', size: 1024 ** 3 + 1, type: 'video/mp4' })).rejects.toMatchObject({ code: 'invalido' })
    await expect(service.initUpload(marta, { name: 'x.pdf', size: 10, type: 'application/pdf' })).rejects.toMatchObject({ code: 'invalido' })
  })
})

describe('RF-04/05 · registrar y listar', () => {
  it('registra la foto como pública en Drive y la muestra con su autor', async () => {
    const { service, storage, marta } = await setup()
    const media = await service.register(marta, photo({ driveFileId: 'f1' }))
    expect(storage.publicIds.has('f1')).toBe(true)
    const page = await service.list(marta, { sort: 'recientes' })
    expect(page.items[0]).toMatchObject({ id: media.id, author: { name: 'Tía Marta' }, likedByViewer: false, likesCount: 0 })
  })

  it('pagina y ordena', async () => {
    const { service, marta, c } = await setup()
    for (let i = 0; i < 30; i++) {
      await service.register(marta, photo())
      c.advance(1000)
    }
    const p1 = await service.list(marta, { sort: 'recientes', limit: 24 })
    const p2 = await service.list(marta, { sort: 'recientes', limit: 24, cursor: p1.nextCursor })
    expect(p1.items).toHaveLength(24)
    expect(p2.items).toHaveLength(6)
    expect(p2.nextCursor).toBeNull()
  })

  it('entrega solo lo más nuevo para las actualizaciones en vivo', async () => {
    const { service, marta, c } = await setup()
    await service.register(marta, photo())
    const since = c.now()
    c.advance(5000)
    const nueva = await service.register(marta, photo())
    expect((await service.newerThan(marta, since)).map((m) => m.id)).toEqual([nueva.id])
  })
})

describe('RF-08 · likes', () => {
  it('alterna el like de cada invitado y cuenta bien', async () => {
    const { service, marta, camilo } = await setup()
    const m = await service.register(marta, photo())
    expect(await service.toggleLike(marta, m.id)).toEqual({ liked: true, count: 1 })
    expect(await service.toggleLike(camilo, m.id)).toEqual({ liked: true, count: 2 })
    expect(await service.toggleLike(marta, m.id)).toEqual({ liked: false, count: 1 })
    const [item] = (await service.list(camilo, { sort: 'recientes' })).items
    expect(item.likedByViewer).toBe(true)
  })

  it('filtra mis likes', async () => {
    const { service, marta, camilo } = await setup()
    const a = await service.register(marta, photo())
    await service.register(marta, photo())
    await service.toggleLike(camilo, a.id)
    expect((await service.list(camilo, { sort: 'recientes', filter: { liked: true } })).items.map((x) => x.id)).toEqual([a.id])
  })
})

describe('RF-09 · comentarios', () => {
  it('agrega, edita y borra según los permisos', async () => {
    const { service, marta, camilo, admin } = await setup()
    const m = await service.register(marta, photo())
    const cm = await service.addComment(camilo, m.id, { text: 'Qué linda 😍' })
    expect((await service.listComments(m.id))[0]).toMatchObject({ body: 'Qué linda 😍', author: { name: 'Camilo' } })
    await expect(service.editComment(marta, cm.id, 'hackeado')).rejects.toMatchObject({ code: 'prohibido' })
    await service.editComment(camilo, cm.id, 'Qué linda foto')
    expect((await service.listComments(m.id))[0].body).toBe('Qué linda foto')
    await expect(service.deleteComment(marta, cm.id)).rejects.toMatchObject({ code: 'prohibido' })
    await service.deleteComment(admin, cm.id)
    expect(await service.listComments(m.id)).toEqual([])
  })

  it('el sticker del gato se guarda como comentario', async () => {
    const { service, marta } = await setup()
    const m = await service.register(marta, photo())
    await service.addComment(marta, m.id, { text: '', sticker: 'gato-aplaudiendo' })
    expect((await service.listComments(m.id))[0].sticker).toBe('gato-aplaudiendo')
    expect((await service.list(marta, { sort: 'recientes' })).items[0].commentsCount).toBe(1)
  })
})

describe('RF-07 · descargas', () => {
  it('cuenta la descarga y devuelve el enlace del original', async () => {
    const { service, marta } = await setup()
    const m = await service.register(marta, photo({ driveFileId: 'orig' }))
    expect(await service.registerDownload(m.id)).toBe('https://drive.fake/download/orig')
    expect((await service.list(marta, { sort: 'recientes' })).items[0].downloadsCount).toBe(1)
  })
})

describe('Borrar y moderar', () => {
  it('cada quien borra solo lo suyo; el admin puede borrar todo', async () => {
    const { service, storage, marta, camilo, admin } = await setup()
    const a = await service.register(marta, photo({ driveFileId: 'a' }))
    const b = await service.register(marta, photo({ driveFileId: 'b' }))
    await expect(service.remove(camilo, a.id)).rejects.toMatchObject({ code: 'prohibido' })
    await service.remove(marta, a.id)
    await service.remove(admin, b.id)
    expect(storage.removed).toEqual(['a', 'b'])
  })

  it('RF-15 · el admin oculta y muestra contenido', async () => {
    const { service, marta, admin } = await setup()
    const a = await service.register(marta, photo())
    await expect(service.setHidden(marta, a.id, true)).rejects.toMatchObject({ code: 'prohibido' })
    await service.setHidden(admin, a.id, true)
    expect((await service.list(marta, { sort: 'recientes' })).items).toEqual([])
    expect((await service.list(admin, { sort: 'recientes', filter: { includeHidden: true } })).items).toHaveLength(1)
  })
})

describe('Alerta de almacenamiento por correo', () => {
  it('envía un solo correo al cruzar el 80 % y otro al 95 %', async () => {
    const { service, storage, mailer, marta, c } = await setup()
    storage.usedBytes = 0.81 * storage.limitBytes
    await service.register(marta, photo())
    c.advance(11 * 60_000)
    await service.register(marta, photo())
    c.advance(11 * 60_000)
    storage.usedBytes = 0.96 * storage.limitBytes
    await service.register(marta, photo())
    expect(mailer.sent.map((m) => m.to)).toEqual(['sofiacumpleanosgaleriadefotos@gmail.com', 'sofiacumpleanosgaleriadefotos@gmail.com'])
    expect(mailer.sent[0].subject).toContain('81 %')
    expect(mailer.sent[1].subject).toContain('96 %')
  })

  it('un fallo al consultar la cuota no impide registrar la foto', async () => {
    const { service, storage, marta } = await setup()
    storage.quota = async () => {
      throw new Error('Drive caído')
    }
    await expect(service.register(marta, photo())).resolves.toBeTruthy()
  })
})
