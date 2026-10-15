import { NextResponse } from 'next/server'
import { requireViewer, route, viewerOrVisitor, type IdContext } from '@/server/http'
import { toPublicMedia } from '@/server/serialize'

export const GET = route<IdContext>(async (req, app, ctx) => {
  const viewer = await viewerOrVisitor(req, app)
  const { id } = await ctx.params
  return NextResponse.json({ media: toPublicMedia(await app.media.get(viewer, id), app.media.streamUrl) })
})

export const DELETE = route<IdContext>(async (req, app, ctx) => {
  const viewer = await requireViewer(req, app)
  const { id } = await ctx.params
  await app.media.remove(viewer, id)
  return new NextResponse(null, { status: 204 })
})
