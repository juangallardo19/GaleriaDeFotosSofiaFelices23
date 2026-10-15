import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, GUEST_COOKIE, verifySession, type Role } from '@/features/auth/session'

const GUEST_PAGES = ['/bienvenida', '/subir', '/mis-recuerdos', '/mis-likes', '/descargar']

function isGuestPage(pathname: string) {
  return pathname === '/' || GUEST_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

async function hasSession(req: NextRequest, cookie: string, role: Role) {
  const value = req.cookies.get(cookie)?.value
  const secret = process.env.SESSION_SECRET
  if (!value || !secret) return false
  return (await verifySession(value, secret))?.role === role
}

const to = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url))

// Solo verifica la firma de la cookie (sin base de datos); la API vuelve a validar cada petición
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdmin = await hasSession(req, ADMIN_COOKIE, 'admin')
  if (pathname === '/admin') return isAdmin ? to(req, '/admin/invitados') : NextResponse.next()
  if (pathname.startsWith('/admin/')) return isAdmin ? NextResponse.next() : to(req, '/admin')
  if (isGuestPage(pathname) && !isAdmin && !(await hasSession(req, GUEST_COOKIE, 'guest'))) return to(req, '/qr-invalido')
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|assets|stickers|icons|favicon.ico|manifest.webmanifest|sw.js|i/).*)'],
}
