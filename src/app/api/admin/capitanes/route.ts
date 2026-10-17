import { NextResponse } from 'next/server'
import { parseBody, requireAdmin, route } from '@/server/http'
import { CaptainsBody } from '@/server/validation'

export const GET = route(async (req, app) => {
  await requireAdmin(req, app)
  return NextResponse.json({ items: await app.captains.list() })
})

// Se guarda la lista completa: es corta y solo la edita el admin
export const PUT = route(async (req, app) => {
  await requireAdmin(req, app)
  const { items } = await parseBody(req, CaptainsBody)
  return NextResponse.json({ items: await app.captains.save(items) })
})
