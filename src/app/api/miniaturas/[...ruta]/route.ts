import { AppError } from '@/server/errors'
import { route } from '@/server/http'
import { isThumbPath } from '@/server/storage/thumbs'

type RutaContext = { params: Promise<{ ruta: string[] }> }

// El álbum se puede ver sin QR, así que la miniatura se cachea también en el CDN de Vercel
export const GET = route<RutaContext>(async (_req, app, ctx) => {
  const path = (await ctx.params).ruta.join('/')
  if (!isThumbPath(path)) throw new AppError('invalido', 'Ruta inválida')
  const file = await app.thumbs.read?.(path)
  if (!file) throw new AppError('no-encontrado')
  return new Response(file.body, {
    headers: {
      'content-type': file.contentType,
      'content-length': String(file.size),
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
})
