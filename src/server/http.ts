import { NextResponse, connection, type NextRequest } from 'next/server'
import type { z } from 'zod'
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE_S, GUEST_COOKIE, GUEST_SESSION_MAX_AGE_S, signSession, verifySession } from '@/features/auth/session'
import { getContainer, type AppContainer } from './container'
import { NEEDS_QR } from '@/lib/messages'
import { ADMIN_VIEWER_ID, VISITOR, type Viewer } from './domain'
import { AppError } from './errors'

export type IdContext = { params: Promise<{ id: string }> }

// Las rutas dependen de cada petición: nunca se pre-renderizan en el build.
// Fuera de un request de Next (pruebas unitarias) no hay nada que marcar.
export async function requestTime() {
  try {
    await connection()
  } catch (err) {
    if (err instanceof Error && err.message.includes('outside a request scope')) return
    throw err
  }
}

// Envoltorio común: resuelve el contenedor y convierte errores en respuestas HTTP
export function route<C = unknown>(handler: (req: NextRequest, app: AppContainer, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C = undefined as C): Promise<Response> => {
    await requestTime()
    try {
      return await handler(req, await getContainer(), ctx)
    } catch (err) {
      return errorResponse(err)
    }
  }
}

export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) throw new AppError('invalido', 'Datos inválidos')
  return parsed.data
}

export async function readViewer(req: NextRequest, app: AppContainer): Promise<Viewer | null> {
  const admin = req.cookies.get(ADMIN_COOKIE)?.value
  if (admin) {
    const payload = await verifySession(admin, app.config.sessionSecret)
    if (payload?.role === 'admin') return { id: ADMIN_VIEWER_ID, role: 'admin' }
  }
  const guest = req.cookies.get(GUEST_COOKIE)?.value
  if (!guest) return null
  const payload = await verifySession(guest, app.config.sessionSecret)
  if (payload?.role !== 'guest') return null
  // Un invitado eliminado por el admin pierde el acceso aunque conserve la cookie
  return (await app.guests.findById(payload.sub)) ? { id: payload.sub, role: 'guest' } : null
}

// Para leer el álbum: sin sesión se entra como visitante
export async function viewerOrVisitor(req: NextRequest, app: AppContainer): Promise<Viewer> {
  return (await readViewer(req, app)) ?? VISITOR
}

// Para participar (subir, comentar, dar like, borrar): hace falta el QR o ser admin
export async function requireViewer(req: NextRequest, app: AppContainer): Promise<Viewer> {
  const viewer = await readViewer(req, app)
  if (!viewer) throw new AppError('no-autorizado', NEEDS_QR)
  return viewer
}

export async function requireAdmin(req: NextRequest, app: AppContainer): Promise<Viewer> {
  const viewer = await readViewer(req, app)
  if (viewer?.role !== 'admin') throw new AppError(viewer ? 'prohibido' : 'no-autorizado')
  return viewer
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) return NextResponse.json({ error: err.code, message: err.message }, { status: err.status })
  console.error(err)
  return NextResponse.json({ error: 'interno' }, { status: 500 })
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'desconocida'
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new AppError('invalido', 'JSON inválido')
  }
}

export async function setGuestCookie(res: NextResponse, guestId: string, app: AppContainer) {
  const value = await signSession({ sub: guestId, role: 'guest' }, app.config.sessionSecret, { maxAgeS: GUEST_SESSION_MAX_AGE_S })
  res.cookies.set(GUEST_COOKIE, value, { httpOnly: true, secure: app.config.secureCookies, sameSite: 'lax', path: '/', maxAge: GUEST_SESSION_MAX_AGE_S })
}

export async function setAdminCookie(res: NextResponse, app: AppContainer) {
  const value = await signSession({ sub: ADMIN_VIEWER_ID, role: 'admin' }, app.config.sessionSecret, { maxAgeS: ADMIN_SESSION_MAX_AGE_S })
  res.cookies.set(ADMIN_COOKIE, value, { httpOnly: true, secure: app.config.secureCookies, sameSite: 'strict', path: '/', maxAge: ADMIN_SESSION_MAX_AGE_S })
}
