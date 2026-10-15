import { NextResponse } from 'next/server'
import { AppError } from '@/server/errors'
import { requireViewer, route } from '@/server/http'
import type { ThumbVariant } from '@/server/storage/thumbs'

const MAX_BYTES = 2 * 1024 * 1024
const TYPES = new Set(['image/webp', 'image/jpeg'])
const VARIANTS = new Set<ThumbVariant>(['thumb', 'preview'])

export const POST = route(async (req, app) => {
  await requireViewer(req, app)
  const variant = req.nextUrl.searchParams.get('variant') as ThumbVariant
  const contentType = req.headers.get('content-type')?.split(';')[0] ?? ''
  if (!VARIANTS.has(variant) || !TYPES.has(contentType)) throw new AppError('invalido', 'Miniatura inválida')
  const data = await req.arrayBuffer()
  if (data.byteLength === 0 || data.byteLength > MAX_BYTES) throw new AppError('invalido', 'Miniatura demasiado pesada')
  return NextResponse.json({ url: await app.thumbs.put({ data, contentType, variant }) })
})
