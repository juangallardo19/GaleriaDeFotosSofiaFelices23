import { afterAll, describe, expect, it } from 'vitest'
import { generateGuestToken } from '@/features/auth/token'
import { uploadResumable } from '@/features/upload/drive-upload'
import { GoogleAuth } from '@/server/google/auth'
import { GmailMailer } from '@/server/mail/gmail'
import { createPostgresRepos } from '@/server/repositories/postgres'
import { GoogleDriveStorage } from '@/server/storage/google-drive'
import { BlobThumbStore, THUMB_ROUTE, blobAccess } from '@/server/storage/thumbs'

const env = process.env
const tiempos: [string, number][] = []
async function medir<T>(nombre: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now()
  const r = await fn()
  tiempos.push([nombre, Math.round(performance.now() - t0)])
  return r
}
afterAll(() => {
  console.table(Object.fromEntries(tiempos.map(([n, ms]) => [n, `${ms} ms`])))
})

describe.skipIf(!env.DATABASE_URL)('Neon (Postgres)', () => {
  it('crea, busca y borra un invitado de prueba', async () => {
    const repos = await createPostgresRepos(env.DATABASE_URL!)
    const token = generateGuestToken()
    const g = await medir('neon · crear invitado', () => repos.guests.create({ name: 'Prueba automática', token }))
    expect((await medir('neon · buscar por token (login QR)', () => repos.guests.findByToken(token)))?.id).toBe(g.id)
    await medir('neon · página de galería', () => repos.media.page({ sort: 'recientes', limit: 24, filter: {}, viewer: { id: g.id, likedIds: new Set() } }))
    await repos.guests.remove(g.id)
  })
})

describe.skipIf(!env.GOOGLE_REFRESH_TOKEN)('Google Drive', () => {
  const auth = new GoogleAuth({ clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, refreshToken: env.GOOGLE_REFRESH_TOKEN! })
  const drive = new GoogleDriveStorage({ auth, apiKey: env.GOOGLE_API_KEY! })

  it('crea las carpetas, sube por partes, comparte, reproduce y borra', async () => {
    await medir('google · token de acceso', () => auth.accessToken())
    const folders = await medir('drive · carpetas del álbum', () => drive.ensureFolders())
    expect(folders.fotos).toBeTruthy()
    const size = 3 * 1024 * 1024 + 123
    const file = new Blob([crypto.getRandomValues(new Uint8Array(65536)), new Uint8Array(size - 65536)], { type: 'video/mp4' })
    const { uploadUrl } = await medir('drive · iniciar subida', () =>
      drive.createUploadSession({ name: 'prueba-automatica.mp4', size, mime: 'video/mp4', folder: 'videos', origin: env.NEXT_PUBLIC_SITE_URL }),
    )
    const { fileId } = await medir('drive · subir 3 MB por partes', () => uploadResumable({ file, uploadUrl, chunkSize: 1024 * 1024 }))
    await medir('drive · compartir público', () => drive.makePublic(fileId))
    const stream = await medir('drive · primer byte del video', () => fetch(drive.streamUrl(fileId), { headers: { range: 'bytes=0-1023' } }))
    expect([200, 206]).toContain(stream.status)
    const q = await medir('drive · cuota', () => drive.quota())
    expect(q.limitBytes).toBeGreaterThan(0)
    await medir('drive · borrar', () => drive.remove(fileId))
  })

  it.skipIf(env.PROBAR_CORREO !== '1')('envía un correo de prueba al álbum', async () => {
    const mailer = new GmailMailer({ auth, from: env.GMAIL_SENDER! })
    await medir('gmail · enviar', () => mailer.send({ to: env.ALERT_EMAIL!, subject: 'Prueba del álbum de Sofi', text: 'Si te llegó este correo, las alertas de almacenamiento funcionan.' }))
  })
})

describe.skipIf(!env.BLOB_READ_WRITE_TOKEN)('Vercel Blob (miniaturas)', () => {
  it('guarda una miniatura, la lee como la serviría el sitio y la borra', async () => {
    const { del } = await import('@vercel/blob')
    const store = new BlobThumbStore({ access: blobAccess(env.BLOB_ACCESS), token: env.BLOB_READ_WRITE_TOKEN })
    const data = new Uint8Array(40_000).buffer
    const url = await medir('blob · subir miniatura', () => store.put({ data, contentType: 'image/webp', variant: 'thumb' }))
    const path = url.startsWith(`${THUMB_ROUTE}/`) ? url.slice(THUMB_ROUTE.length + 1) : new URL(url).pathname.slice(1)
    const file = await medir('blob · leer miniatura', () => store.read(path))
    expect(file?.contentType).toBe('image/webp')
    expect((await new Response(file!.body).arrayBuffer()).byteLength).toBe(40_000)
    await del(path, { token: env.BLOB_READ_WRITE_TOKEN })
  })
})
