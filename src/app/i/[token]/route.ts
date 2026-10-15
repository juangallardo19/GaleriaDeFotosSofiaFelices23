import { NextResponse, type NextRequest } from 'next/server'
import { getContainer } from '@/server/container'
import { requestTime, setGuestCookie } from '@/server/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  await requestTime()
  const { token } = await ctx.params
  const app = await getContainer()
  const guest = await app.guests.loginWithToken(token)
  if (!guest) return NextResponse.redirect(new URL('/qr-invalido', req.url), 307)
  const res = NextResponse.redirect(new URL('/bienvenida', req.url), 307)
  await setGuestCookie(res, guest.id, app)
  return res
}
