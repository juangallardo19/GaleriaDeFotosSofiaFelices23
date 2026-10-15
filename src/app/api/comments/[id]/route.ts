import { NextResponse } from 'next/server'
import { parseBody, requireViewer, route, type IdContext } from '@/server/http'
import { EditCommentBody } from '@/server/validation'

export const PATCH = route<IdContext>(async (req, app, ctx) => {
  const viewer = await requireViewer(req, app)
  const { id } = await ctx.params
  const { text } = await parseBody(req, EditCommentBody)
  await app.media.editComment(viewer, id, text)
  return new NextResponse(null, { status: 204 })
})

export const DELETE = route<IdContext>(async (req, app, ctx) => {
  const viewer = await requireViewer(req, app)
  const { id } = await ctx.params
  await app.media.deleteComment(viewer, id)
  return new NextResponse(null, { status: 204 })
})
