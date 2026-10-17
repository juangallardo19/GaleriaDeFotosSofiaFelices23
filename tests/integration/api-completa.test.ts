import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { POST as logoutAdmin } from '@/app/api/admin/logout/route'
import { POST as iniciarSubida } from '@/app/api/uploads/init/route'
import { POST as subirMiniatura } from '@/app/api/uploads/thumb/route'
import { POST as registrarMedio } from '@/app/api/media/route'
import { GET as medioNuevo } from '@/app/api/media/new/route'
import { DELETE as borrarMedio, GET as verMedio } from '@/app/api/media/[id]/route'
import { POST as darLike } from '@/app/api/media/[id]/like/route'
import { GET as listarComentarios, POST as comentar } from '@/app/api/media/[id]/comments/route'
import { DELETE as borrarComentario, PATCH as editarComentario } from '@/app/api/comments/[id]/route'
import { GET as descargar } from '@/app/api/media/[id]/download/route'
import { PATCH as moderar } from '@/app/api/admin/media/[id]/route'
import { GET as listarInvitados, POST as crearInvitado } from '@/app/api/admin/guests/route'
import { DELETE as borrarInvitado } from '@/app/api/admin/guests/[id]/route'
import { POST as importarInvitados } from '@/app/api/admin/guests/import/route'
import { GET as tarjetasPdf } from '@/app/api/admin/cards/route'
import { GET as listarCapitanes, PUT as guardarCapitanes } from '@/app/api/admin/capitanes/route'
import { GET as tarjetasCapitanes } from '@/app/api/admin/capitanes/tarjetas/route'
import { GET as estadisticas } from '@/app/api/admin/stats/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
type Init = { method?: string; body?: BodyInit; headers?: Record<string, string> }
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const cookieFrom = (res: Response, name: string) => {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))
  return raw ? raw.split(';')[0].slice(name.length + 1) : null
}

let app: ReturnType<typeof installTestContainer>
let guestCookie = ''
let otherCookie = ''
let adminCookie = ''

async function sessionFor(name: string) {
  const { guest } = await app.guests.create(name)
  const res = await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) })
  return { guest, cookie: `${GUEST_COOKIE}=${cookieFrom(res, GUEST_COOKIE)}` }
}

