import { NextResponse } from 'next/server'
import { parseBody, requireViewer, route } from '@/server/http'
import { IdsBody } from '@/server/validation'

// Borrar varios recuerdos de una vez: el invitado solo los suyos, el admin cualquiera
export const POST = route(async (req, app) => {
  const viewer = await requireViewer(req, app)
  const { ids } = await parseBody(req, IdsBody)
  return NextResponse.json(await app.media.removeMany(viewer, ids))
})
