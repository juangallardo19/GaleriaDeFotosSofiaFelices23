import { NextResponse } from 'next/server'
import { parseBody, requireViewer, route, type IdContext } from '@/server/http'
import { toPublicComment } from '@/server/serialize'
import { CommentBody } from '@/server/validation'

export const GET = route<IdContext>(async (req, app, ctx) => {
  await requireViewer(req, app)
  const { id } = await ctx.params
  return NextResponse.json({ items: (await app.media.listComments(id)).map(toPublicComment) })
})

export const POST = route<IdContext>(async (req, app, ctx) => {
  const viewer = await requireViewer(req, app)
  const { id } = await ctx.params
  const body = await parseBody(req, CommentBody)
  const comment = await app.media.addComment(viewer, id, body)
  const view = (await app.media.listComments(id)).find((c) => c.id === comment.id)!
  return NextResponse.json({ comment: toPublicComment(view) }, { status: 201 })
})
