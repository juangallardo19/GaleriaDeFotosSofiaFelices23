import { NextResponse } from 'next/server'
import { requireAdmin, route } from '@/server/http'

export const GET = route(async (req, app) => {
  await requireAdmin(req, app)
  const [guests, online, media, storage] = await Promise.all([
    app.guests.list(),
    app.guests.onlineCount(),
    app.media.stats(),
    app.media.quota().catch(() => null),
  ])
  return NextResponse.json({ guests: guests.length, online, media, storage })
})
