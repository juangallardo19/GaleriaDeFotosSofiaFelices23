import { NextResponse } from 'next/server'
import { requireViewer, route, type IdContext } from '@/server/http'

// Proxy de descarga: cuenta la descarga y redirige al original en Drive
export const GET = route<IdContext>(async (req, app, ctx) => {
  await requireViewer(req, app)
  const { id } = await ctx.params
  return NextResponse.redirect(await app.media.registerDownload(id), 302)
})
