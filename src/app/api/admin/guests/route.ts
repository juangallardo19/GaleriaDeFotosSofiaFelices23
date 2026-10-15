import { NextResponse } from 'next/server'
import { qrDataUrl } from '@/features/admin/qr-image'
import { isOnline } from '@/features/presence/presence'
import { parseBody, requireAdmin, route } from '@/server/http'
import { GuestBody } from '@/server/validation'

export const GET = route(async (req, app) => {
  await requireAdmin(req, app)
  const [guests, uploads] = await Promise.all([app.guests.list(), app.media.uploadsByGuest()])
  const now = new Date()
  return NextResponse.json({
    items: guests.map((g) => ({
      id: g.id,
      name: g.name,
      url: app.guests.urlFor(g),
      online: isOnline(g.lastSeenAt, now),
      entered: g.lastSeenAt !== null,
      lastSeenAt: g.lastSeenAt?.toISOString() ?? null,
      uploads: uploads[g.id] ?? 0,
    })),
  })
})

export const POST = route(async (req, app) => {
  await requireAdmin(req, app)
  const { name } = await parseBody(req, GuestBody)
  const { guest, url } = await app.guests.create(name)
  return NextResponse.json({ guest: { id: guest.id, name: guest.name }, url, qr: await qrDataUrl(url) }, { status: 201 })
})
