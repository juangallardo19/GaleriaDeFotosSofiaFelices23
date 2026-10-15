import { NextResponse } from 'next/server'
import { parseBody, requireViewer, route } from '@/server/http'
import { InitUploadBody } from '@/server/validation'

export const POST = route(async (req, app) => {
  const viewer = await requireViewer(req, app)
  const body = await parseBody(req, InitUploadBody)
  const origin = req.headers.get('origin') ?? app.config.baseUrl
  return NextResponse.json(await app.media.initUpload(viewer, body, origin))
})
