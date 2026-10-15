import { describe, expect, it } from 'vitest'
import { createMediaService, type RegisterInput } from '@/server/services/media-service'
import {
  MemoryCommentRepository,
  MemoryGuestRepository,
  MemoryLikeRepository,
  MemoryMediaRepository,
  MemorySettingsRepository,
} from '@/server/repositories/memory'
import { VISITOR, type Viewer } from '@/server/domain'
import { FakeMailer, FakeStorage, FakeThumbStore, clock, sequentialIds } from '../helpers/fakes'

async function setup() {
  const c = clock()
  const guests = new MemoryGuestRepository()
  const storage = new FakeStorage()
  const mailer = new FakeMailer()
  const thumbs = new FakeThumbStore()
  const service = createMediaService({
    media: new MemoryMediaRepository(),
    likes: new MemoryLikeRepository(),
    comments: new MemoryCommentRepository(),
    settings: new MemorySettingsRepository(),
    guests,
    storage,
    mailer,
    thumbs,
    alertEmail: 'sofiacumpleanosgaleriadefotos@gmail.com',
    now: c.now,
    newId: sequentialIds('m'),
  })
  const marta = await guests.create({ name: 'Tía Marta', token: 'T'.repeat(22) })
  const camilo = await guests.create({ name: 'Camilo', token: 'C'.repeat(22) })
  const asViewer = (id: string): Viewer => ({ id, role: 'guest' })
  const admin: Viewer = { id: 'admin', role: 'admin' }
  return { c, service, storage, mailer, thumbs, marta: asViewer(marta.id), camilo: asViewer(camilo.id), admin }
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

describe('Borrar libera el espacio', () => {
  it('al borrar un recuerdo también se borran su miniatura y su vista previa', async () => {
    const { service, storage, thumbs, marta } = await setup()
    const m = await service.register(marta, photo({ driveFileId: 'orig', thumbUrl: '/api/miniaturas/thumbs/a.webp', previewUrl: '/api/miniaturas/previews/a.webp' }))
    await service.remove(marta, m.id)
    expect(storage.removed).toEqual(['orig'])
    expect(thumbs.removed).toEqual(['/api/miniaturas/thumbs/a.webp', '/api/miniaturas/previews/a.webp'])
  })

  it('no intenta borrar los dibujos de reemplazo del sitio', async () => {
    const { service, thumbs, marta } = await setup()
    const m = await service.register(marta, photo({ thumbUrl: '/assets/placeholder-video.webp', previewUrl: null }))
    await service.remove(marta, m.id)
    expect(thumbs.removed).toEqual([])
  })

  it('si falla borrar la miniatura igual se borra el recuerdo', async () => {
    const { service, thumbs, marta } = await setup()
    thumbs.failRemove = true
    const m = await service.register(marta, photo({ thumbUrl: '/api/miniaturas/thumbs/b.webp' }))
    await service.remove(marta, m.id)
    expect((await service.list(marta, { sort: 'recientes' })).items).toEqual([])
  })
})

describe('RF-16 · resumen para descargar el álbum', () => {
  it('cuenta todo, solo fotos, lo mío y mis likes', async () => {
    const { service, marta, camilo } = await setup()
    const a = await service.register(marta, photo({ sizeBytes: 100 }))
    await service.register(marta, photo({ kind: 'video', sizeBytes: 900 }))
    const c = await service.register(camilo, photo({ sizeBytes: 50 }))
    await service.toggleLike(marta, c.id)
    await service.toggleLike(camilo, a.id)
    await service.toggleLike(camilo, c.id)
    expect(await service.summary(marta)).toEqual({ total: 3, totalBytes: 1050, photos: 2, photosBytes: 150, mine: 2, liked: 1 })
    expect(await service.summary(camilo)).toMatchObject({ mine: 1, liked: 2 })
    expect(await service.summary(VISITOR)).toMatchObject({ total: 3, mine: 0, liked: 0 })
  })
})

describe('RF-18 · visitantes que entran por el enlace normal (sin QR)', () => {
  it('ven la galería, abren un recuerdo y lo descargan', async () => {
    const { service, marta } = await setup()
    const m = await service.register(marta, photo({ driveFileId: 'orig' }))
    const page = await service.list(VISITOR, { sort: 'recientes' })
    expect(page.items.map((x) => x.id)).toEqual([m.id])
    expect(page.items[0]).toMatchObject({ likedByViewer: false, author: { name: 'Tía Marta' } })
    expect((await service.get(VISITOR, m.id)).id).toBe(m.id)
    expect(await service.registerDownload(m.id)).toBe('https://drive.fake/download/orig')
  })

  it('"mis recuerdos" y "mis likes" quedan vacíos', async () => {
    const { service, marta } = await setup()
    await service.register(marta, photo())
    expect((await service.list(VISITOR, { sort: 'recientes', filter: { mine: true } })).items).toEqual([])
    expect((await service.list(VISITOR, { sort: 'recientes', filter: { liked: true } })).items).toEqual([])
  })

  it('no ven lo que el admin ocultó', async () => {
    const { service, marta, admin } = await setup()
    const m = await service.register(marta, photo())
    await service.setHidden(admin, m.id, true)
    expect((await service.list(VISITOR, { sort: 'recientes', filter: { includeHidden: true } })).items).toEqual([])
    await expect(service.get(VISITOR, m.id)).rejects.toMatchObject({ code: 'no-encontrado' })
  })

  it('no pueden subir, dar like, comentar ni borrar', async () => {
    const { service, marta } = await setup()
    const m = await service.register(marta, photo())
    const cm = await service.addComment(marta, m.id, { text: 'Hola' })
    await expect(service.initUpload(VISITOR, { name: 'a.jpg', size: 10, type: 'image/jpeg' })).rejects.toMatchObject({ code: 'prohibido' })
    await expect(service.register(VISITOR, photo())).rejects.toMatchObject({ code: 'prohibido' })
    await expect(service.toggleLike(VISITOR, m.id)).rejects.toMatchObject({ code: 'prohibido' })
    await expect(service.addComment(VISITOR, m.id, { text: 'spam' })).rejects.toMatchObject({ code: 'prohibido' })
    await expect(service.editComment(VISITOR, cm.id, 'x')).rejects.toMatchObject({ code: 'prohibido' })
    await expect(service.deleteComment(VISITOR, cm.id)).rejects.toMatchObject({ code: 'prohibido' })
    await expect(service.remove(VISITOR, m.id)).rejects.toMatchObject({ code: 'prohibido' })
    expect((await service.list(marta, { sort: 'recientes' })).items[0]).toMatchObject({ likesCount: 0, commentsCount: 1 })
  })
})

describe('Gestionar recuerdos por lotes', () => {
  it('el invitado borra varios de sus recuerdos de una vez (Drive incluido)', async () => {
    const { service, storage, marta } = await setup()
    const a = await service.register(marta, photo({ driveFileId: 'da' }))
    const b = await service.register(marta, photo({ driveFileId: 'db' }))
    const c = await service.register(marta, photo({ driveFileId: 'dc' }))
    expect(await service.removeMany(marta, [a.id, b.id, a.id])).toEqual({ removed: 2 })
    expect(storage.removed.sort()).toEqual(['da', 'db'])
    expect((await service.list(marta, { sort: 'recientes' })).items.map((m) => m.id)).toEqual([c.id])
  })

  it('si en la selección hay un recuerdo ajeno no se borra nada', async () => {
    const { service, storage, marta, camilo } = await setup()
    const mio = await service.register(marta, photo())
    const ajeno = await service.register(camilo, photo())
    await expect(service.removeMany(marta, [mio.id, ajeno.id])).rejects.toMatchObject({ code: 'prohibido' })
    expect(storage.removed).toEqual([])
    expect((await service.list(marta, { sort: 'recientes' })).items).toHaveLength(2)
  })

  it('si alguno ya no existe no se borra nada', async () => {
    const { service, storage, marta } = await setup()
    const a = await service.register(marta, photo())
    await expect(service.removeMany(marta, [a.id, 'no-existe'])).rejects.toMatchObject({ code: 'no-encontrado' })
    expect(storage.removed).toEqual([])
  })

  it('el admin borra recuerdos de cualquiera', async () => {
    const { service, marta, camilo, admin } = await setup()
    const a = await service.register(marta, photo())
    const b = await service.register(camilo, photo())
    expect(await service.removeMany(admin, [a.id, b.id])).toEqual({ removed: 2 })
  })

  it('el visitante no puede borrar', async () => {
    const { service, marta } = await setup()
    const a = await service.register(marta, photo())
    await expect(service.removeMany(VISITOR, [a.id])).rejects.toMatchObject({ code: 'prohibido' })
  })

  it('pide al menos uno y como máximo 100 por vez', async () => {
    const { service, marta } = await setup()
    await expect(service.removeMany(marta, [])).rejects.toMatchObject({ code: 'invalido' })
    await expect(service.removeMany(marta, Array.from({ length: 101 }, (_, i) => `m${i}`))).rejects.toMatchObject({ code: 'invalido' })
  })

  it('el admin oculta y muestra varios a la vez; un invitado no puede', async () => {
    const { service, marta, camilo, admin } = await setup()
    const a = await service.register(marta, photo())
    const b = await service.register(camilo, photo())
    expect(await service.setHiddenMany(admin, [a.id, b.id], true)).toEqual({ updated: 2 })
    expect((await service.list(marta, { sort: 'recientes' })).items).toEqual([])
    await service.setHiddenMany(admin, [b.id], false)
    expect((await service.list(marta, { sort: 'recientes' })).items.map((m) => m.id)).toEqual([b.id])
    await expect(service.setHiddenMany(marta, [a.id], false)).rejects.toMatchObject({ code: 'prohibido' })
  })
})
