import { NextResponse } from 'next/server'
import { parseBody, requireAdmin, route, type IdContext } from '@/server/http'
import { HiddenBody } from '@/server/validation'

export const PATCH = route<IdContext>(async (req, app, ctx) => {
  const admin = await requireAdmin(req, app)
  const { id } = await ctx.params
  const { hidden } = await parseBody(req, HiddenBody)
  await app.media.setHidden(admin, id, hidden)
  return new NextResponse(null, { status: 204 })
})
