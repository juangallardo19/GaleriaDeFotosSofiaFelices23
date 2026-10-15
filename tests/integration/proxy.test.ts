import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { config, proxy } from '@/proxy'
import { ADMIN_COOKIE, GUEST_COOKIE, signSession } from '@/features/auth/session'

const SECRET = 'secreto-proxy-0123456789-abcdefghijklmnop'
const BASE = 'https://sofi23.vercel.app'
let guestCookie = ''
let adminCookie = ''

beforeAll(async () => {
  process.env.SESSION_SECRET = SECRET
  guestCookie = `${GUEST_COOKIE}=${await signSession({ sub: 'g1', role: 'guest' }, SECRET, { maxAgeS: 3600 })}`
  adminCookie = `${ADMIN_COOKIE}=${await signSession({ sub: 'admin', role: 'admin' }, SECRET, { maxAgeS: 3600 })}`
})

const run = (path: string, cookie = '') => proxy(new NextRequest(`${BASE}${path}`, { headers: cookie ? { cookie } : {} }))
const redirectedTo = (res: Response) => (res.headers.get('location') ? new URL(res.headers.get('location')!).pathname : null)
const passes = (res: Response) => res.headers.get('x-middleware-next') === '1'

describe('Protección de páginas (proxy)', () => {
  it.each(['/', '/descargar'])('RF-18 · %s sin QR se ve como visitante', async (path) => {
    expect(passes(await run(path))).toBe(true)
  })

  it.each(['/bienvenida', '/subir', '/mis-recuerdos', '/mis-likes'])('RF-18 · %s sin QR lleva al álbum', async (path) => {
    expect(redirectedTo(await run(path))).toBe('/')
  })

  it.each(['/', '/subir', '/mis-likes'])('%s con la sesión del QR pasa', async (path) => {
    expect(passes(await run(path, guestCookie))).toBe(true)
  })

  it('una cookie falsificada no da permisos de invitado', async () => {
    expect(redirectedTo(await run('/subir', `${GUEST_COOKIE}=falsa.firma`))).toBe('/')
  })

  it('el admin también puede ver el álbum', async () => {
    expect(passes(await run('/', adminCookie))).toBe(true)
  })

  it('/admin muestra el login sin sesión, y las demás secciones del admin la exigen', async () => {
    expect(passes(await run('/admin'))).toBe(true)
    expect(redirectedTo(await run('/admin/invitados'))).toBe('/admin')
    expect(redirectedTo(await run('/admin/invitados', guestCookie))).toBe('/admin')
    expect(passes(await run('/admin/invitados', adminCookie))).toBe(true)
  })

  it('con sesión de admin, /admin lleva directo a invitados', async () => {
    expect(redirectedTo(await run('/admin', adminCookie))).toBe('/admin/invitados')
  })

  it.each(['/i/abc', '/qr-invalido'])('%s siempre es accesible', async (path) => {
    expect(passes(await run(path))).toBe(true)
  })

  it('no corre sobre archivos estáticos ni la API', () => {
    const matcher = JSON.stringify(config.matcher)
    for (const excluded of ['_next/static', '_next/image', 'api', 'assets', 'stickers']) expect(matcher).toContain(excluded)
  })
})
