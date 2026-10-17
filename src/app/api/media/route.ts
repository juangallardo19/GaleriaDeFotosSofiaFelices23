import { NextResponse } from 'next/server'
import { isSortKey } from '@/features/gallery/sort'
import type { GalleryFilter } from '@/features/gallery/types'
import type { MediaKind } from '@/features/media/media-kind'
import { AppError } from '@/server/errors'
import { parseBody, requireViewer, route, viewerOrVisitor } from '@/server/http'
import { toPublicMedia } from '@/server/serialize'
import { healVideoThumbsLater, needsVideoThumbs } from '@/server/video-thumb-healer'
import { RegisterBody } from '@/server/validation'

export const GET = route(async (req, app) => {
  const viewer = await viewerOrVisitor(req, app)
  const q = req.nextUrl.searchParams
  const sort = q.get('sort') ?? 'recientes'
  if (!isSortKey(sort)) throw new AppError('invalido', 'Orden desconocido')
  const kind = q.get('kind')
  if (kind && kind !== 'photo' && kind !== 'video') throw new AppError('invalido', 'Tipo desconocido')
  const filter: GalleryFilter = {
    kind: (kind as MediaKind | null) ?? undefined,
    mine: q.get('mine') === '1',
    liked: q.get('liked') === '1',
    authorId: q.get('author') ?? undefined,
    includeHidden: q.get('hidden') === '1',
  }
  const limit = q.has('limit') ? Number(q.get('limit')) : undefined
  const page = await app.media.list(viewer, { sort, filter, cursor: q.get('cursor'), limit })
  // Si hay videos del iPhone sin vista previa, se buscan sus miniaturas en Drive después de responder
  if (needsVideoThumbs(page.items)) healVideoThumbsLater(app)
  return NextResponse.json({ items: page.items.map((m) => toPublicMedia(m, app.media.streamUrl)), nextCursor: page.nextCursor })
})

export const POST = route(async (req, app) => {
  const viewer = await requireViewer(req, app)
  const body = await parseBody(req, RegisterBody)
  const media = await app.media.register(viewer, body)
  const view = await app.media.get(viewer, media.id)
  return NextResponse.json({ media: toPublicMedia(view, app.media.streamUrl) }, { status: 201 })
})
