import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as entrarConQr } from '@/app/i/[token]/route'
import { POST as loginAdmin } from '@/app/api/admin/login/route'
import { GET as listarMedios } from '@/app/api/media/route'
import { POST as latido } from '@/app/api/presence/route'
import { ADMIN_COOKIE, GUEST_COOKIE } from '@/features/auth/session'
import { TEST_ADMIN_PASSWORD, installTestContainer } from '../helpers/container'

const BASE = 'https://sofi23.vercel.app'
const params = (token: string) => ({ params: Promise.resolve({ token }) })
const cookieFrom = (res: Response, name: string) => {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))
  return raw ? raw.split(';')[0].slice(name.length + 1) : null
}

let app: ReturnType<typeof installTestContainer>
beforeEach(() => {
  app = installTestContainer()
})

async function guestSession() {
  const { guest } = await app.guests.create('Tía Marta')
  const res = await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), params(guest.token))
  return { guest, cookie: cookieFrom(res, GUEST_COOKIE)! }
}

describe('RF-01 · escanear el QR', () => {
  it('con un QR válido entra, guarda la sesión y va a la bienvenida', async () => {
    const { guest } = await app.guests.create('Tía Marta')
    const res = await entrarConQr(new NextRequest(`${BASE}/i/${guest.token}`), params(guest.token))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/bienvenida')
    const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${GUEST_COOKIE}=`))!
    expect(raw).toMatch(/HttpOnly/i)
    expect(raw).toMatch(/Secure/i)
    expect(raw).toMatch(/SameSite=lax/i)
    expect(raw).toMatch(/Max-Age=\d{7,}/)
  })

  it('RF-02 · con un QR inválido va a la pantalla de QR inválido y no crea sesión', async () => {
    const res = await entrarConQr(new NextRequest(`${BASE}/i/no-existe`), params('no-existe'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/qr-invalido')
    expect(cookieFrom(res, GUEST_COOKIE)).toBeNull()
  })
})

describe('RF-14 · login del admin en /admin', () => {
  const login = (password: string, ip = '1.1.1.1') =>
    loginAdmin(
      new NextRequest(`${BASE}/api/admin/login`, {
        method: 'POST',
        body: JSON.stringify({ password }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      }),
    )

  it('con la contraseña correcta crea la sesión de admin', async () => {
    const res = await login(TEST_ADMIN_PASSWORD)
    expect(res.status).toBe(204)
    expect(cookieFrom(res, ADMIN_COOKIE)).toBeTruthy()
  })

  it('con la contraseña incorrecta responde 401', async () => {
    const res = await login('mala')
    expect(res.status).toBe(401)
    expect(cookieFrom(res, ADMIN_COOKIE)).toBeNull()
  })

  it('bloquea por un rato después de muchos intentos', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 7; i++) statuses.push((await login('mala', '9.9.9.9')).status)
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
    expect(statuses.at(-1)).toBe(429)
  })

  it('rechaza cuerpos inválidos', async () => {
    const res = await loginAdmin(new NextRequest(`${BASE}/api/admin/login`, { method: 'POST', body: 'no-json' }))
    expect(res.status).toBe(400)
  })
})

describe('API de la galería', () => {
  it('sin sesión responde 401', async () => {
    const res = await listarMedios(new NextRequest(`${BASE}/api/media`))
    expect(res.status).toBe(401)
  })

  it('con la sesión del QR lista los recuerdos con cursor', async () => {
    const { cookie } = await guestSession()
    const res = await listarMedios(new NextRequest(`${BASE}/api/media?sort=recientes&limit=24`, { headers: { cookie: `${GUEST_COOKIE}=${cookie}` } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ items: [], nextCursor: null })
  })

  it('rechaza un orden desconocido', async () => {
    const { cookie } = await guestSession()
    const res = await listarMedios(new NextRequest(`${BASE}/api/media?sort=hackeado`, { headers: { cookie: `${GUEST_COOKIE}=${cookie}` } }))
    expect(res.status).toBe(400)
  })
})

describe('Latido de presencia', () => {
  it('registra la señal y devuelve cuántas personas están viendo el álbum', async () => {
    const { cookie } = await guestSession()
    const res = await latido(new NextRequest(`${BASE}/api/presence`, { method: 'POST', headers: { cookie: `${GUEST_COOKIE}=${cookie}` } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ online: 1, label: '1 persona viendo el álbum' })
  })
})
