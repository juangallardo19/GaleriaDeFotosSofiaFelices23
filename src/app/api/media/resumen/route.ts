import { NextResponse } from 'next/server'
import { route, viewerOrVisitor } from '@/server/http'

export const GET = route(async (req, app) => {
  const viewer = await viewerOrVisitor(req, app)
  const [summary, folders] = await Promise.all([
    app.media.summary(viewer),
    app.storage.folderLinks?.().catch((err) => {
      console.error('No se pudieron leer las carpetas de Drive', err)
      return null
    }) ?? null,
  ])
  const fallback = app.config.driveFolderUrl
  return NextResponse.json({ ...summary, folders: folders ?? (fallback ? { all: fallback, photos: fallback, videos: fallback } : null) })
})
