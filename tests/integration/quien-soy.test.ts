import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { DELETE as borrarInvitado } from '@/app/api/admin/guests/[id]/route'
import { GET as quienSoy } from '@/app/api/me/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
const cookieFrom = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))!.split(';')[0]
const yo = async (cookie = '') => (await quienSoy(new NextRequest(`${BASE}/api/me`, { headers: cookie ? { cookie } : {} }))).json()

let app: ReturnType<typeof installTestContainer>

beforeEach(() => {
  app = installTestContainer()
})

describe('Quién está viendo el álbum (para armar las pantallas)', () => {
  it('el invitado del QR con su nombre', async () => {
    const { guest } = await app.guests.create('tía marta')
    const cookie = cookieFrom(await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) }), GUEST_COOKIE)
    expect(await yo(cookie)).toEqual({ id: guest.id, role: 'guest', name: 'Tía Marta' })
  })

  it('el admin', async () => {
    const login = await loginAdmin(new NextRequest(`${BASE}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }), headers: { 'content-type': 'application/json' } }))
    expect(await yo(cookieFrom(login, ADMIN_COOKIE))).toEqual({ id: 'admin', role: 'admin', name: 'Anfitriones' })
  })

  it('RF-18 · sin QR, un visitante', async () => {
    expect(await yo()).toEqual({ id: 'visitante', role: 'visitor', name: null })
  })

  it('un invitado eliminado pasa a ser visitante', async () => {
    const { guest } = await app.guests.create('Camilo')
    const cookie = cookieFrom(await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) }), GUEST_COOKIE)
    const login = await loginAdmin(new NextRequest(`${BASE}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }), headers: { 'content-type': 'application/json' } }))
    await borrarInvitado(new NextRequest(`${BASE}/api/admin/guests/${guest.id}`, { method: 'DELETE', headers: { cookie: cookieFrom(login, ADMIN_COOKIE) } }), { params: Promise.resolve({ id: guest.id }) })
    expect((await yo(cookie)).role).toBe('visitor')
  })
})
