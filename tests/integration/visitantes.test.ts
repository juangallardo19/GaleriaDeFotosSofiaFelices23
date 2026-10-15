import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { POST as iniciarSubida } from '@/app/api/uploads/init/route'
import { POST as subirMiniatura } from '@/app/api/uploads/thumb/route'
import { GET as listarMedios, POST as registrarMedio } from '@/app/api/media/route'
import { GET as medioNuevo } from '@/app/api/media/new/route'
import { DELETE as borrarMedio, GET as verMedio } from '@/app/api/media/[id]/route'
import { POST as darLike } from '@/app/api/media/[id]/like/route'
import { GET as listarComentarios, POST as comentar } from '@/app/api/media/[id]/comments/route'
import { DELETE as borrarComentario, PATCH as editarComentario } from '@/app/api/comments/[id]/route'
import { GET as descargar } from '@/app/api/media/[id]/download/route'
import { PATCH as moderar } from '@/app/api/admin/media/[id]/route'
import { GET as verMiniatura } from '@/app/api/miniaturas/[...ruta]/route'
import { POST as presencia } from '@/app/api/presence/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
type Init = { method?: string; body?: BodyInit; headers?: Record<string, string> }
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const cookieFrom = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))!.split(';')[0]
const json = (body: unknown, method = 'POST'): Init => ({ method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

let app: ReturnType<typeof installTestContainer>
let guestCookie = ''
let mediaId = ''
let commentId = ''
let thumbPath = ''

function req(path: string, init: Init = {}, cookie = '') {
  return new NextRequest(`${BASE}${path}`, { ...init, headers: { ...(cookie ? { cookie } : {}), ...init.headers } })
}

beforeEach(async () => {
  app = installTestContainer()
  const { guest } = await app.guests.create('Tía Marta')
  guestCookie = cookieFrom(await entrarConQr(req(`/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) }), GUEST_COOKIE)
  const thumb = await subirMiniatura(req('/api/uploads/thumb?variant=thumb', { method: 'POST', body: new Uint8Array(1000), headers: { 'content-type': 'image/webp' } }, guestCookie))
  const thumbUrl = (await thumb.json()).url as string
  thumbPath = thumbUrl.replace('/api/miniaturas/', '')
  const registro = await registrarMedio(
    req('/api/media', json({ driveFileId: 'orig', kind: 'photo', thumbUrl, previewUrl: null, width: 600, height: 800, dominantColor: '#aa3366', durationSec: null, sizeBytes: 1000 }), guestCookie),
  )
  mediaId = (await registro.json()).media.id
  const cm = await comentar(req(`/api/media/${mediaId}/comments`, json({ text: 'Qué linda' }), guestCookie), ctx(mediaId))
  commentId = (await cm.json()).comment.id
})

describe('RF-18 · quien entra por el enlace normal puede ver y descargar', () => {
  it('ve la galería sin likes propios', async () => {
    const res = await listarMedios(req('/api/media?sort=recientes'))
    expect(res.status).toBe(200)
    const { items } = await res.json()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: mediaId, likedByViewer: false, author: { name: 'Tía Marta' } })
  })

  it('abre un recuerdo, lee sus comentarios y ve su miniatura', async () => {
    expect((await verMedio(req(`/api/media/${mediaId}`), ctx(mediaId))).status).toBe(200)
    const comentarios = await (await listarComentarios(req(`/api/media/${mediaId}/comments`), ctx(mediaId))).json()
    expect(comentarios.items[0]).toMatchObject({ body: 'Qué linda' })
    const thumb = await verMiniatura(req(`/api/miniaturas/${thumbPath}`), { params: Promise.resolve({ ruta: thumbPath.split('/') }) })
    expect(thumb.status).toBe(200)
  })

  it('recibe los recuerdos nuevos en vivo', async () => {
    const res = await medioNuevo(req(`/api/media/new?since=${encodeURIComponent(new Date(0).toISOString())}`))
    expect(res.status).toBe(200)
    expect((await res.json()).items).toHaveLength(1)
  })

  it('descarga el original y cuenta la descarga', async () => {
    const res = await descargar(req(`/api/media/${mediaId}/download`), ctx(mediaId))
    expect(res.status).toBe(302)
    const { media } = await (await verMedio(req(`/api/media/${mediaId}`), ctx(mediaId))).json()
    expect(media.downloadsCount).toBe(1)
  })

  it('ve cuántas personas están en el álbum sin contarse como invitado', async () => {
    const res = await presencia(req('/api/presence', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect((await res.json()).online).toBe(1)
  })

  it('no ve lo que el admin ocultó', async () => {
    const login = await loginAdmin(req('/api/admin/login', json({ password: TEST_ADMIN_PASSWORD })))
    await moderar(req(`/api/admin/media/${mediaId}`, json({ hidden: true }, 'PATCH'), cookieFrom(login, ADMIN_COOKIE)), ctx(mediaId))
    expect((await (await listarMedios(req('/api/media?hidden=1'))).json()).items).toEqual([])
    expect((await verMedio(req(`/api/media/${mediaId}`), ctx(mediaId))).status).toBe(404)
    expect((await descargar(req(`/api/media/${mediaId}/download`), ctx(mediaId))).status).toBe(404)
  })
})

describe('RF-18 · sin el QR no se puede participar', () => {
  it.each([
    ['subir un archivo', () => iniciarSubida(req('/api/uploads/init', json({ name: 'a.jpg', size: 10, type: 'image/jpeg' })))],
    ['subir una miniatura', () => subirMiniatura(req('/api/uploads/thumb?variant=thumb', { method: 'POST', body: new Uint8Array(10), headers: { 'content-type': 'image/webp' } }))],
    ['registrar un recuerdo', () => registrarMedio(req('/api/media', json({ driveFileId: 'x', kind: 'photo', thumbUrl: 'https://x/t.webp', width: 1, height: 1, dominantColor: '#aa3366', durationSec: null, sizeBytes: 1 })))],
    ['dar like', () => darLike(req(`/api/media/${mediaId}/like`, { method: 'POST' }), ctx(mediaId))],
    ['comentar', () => comentar(req(`/api/media/${mediaId}/comments`, json({ text: 'spam' })), ctx(mediaId))],
    ['editar un comentario', () => editarComentario(req(`/api/comments/${commentId}`, json({ text: 'x' }, 'PATCH')), ctx(commentId))],
    ['borrar un comentario', () => borrarComentario(req(`/api/comments/${commentId}`, { method: 'DELETE' }), ctx(commentId))],
    ['borrar un recuerdo', () => borrarMedio(req(`/api/media/${mediaId}`, { method: 'DELETE' }), ctx(mediaId))],
  ])('no puede %s y se le explica que necesita su QR', async (_accion, llamar) => {
    const res = await llamar()
    expect(res.status).toBe(401)
    expect((await res.json()).message).toMatch(/QR/)
  })

  it('nada cambió después de los intentos', async () => {
    await darLike(req(`/api/media/${mediaId}/like`, { method: 'POST' }), ctx(mediaId))
    await comentar(req(`/api/media/${mediaId}/comments`, json({ text: 'spam' })), ctx(mediaId))
    const { media } = await (await verMedio(req(`/api/media/${mediaId}`), ctx(mediaId))).json()
    expect(media).toMatchObject({ likesCount: 0, commentsCount: 1 })
  })

  it('una cookie falsificada se trata como visitante', async () => {
    const falsa = `${GUEST_COOKIE}=falsa.firma`
    expect((await listarMedios(req('/api/media', {}, falsa))).status).toBe(200)
    expect((await darLike(req(`/api/media/${mediaId}/like`, { method: 'POST' }, falsa), ctx(mediaId))).status).toBe(401)
  })
})
