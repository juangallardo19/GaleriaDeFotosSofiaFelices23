import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/features/auth/session'
import { route } from '@/server/http'

export const POST = route(async (_req, app) => {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, secure: app.config.secureCookies, sameSite: 'strict', path: '/', maxAge: 0 })
  return res
})
