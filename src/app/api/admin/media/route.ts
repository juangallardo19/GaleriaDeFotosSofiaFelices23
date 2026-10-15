import { NextResponse } from 'next/server'
import { parseBody, requireAdmin, route } from '@/server/http'
import { HiddenManyBody } from '@/server/validation'

export const PATCH = route(async (req, app) => {
  const admin = await requireAdmin(req, app)
  const { ids, hidden } = await parseBody(req, HiddenManyBody)
  return NextResponse.json(await app.media.setHiddenMany(admin, ids, hidden))
})
