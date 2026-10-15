import { NextResponse } from 'next/server'
import { qrDataUrl } from '@/features/admin/qr-image'
import { AppError } from '@/server/errors'
import { parseBody, requireAdmin, route, type IdContext } from '@/server/http'
import { GuestBody } from '@/server/validation'

export const GET = route<IdContext>(async (req, app, ctx) => {
  await requireAdmin(req, app)
  const { id } = await ctx.params
  const guest = await app.guests.findById(id)
  if (!guest) throw new AppError('no-encontrado')
  const url = app.guests.urlFor(guest)
  return NextResponse.json({ guest: { id: guest.id, name: guest.name }, url, qr: await qrDataUrl(url) })
})

export const DELETE = route<IdContext>(async (req, app, ctx) => {
  await requireAdmin(req, app)
  const { id } = await ctx.params
  await app.guests.remove(id)
  return new NextResponse(null, { status: 204 })
})

export const PATCH = route<IdContext>(async (req, app, ctx) => {
  await requireAdmin(req, app)
  const { id } = await ctx.params
  const { name } = await parseBody(req, GuestBody)
  const guest = await app.guests.rename(id, name)
  return NextResponse.json({ guest: { id: guest.id, name: guest.name } })
})
