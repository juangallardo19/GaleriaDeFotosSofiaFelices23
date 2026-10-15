import { NextResponse } from 'next/server'
import { route, viewerOrVisitor, type IdContext } from '@/server/http'

// Proxy de descarga: cuenta la descarga y redirige al original en Drive
export const GET = route<IdContext>(async (req, app, ctx) => {
  const viewer = await viewerOrVisitor(req, app)
  const { id } = await ctx.params
  await app.media.get(viewer, id)
  return NextResponse.redirect(await app.media.registerDownload(id), 302)
})
