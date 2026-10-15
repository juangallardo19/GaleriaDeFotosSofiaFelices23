import { NextResponse } from 'next/server'
import { AppError } from '@/server/errors'
import { requireAdmin, route } from '@/server/http'

export const POST = route(async (req, app) => {
  await requireAdmin(req, app)
  const text = await req.text()
  if (!text.trim() || text.length > 200_000) throw new AppError('invalido', 'Lista vacía o demasiado grande')
  const { created, skipped } = await app.guests.importCsv(text)
  return NextResponse.json({ created: created.length, skipped })
})
