import { generateCardsPdf } from '@/features/admin/cards-pdf'
import { PARTY_DATE } from '@/lib/event'
import { requireAdmin, route } from '@/server/http'

export const GET = route(async (req, app) => {
  await requireAdmin(req, app)
  const guests = await app.guests.list()
  const bytes = await generateCardsPdf({
    guests: guests.map((g) => ({ name: g.name, url: app.guests.urlFor(g) })),
    duplex: req.nextUrl.searchParams.get('duplex') === '1',
    date: PARTY_DATE,
    art: await app.cardArt?.().catch(() => undefined),
  })
  return new Response(bytes.slice().buffer, {
    // Con ?ver=1 se abre en el navegador para revisarla antes de imprimir
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `${req.nextUrl.searchParams.get('ver') === '1' ? 'inline' : 'attachment'}; filename="tarjetas-sofi-23.pdf"`,
    },
  })
})
