import { describe, expect, it } from 'vitest'
import { generateGuestToken, isTokenFormatValid } from '@/features/auth/token'
import { GUEST_SESSION_MAX_AGE_S, signSession, verifySession } from '@/features/auth/session'
import { checkAdminPassword } from '@/features/auth/admin-password'
import { SlidingWindowLimiter } from '@/features/auth/rate-limit'

const SECRET = 'secreto-de-prueba-con-longitud-suficiente-123'

describe('RF-01 · token del QR', () => {
  it('genera tokens de 128 bits en base64url (22 caracteres)', () => {
    const t = generateGuestToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })

  it('no repite tokens', () => {
    const set = new Set(Array.from({ length: 2000 }, generateGuestToken))
    expect(set.size).toBe(2000)
  })

  it('RF-02 · rechaza formatos inválidos antes de consultar la base', () => {
    expect(isTokenFormatValid(generateGuestToken())).toBe(true)
    for (const bad of ['', 'abc', 'x'.repeat(23), 'hola mundo con espacios', '../../etc/passwd', 'ñññññññññññññññññññññ']) {
      expect(isTokenFormatValid(bad)).toBe(false)
    }
  })
})

describe('Sesión firmada (cookie)', () => {
  it('firma y verifica la sesión de un invitado', async () => {
    const now = Date.now()
    const token = await signSession({ sub: 'g1', role: 'guest' }, SECRET, { now, maxAgeS: 60 })
    const payload = await verifySession(token, SECRET, now + 1000)
    expect(payload).toMatchObject({ sub: 'g1', role: 'guest' })
  })

  it('el QR es permanente: la sesión de invitado dura al menos 3 meses', () => {
    expect(GUEST_SESSION_MAX_AGE_S).toBeGreaterThanOrEqual(90 * 24 * 3600)
  })

  it('rechaza una sesión manipulada', async () => {
    const token = await signSession({ sub: 'g1', role: 'guest' }, SECRET, { maxAgeS: 60 })
    const [body, sig] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), role: 'admin' })).toString('base64url')
    expect(await verifySession(`${forged}.${sig}`, SECRET)).toBeNull()
  })

  it('rechaza una sesión firmada con otro secreto', async () => {
    const token = await signSession({ sub: 'g1', role: 'guest' }, SECRET, { maxAgeS: 60 })
    expect(await verifySession(token, 'otro-secreto-distinto-123456789012345')).toBeNull()
  })

  it('rechaza una sesión vencida', async () => {
    const now = Date.now()
    const token = await signSession({ sub: 'g1', role: 'guest' }, SECRET, { now, maxAgeS: 10 })
    expect(await verifySession(token, SECRET, now + 11_000)).toBeNull()
  })

  it('rechaza basura', async () => {
    for (const bad of ['', 'a.b', 'nopunto', '...']) expect(await verifySession(bad, SECRET)).toBeNull()
  })
})

describe('RF-14 · contraseña del admin', () => {
  it('acepta solo la contraseña correcta', async () => {
    expect(await checkAdminPassword('clave-correcta', 'clave-correcta')).toBe(true)
    expect(await checkAdminPassword('clave-incorrecta', 'clave-correcta')).toBe(false)
    expect(await checkAdminPassword('', 'clave-correcta')).toBe(false)
  })

  it('si no hay contraseña configurada nadie entra', async () => {
    expect(await checkAdminPassword('', '')).toBe(false)
    expect(await checkAdminPassword('algo', undefined)).toBe(false)
  })
})

describe('Límite de intentos del login admin (ventana deslizante)', () => {
  it('bloquea después de N intentos dentro de la ventana y libera al pasar el tiempo', () => {
    let t = 0
    const limiter = new SlidingWindowLimiter({ limit: 3, windowMs: 60_000, now: () => t })
    expect([limiter.hit('ip'), limiter.hit('ip'), limiter.hit('ip')]).toEqual([true, true, true])
    expect(limiter.hit('ip')).toBe(false)
    expect(limiter.hit('otra-ip')).toBe(true)
    t = 60_001
    expect(limiter.hit('ip')).toBe(true)
  })
})
