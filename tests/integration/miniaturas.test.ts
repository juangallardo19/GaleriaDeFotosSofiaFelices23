import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { POST as subirMiniatura } from '@/app/api/uploads/thumb/route'
import { POST as registrarMedio } from '@/app/api/media/route'
import { GET as verMiniatura } from '@/app/api/miniaturas/[...ruta]/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
const cookieFrom = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))!.split(';')[0]
const ruta = (path: string) => ({ params: Promise.resolve({ ruta: path.split('/') }) })

let app: ReturnType<typeof installTestContainer>
let guestCookie = ''

function pedir(path: string, cookie = guestCookie) {
  return verMiniatura(new NextRequest(`${BASE}/api/miniaturas/${path}`, { headers: cookie ? { cookie } : {} }), ruta(path))
}

async function subir(bytes = 50_000) {
  const res = await subirMiniatura(
    new NextRequest(`${BASE}/api/uploads/thumb?variant=thumb`, { method: 'POST', body: new Uint8Array(bytes), headers: { cookie: guestCookie, 'content-type': 'image/webp' } }),
  )
  return (await res.json()).url as string
}

beforeEach(async () => {
  app = installTestContainer()
  const { guest } = await app.guests.create('Tía Marta')
  guestCookie = cookieFrom(await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) }), GUEST_COOKIE)
})

describe('RNF-03 · miniaturas del almacén privado servidas por el sitio', () => {
  it('la subida devuelve una ruta del propio sitio', async () => {
    expect(await subir()).toMatch(/^\/api\/miniaturas\/thumbs\/[\w-]+\.webp$/)
  })

  it('un invitado ve la miniatura y el navegador y el CDN la guardan un año', async () => {
    const url = await subir(50_000)
    const res = await pedir(url.replace('/api/miniaturas/', ''))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect((await res.arrayBuffer()).byteLength).toBe(50_000)
  })

  it('el admin también la ve', async () => {
    const url = await subir()
    const login = await loginAdmin(
      new NextRequest(`${BASE}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }), headers: { 'content-type': 'application/json' } }),
    )
    expect((await pedir(url.replace('/api/miniaturas/', ''), cookieFrom(login, ADMIN_COOKIE))).status).toBe(200)
  })

  it('RF-18 · un visitante sin QR también la ve', async () => {
    const url = await subir()
    expect((await pedir(url.replace('/api/miniaturas/', ''), '')).status).toBe(200)
  })

  it('una miniatura que no existe da 404', async () => {
    expect((await pedir('thumbs/no-existe.webp')).status).toBe(404)
  })

  it('no deja leer rutas fuera de las miniaturas', async () => {
    expect((await pedir('../../secreto.webp')).status).toBe(400)
    expect((await pedir('otros/archivo.webp')).status).toBe(400)
  })

  it('se puede registrar un recuerdo con la miniatura privada', async () => {
    const url = await subir()
    const res = await registrarMedio(
      new NextRequest(`${BASE}/api/media`, {
        method: 'POST',
        headers: { cookie: guestCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ driveFileId: 'drive-1', kind: 'photo', thumbUrl: url, previewUrl: null, width: 600, height: 800, dominantColor: '#aa3366', durationSec: null, sizeBytes: 3_000_000 }),
      }),
    )
    expect(res.status).toBe(201)
  })

  it('no acepta otras rutas internas como miniatura', async () => {
    const res = await registrarMedio(
      new NextRequest(`${BASE}/api/media`, {
        method: 'POST',
        headers: { cookie: guestCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ driveFileId: 'drive-2', kind: 'photo', thumbUrl: '/api/admin/stats', width: 600, height: 800, dominantColor: '#aa3366', durationSec: null, sizeBytes: 1 }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
