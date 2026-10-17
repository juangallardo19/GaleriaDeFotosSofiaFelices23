import { generateCaptainCardsPdf } from '@/features/admin/captain-cards-pdf'
import { PARTY_DATE } from '@/lib/event'
import { AppError } from '@/server/errors'
import { requireAdmin, route } from '@/server/http'

export const GET = route(async (req, app) => {
  await requireAdmin(req, app)
  const captains = await app.captains.list()
  if (captains.length === 0) throw new AppError('invalido', 'Agrega al menos un capitán de mesa para generar las tarjetas')
  const bytes = await generateCaptainCardsPdf({ captains, date: PARTY_DATE, art: await app.cardArt?.().catch(() => undefined) })
  // Con ?ver=1 se abre en el navegador para revisarla antes de imprimir
  const disposition = req.nextUrl.searchParams.get('ver') === '1' ? 'inline' : 'attachment'
  return new Response(bytes.slice().buffer, {
    headers: { 'content-type': 'application/pdf', 'content-disposition': `${disposition}; filename="capitanes-de-mesa.pdf"` },
  })
})
