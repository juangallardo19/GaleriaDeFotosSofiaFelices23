import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { PATCH as editarInvitado } from '@/app/api/admin/guests/[id]/route'
import { GET as quienSoy } from '@/app/api/me/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
const cookieFrom = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))!.split(';')[0]
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const patch = (id: string, body: unknown, cookie = '') =>
  editarInvitado(new NextRequest(`${BASE}/api/admin/guests/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) } }), ctx(id))

let app: ReturnType<typeof installTestContainer>
let admin = ''

beforeEach(async () => {
  app = installTestContainer()
  const login = await loginAdmin(new NextRequest(`${BASE}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }), headers: { 'content-type': 'application/json' } }))
  admin = cookieFrom(login, ADMIN_COOKIE)
})

describe('RF-14 · editar el nombre desde el panel', () => {
  it('el admin cambia el nombre y el invitado lo ve con su mismo QR', async () => {
    const { guest } = await app.guests.create('Valeria (2)')
    const res = await patch(guest.id, { name: 'Valeria Gómez' }, admin)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ guest: { id: guest.id, name: 'Valeria Gómez' } })
    const qr = await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), { params: Promise.resolve({ token: guest.token }) })
    const me = await (await quienSoy(new NextRequest(`${BASE}/api/me`, { headers: { cookie: cookieFrom(qr, GUEST_COOKIE) } }))).json()
    expect(me.name).toBe('Valeria Gómez')
  })

  it('valida el nombre', async () => {
    const { guest } = await app.guests.create('Luis')
    expect((await patch(guest.id, { name: '' }, admin)).status).toBe(400)
    expect((await patch(guest.id, {}, admin)).status).toBe(400)
  })

  it('un invitado que no existe da 404', async () => {
    expect((await patch('no-existe', { name: 'Alguien' }, admin)).status).toBe(404)
  })

  it('solo el admin puede editar', async () => {
    const { guest } = await app.guests.create('Luis')
    expect((await patch(guest.id, { name: 'Hackeado' })).status).toBe(401)
  })
})
