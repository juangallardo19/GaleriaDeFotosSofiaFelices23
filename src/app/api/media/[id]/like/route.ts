import { NextResponse } from 'next/server'
import { requireViewer, route, type IdContext } from '@/server/http'

export const POST = route<IdContext>(async (req, app, ctx) => {
  const viewer = await requireViewer(req, app)
  const { id } = await ctx.params
  return NextResponse.json(await app.media.toggleLike(viewer, id))
})
