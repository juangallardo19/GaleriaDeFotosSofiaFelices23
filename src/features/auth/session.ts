export type Role = 'guest' | 'admin'

export interface SessionPayload {
  sub: string
  role: Role
  iat: number
  exp: number
}

export const GUEST_COOKIE = 'sofi_session'
export const ADMIN_COOKIE = 'sofi_admin'
export const GUEST_SESSION_MAX_AGE_S = 200 * 24 * 3600
export const ADMIN_SESSION_MAX_AGE_S = 12 * 3600

const encoder = new TextEncoder()

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(text: string): string {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data))))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signSession(
  data: { sub: string; role: Role },
  secret: string,
  opts: { now?: number; maxAgeS: number },
): Promise<string> {
  const iat = Math.floor((opts.now ?? Date.now()) / 1000)
  const body = b64url(JSON.stringify({ ...data, iat, exp: iat + opts.maxAgeS } satisfies SessionPayload))
  return `${body}.${await hmac(secret, body)}`
}

export async function verifySession(token: string, secret: string, now: number = Date.now()): Promise<SessionPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const [body, sig] = parts
  if (!safeEqual(await hmac(secret, body), sig)) return null
  try {
    const payload = JSON.parse(fromB64url(body)) as SessionPayload
    if (typeof payload.sub !== 'string' || (payload.role !== 'guest' && payload.role !== 'admin')) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return null
    return payload
  } catch {
    return null
  }
}
