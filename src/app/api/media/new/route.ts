import { NextResponse } from 'next/server'
import { AppError } from '@/server/errors'
import { requireViewer, route } from '@/server/http'
import { toPublicMedia } from '@/server/serialize'

export const GET = route(async (req, app) => {
  const viewer = await requireViewer(req, app)
  const since = new Date(req.nextUrl.searchParams.get('since') ?? '')
  if (Number.isNaN(since.getTime())) throw new AppError('invalido', 'Fecha inválida')
  const items = await app.media.newerThan(viewer, since)
  return NextResponse.json({ items: items.map((m) => toPublicMedia(m, app.media.streamUrl)) })
})
