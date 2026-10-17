import { NextResponse } from 'next/server'
import { requireAdmin, route } from '@/server/http'

// Pone la miniatura que genera Drive en los videos que subieron sin vista previa (iPhone)
export const POST = route(async (req, app) => {
  const admin = await requireAdmin(req, app)
  return NextResponse.json(await app.media.refreshVideoThumbs(admin))
})
