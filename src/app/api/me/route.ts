import { NextResponse } from 'next/server'
import { scriptCase } from '@/lib/format'
import { route, viewerOrVisitor } from '@/server/http'

export const GET = route(async (req, app) => {
  const viewer = await viewerOrVisitor(req, app)
  const guest = viewer.role === 'guest' ? await app.guests.findById(viewer.id) : null
  const name = viewer.role === 'admin' ? 'Anfitriones' : guest ? scriptCase(guest.name) : null
  return NextResponse.json({ id: viewer.id, role: viewer.role, name }, { headers: { 'cache-control': 'private, no-store' } })
})