function req(path: string, init: Init = {}, cookie = guestCookie) {
  return new NextRequest(`${BASE}${path}`, { ...init, headers: { ...(cookie ? { cookie } : {}), ...init.headers } })
}
const json = (body: unknown, method = 'POST'): Init => ({ method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

async function registrar(cookie = guestCookie, extra: Record<string, unknown> = {}) {
  const res = await registrarMedio(
    req(
      '/api/media',
      json({
        driveFileId: `drive-${Math.random().toString(36).slice(2)}`,
        kind: 'photo',
        thumbUrl: 'https://x.public.blob.vercel-storage.com/t.webp',
        previewUrl: 'https://x.public.blob.vercel-storage.com/p.webp',
        width: 600,
        height: 800,
        dominantColor: '#aa3366',
        durationSec: null,
        sizeBytes: 3_000_000,
        ...extra,
      }),
      cookie,
    ),
  )
  return res
}

beforeEach(async () => {
  app = installTestContainer()
  guestCookie = (await sessionFor('Tía Marta')).cookie
  otherCookie = (await sessionFor('Camilo')).cookie
  const res = await loginAdmin(new NextRequest(`${BASE}/api/admin/login`, json({ password: TEST_ADMIN_PASSWORD })))
  adminCookie = `${ADMIN_COOKIE}=${cookieFrom(res, ADMIN_COOKIE)}`
})

describe('RF-06 · subir recuerdos', () => {
  it('inicia una subida reanudable en Drive pasando el origen del navegador', async () => {
    const res = await iniciarSubida(req('/api/uploads/init', { ...json({ name: 'IMG.HEIC', size: 4_000_000, type: 'image/heic' }), headers: { 'content-type': 'application/json', origin: BASE } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ uploadUrl: 'https://upload.fake/1', kind: 'photo' })
    expect(app.storage.sessions[0]).toMatchObject({ folder: 'fotos', origin: BASE })
  })

  it('valida tipo y tamaño (máximo 1 GB)', async () => {
    expect((await iniciarSubida(req('/api/uploads/init', json({ name: 'x.pdf', size: 10, type: 'application/pdf' })))).status).toBe(400)
    expect((await iniciarSubida(req('/api/uploads/init', json({ name: 'x.mp4', size: 1024 ** 3 + 1, type: 'video/mp4' })))).status).toBe(400)
    expect((await iniciarSubida(req('/api/uploads/init', json({ name: 'x.jpg' })))).status).toBe(400)
  })

  it('sin sesión no se puede subir', async () => {
    expect((await iniciarSubida(req('/api/uploads/init', json({ name: 'a.jpg', size: 1, type: 'image/jpeg' }), ''))).status).toBe(401)
  })

  it('RNF-03 · guarda la miniatura en el CDN', async () => {
    const res = await subirMiniatura(req('/api/uploads/thumb?variant=thumb', { method: 'POST', body: new Uint8Array(50_000), headers: { 'content-type': 'image/webp' } }))
    expect(res.status).toBe(200)
    const { url } = await res.json()
    expect(url).toMatch(/^\/api\/miniaturas\/thumbs\//)
    expect(app.thumbs.saved[0]).toMatchObject({ contentType: 'image/webp', size: 50_000, variant: 'thumb' })
  })

  it('rechaza miniaturas que no son imagen o son demasiado pesadas', async () => {
    expect((await subirMiniatura(req('/api/uploads/thumb?variant=thumb', { method: 'POST', body: 'hola', headers: { 'content-type': 'text/plain' } }))).status).toBe(400)
    expect((await subirMiniatura(req('/api/uploads/thumb?variant=thumb', { method: 'POST', body: new Uint8Array(3 * 1024 * 1024), headers: { 'content-type': 'image/webp' } }))).status).toBe(400)
    expect((await subirMiniatura(req('/api/uploads/thumb?variant=otra', { method: 'POST', body: new Uint8Array(10), headers: { 'content-type': 'image/webp' } }))).status).toBe(400)
  })

  it('registra el recuerdo subido', async () => {
    const res = await registrar()
    expect(res.status).toBe(201)
    const { media } = await res.json()
    expect(media).toMatchObject({ kind: 'photo', author: { name: 'Tía Marta' }, likesCount: 0, downloadPath: `/api/media/${media.id}/download` })
  })

  it('rechaza registros con datos inválidos', async () => {
    expect((await registrar(guestCookie, { thumbUrl: 'javascript:alert(1)' })).status).toBe(400)
    expect((await registrar(guestCookie, { width: 0 })).status).toBe(400)
    expect((await registrar(guestCookie, { kind: 'audio' })).status).toBe(400)
    expect((await registrar(guestCookie, { dominantColor: 'rojo' })).status).toBe(400)
  })

  it('los videos incluyen la URL para reproducirlos en la página', async () => {
    const { media } = await (await registrar(guestCookie, { kind: 'video', durationSec: 42 })).json()
    expect(media.streamUrl).toMatch(/^https:\/\/drive\.fake\/stream\//)
  })
})

describe('Galería: detalle y fotos nuevas', () => {
  it('devuelve el detalle de un recuerdo', async () => {
    const { media } = await (await registrar()).json()
    const res = await verMedio(req(`/api/media/${media.id}`), ctx(media.id))
    expect((await res.json()).media.id).toBe(media.id)
    expect((await verMedio(req('/api/media/no-existe'), ctx('no-existe'))).status).toBe(404)
  })

  it('entrega solo lo subido después de una fecha', async () => {
    const since = app.clock.now().toISOString()
    app.clock.advance(1000)
    const { media } = await (await registrar()).json()
    const res = await medioNuevo(req(`/api/media/new?since=${encodeURIComponent(since)}`))
    expect((await res.json()).items.map((m: { id: string }) => m.id)).toEqual([media.id])
    expect((await medioNuevo(req('/api/media/new?since=ayer'))).status).toBe(400)
  })
})

describe('RF-08 · likes', () => {
  it('alterna el like', async () => {
    const { media } = await (await registrar()).json()
    expect(await (await darLike(req(`/api/media/${media.id}/like`, { method: 'POST' }), ctx(media.id))).json()).toEqual({ liked: true, count: 1 })
    expect(await (await darLike(req(`/api/media/${media.id}/like`, { method: 'POST' }), ctx(media.id))).json()).toEqual({ liked: false, count: 0 })
    expect((await darLike(req('/api/media/x/like', { method: 'POST' }), ctx('x'))).status).toBe(404)
  })
})

describe('RF-09 · comentarios', () => {
  async function comentario(text: string, cookie = otherCookie) {
    const { media } = await (await registrar()).json()
    const res = await comentar(req(`/api/media/${media.id}/comments`, json({ text }), cookie), ctx(media.id))
    return { media, res, comment: (await res.json()).comment }
  }

  it('comenta con emojis y lista los comentarios', async () => {
    const { media, res } = await comentario('Qué linda 😍')
    expect(res.status).toBe(201)
    const list = await (await listarComentarios(req(`/api/media/${media.id}/comments`), ctx(media.id))).json()
    expect(list.items[0]).toMatchObject({ body: 'Qué linda 😍', author: { name: 'Camilo' } })
  })

  it('comenta con el sticker del gato', async () => {
    const { media } = await (await registrar()).json()
    const res = await comentar(req(`/api/media/${media.id}/comments`, json({ text: '', sticker: 'gato-aplaudiendo' })), ctx(media.id))
    expect((await res.json()).comment.sticker).toBe('gato-aplaudiendo')
  })

  it('rechaza comentarios vacíos', async () => {
    const { media } = await (await registrar()).json()
    expect((await comentar(req(`/api/media/${media.id}/comments`, json({ text: '  ' })), ctx(media.id))).status).toBe(400)
  })

  it('solo el autor edita; autor o admin borran; un tercero no', async () => {
    const { comment } = await comentario('original')
    expect((await editarComentario(req(`/api/comments/${comment.id}`, json({ text: 'hack' }, 'PATCH'), guestCookie), ctx(comment.id))).status).toBe(403)
    expect((await editarComentario(req(`/api/comments/${comment.id}`, json({ text: 'editado' }, 'PATCH'), otherCookie), ctx(comment.id))).status).toBe(204)
    expect((await borrarComentario(req(`/api/comments/${comment.id}`, { method: 'DELETE' }, guestCookie), ctx(comment.id))).status).toBe(403)
    expect((await borrarComentario(req(`/api/comments/${comment.id}`, { method: 'DELETE' }, adminCookie), ctx(comment.id))).status).toBe(204)
  })
})

describe('RF-07 · descargar el original', () => {
  it('cuenta la descarga y redirige al archivo en Drive', async () => {
    const { media } = await (await registrar(guestCookie, { driveFileId: 'orig-1' })).json()
    const res = await descargar(req(`/api/media/${media.id}/download`), ctx(media.id))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://drive.fake/download/orig-1')
    const detail = await (await verMedio(req(`/api/media/${media.id}`), ctx(media.id))).json()
    expect(detail.media.downloadsCount).toBe(1)
  })
})

describe('Borrar recuerdos', () => {
  it('cada quien borra lo suyo; el admin todo', async () => {
    const { media } = await (await registrar()).json()
    expect((await borrarMedio(req(`/api/media/${media.id}`, { method: 'DELETE' }, otherCookie), ctx(media.id))).status).toBe(403)
    expect((await borrarMedio(req(`/api/media/${media.id}`, { method: 'DELETE' }), ctx(media.id))).status).toBe(204)
    const other = (await (await registrar(otherCookie)).json()).media
    expect((await borrarMedio(req(`/api/media/${other.id}`, { method: 'DELETE' }, adminCookie), ctx(other.id))).status).toBe(204)
  })
})

describe('RF-15 · moderación del admin', () => {
  it('oculta y muestra; un invitado no puede', async () => {
    const { media } = await (await registrar()).json()
    expect((await moderar(req(`/api/admin/media/${media.id}`, json({ hidden: true }, 'PATCH')), ctx(media.id))).status).toBe(403)
    expect((await moderar(req(`/api/admin/media/${media.id}`, json({ hidden: true }, 'PATCH'), adminCookie), ctx(media.id))).status).toBe(204)
    expect((await verMedio(req(`/api/media/${media.id}`), ctx(media.id))).status).toBe(404)
    expect((await verMedio(req(`/api/media/${media.id}`, {}, adminCookie), ctx(media.id))).status).toBe(200)
  })
})

describe('RF-14 · admin de invitados', () => {
  it('sin sesión de admin no se accede', async () => {
    expect((await listarInvitados(req('/api/admin/guests', {}, ''))).status).toBe(401)
    expect((await listarInvitados(req('/api/admin/guests'))).status).toBe(403)
  })

  it('crea un invitado y devuelve su QR listo para mostrar', async () => {
    const res = await crearInvitado(req('/api/admin/guests', json({ name: 'Prima Valentina' }), adminCookie))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.guest.name).toBe('Prima Valentina')
    expect(body.url).toMatch(/^https:\/\/sofi23\.vercel\.app\/i\/[A-Za-z0-9_-]{22}$/)
    expect(body.qr).toMatch(/^data:image\/png;base64,/)
  })

  it('lista invitados con su URL y si están en línea', async () => {
    const res = await listarInvitados(req('/api/admin/guests', {}, adminCookie))
    const { items } = await res.json()
    expect(items.map((g: { name: string }) => g.name)).toEqual(['Camilo', 'Tía Marta'])
    expect(items[0]).toMatchObject({ online: true, url: expect.stringContaining('/i/') })
  })

  it('importa la lista desde CSV', async () => {
    const res = await importarInvitados(req('/api/admin/guests/import', { method: 'POST', body: 'nombre\nCamilo\nAbuela Rosa\nLaura', headers: { 'content-type': 'text/csv' } }, adminCookie))
    expect(await res.json()).toEqual({ created: 2, skipped: ['Camilo'] })
  })

  it('elimina un invitado y su QR deja de funcionar', async () => {
    const { guest } = await app.guests.create('Temporal')
    expect((await borrarInvitado(req(`/api/admin/guests/${guest.id}`, { method: 'DELETE' }, adminCookie), ctx(guest.id))).status).toBe(204)
    const res = await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) })
    expect(res.headers.get('location')).toContain('/qr-invalido')
  })

  it('genera el PDF de tarjetas (A4, 4 por hoja)', async () => {
    for (const n of ['A', 'B', 'C']) await app.guests.create(n)
    const res = await tarjetasPdf(req('/api/admin/cards', {}, adminCookie))
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('tarjetas-sofi-23.pdf')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  }, 20_000)

  it('con ?ver=1 el PDF de tarjetas se abre en el navegador en vez de descargarse', async () => {
    await app.guests.create('Para ver')
    const res = await tarjetasPdf(req('/api/admin/cards?ver=1', {}, adminCookie))
    expect(res.headers.get('content-disposition')).toMatch(/^inline;/)
  }, 20_000)

  it('muestra estadísticas: invitados, en línea, recuerdos y almacenamiento', async () => {
    await registrar()
    const res = await estadisticas(req('/api/admin/stats', {}, adminCookie))
    expect(await res.json()).toMatchObject({ guests: 2, online: 2, media: { count: 1, photos: 1, videos: 0 }, storage: { limitBytes: 15 * 1024 ** 3 } })
  })

  it('cerrar sesión borra la cookie del admin', async () => {
    const res = await logoutAdmin(req('/api/admin/logout', { method: 'POST' }, adminCookie))
    expect(res.status).toBe(204)
    expect(res.headers.getSetCookie().find((c) => c.startsWith(`${ADMIN_COOKIE}=`))).toMatch(/Max-Age=0/)
  })
})

describe('Capitanes de mesa (admin)', () => {
  it('solo el admin ve y cambia la lista', async () => {
    expect((await listarCapitanes(req('/api/admin/capitanes', {}, guestCookie))).status).toBe(403)
    expect((await guardarCapitanes(req('/api/admin/capitanes', json({ items: [] }, 'PUT'), guestCookie))).status).toBe(403)
  })

  it('guarda la lista y la devuelve igual', async () => {
    const res = await guardarCapitanes(req('/api/admin/capitanes', json({ items: [{ name: 'Juliana', title: 'capitana' }] }, 'PUT'), adminCookie))
    expect(res.status).toBe(200)
    const { items } = await res.json()
    expect(items).toEqual([{ id: expect.any(String), name: 'Juliana', title: 'capitana' }])
    expect((await (await listarCapitanes(req('/api/admin/capitanes', {}, adminCookie))).json()).items).toEqual(items)
  })

  it('acepta capitanes en plural para una misma mesa', async () => {
    const res = await guardarCapitanes(req('/api/admin/capitanes', json({ items: [{ name: 'Juliana y Andrés', title: 'capitanes' }] }, 'PUT'), adminCookie))
    expect(res.status).toBe(200)
  })

  it('rechaza un título que no sea capitán o capitana', async () => {
    const res = await guardarCapitanes(req('/api/admin/capitanes', json({ items: [{ name: 'Juliana', title: 'pirata' }] }, 'PUT'), adminCookie))
    expect(res.status).toBe(400)
  })

  it('genera el PDF de las tarjetas de capitanes y se puede abrir en el navegador', async () => {
    await guardarCapitanes(req('/api/admin/capitanes', json({ items: [{ name: 'Juliana', title: 'capitana' }, { name: 'Andrés', title: 'capitan' }] }, 'PUT'), adminCookie))
    const res = await tarjetasCapitanes(req('/api/admin/capitanes/tarjetas?ver=1', {}, adminCookie))
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toBe('inline; filename="capitanes-de-mesa.pdf"')
    expect(new TextDecoder().decode(new Uint8Array(await res.arrayBuffer()).slice(0, 5))).toBe('%PDF-')
  }, 20_000)

  it('sin capitanes avisa en vez de generar un PDF vacío', async () => {
    const res = await tarjetasCapitanes(req('/api/admin/capitanes/tarjetas', {}, adminCookie))
    expect(res.status).toBe(400)
    expect((await res.json()).message).toMatch(/Agrega al menos un capitán/)
  })
})
