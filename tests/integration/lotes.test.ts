import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { POST as registrarMedio } from '@/app/api/media/route'
import { POST as borrarVarios } from '@/app/api/media/borrar/route'
import { PATCH as ocultarVarios } from '@/app/api/admin/media/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
const cookieFrom = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))!.split(';')[0]
const json = (path: string, body: unknown, cookie = '', method = 'POST') =>
  new NextRequest(`${BASE}${path}`, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) } })

let app: ReturnType<typeof installTestContainer>
let marta = ''
let camilo = ''
let admin = ''

async function guestCookie(name: string) {
  const { guest } = await app.guests.create(name)
  return cookieFrom(await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) }), GUEST_COOKIE)
}

async function subir(cookie: string) {
  const res = await registrarMedio(
    json('/api/media', { driveFileId: `d-${Math.random()}`, kind: 'photo', thumbUrl: 'https://x/t.webp', width: 600, height: 800, dominantColor: '#aa3366', durationSec: null, sizeBytes: 10 }, cookie),
  )
  return (await res.json()).media.id as string
}

beforeEach(async () => {
  app = installTestContainer()
  marta = await guestCookie('Tía Marta')
  camilo = await guestCookie('Camilo')
  admin = cookieFrom(await loginAdmin(json('/api/admin/login', { password: TEST_ADMIN_PASSWORD })), ADMIN_COOKIE)
})

describe('Borrar por lotes desde "Mis recuerdos"', () => {
  it('el invitado borra varios suyos', async () => {
    const ids = [await subir(marta), await subir(marta)]
    const res = await borrarVarios(json('/api/media/borrar', { ids }, marta))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ removed: 2 })
    expect(app.storage.removed).toHaveLength(2)
  })

  it('no puede borrar recuerdos ajenos y no se borra nada', async () => {
    const res = await borrarVarios(json('/api/media/borrar', { ids: [await subir(marta), await subir(camilo)] }, marta))
    expect(res.status).toBe(403)
    expect(app.storage.removed).toEqual([])
  })

  it('sin QR no se puede', async () => {
    const res = await borrarVarios(json('/api/media/borrar', { ids: [await subir(marta)] }))
    expect(res.status).toBe(401)
  })

  it('valida la lista', async () => {
    expect((await borrarVarios(json('/api/media/borrar', { ids: [] }, marta))).status).toBe(400)
    expect((await borrarVarios(json('/api/media/borrar', { ids: 'm1' }, marta))).status).toBe(400)
  })

  it('el admin borra de cualquiera', async () => {
    const res = await borrarVarios(json('/api/media/borrar', { ids: [await subir(marta), await subir(camilo)] }, admin))
    expect(await res.json()).toEqual({ removed: 2 })
  })
})

describe('Ocultar y mostrar por lotes en el panel', () => {
  it('el admin oculta varios', async () => {
    const ids = [await subir(marta), await subir(camilo)]
    const res = await ocultarVarios(json('/api/admin/media', { ids, hidden: true }, admin, 'PATCH'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ updated: 2 })
  })

  it('un invitado no puede', async () => {
    const res = await ocultarVarios(json('/api/admin/media', { ids: [await subir(marta)], hidden: true }, marta, 'PATCH'))
    expect(res.status).toBe(403)
    expect((await ocultarVarios(json('/api/admin/media', { ids: ['x'], hidden: true }, '', 'PATCH'))).status).toBe(401)
  })
})
