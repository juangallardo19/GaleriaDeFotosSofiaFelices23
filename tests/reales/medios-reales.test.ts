import { existsSync, openAsBlob, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { classifyFile } from '@/features/media/media-kind'
import { uploadResumable } from '@/features/upload/drive-upload'
import { formatBytes } from '@/lib/format'
import { GoogleAuth } from '@/server/google/auth'
import { GoogleDriveStorage } from '@/server/storage/google-drive'

// Sube a Drive los archivos reales de MediaTest (fuera del repo), verifica que se vean y los borra al final
const env = process.env
const DIR = resolve(env.MEDIA_TEST_DIR ?? '../MediaTest')
const MIME: Record<string, string> = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.heic': 'image/heic', '.webp': 'image/webp' }

const files = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((name) => statSync(join(DIR, name)).isFile())
      .map((name) => ({ name, size: statSync(join(DIR, name)).size, type: MIME[name.slice(name.lastIndexOf('.')).toLowerCase()] ?? '' }))
  : []

const filas: Record<string, string>[] = []
afterAll(() => console.table(filas))

describe.skipIf(!env.GOOGLE_REFRESH_TOKEN || files.length === 0)('Archivos reales de MediaTest en Google Drive', () => {
  const auth = new GoogleAuth({ clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, refreshToken: env.GOOGLE_REFRESH_TOKEN! })
  const drive = new GoogleDriveStorage({ auth, apiKey: env.GOOGLE_API_KEY! })

  it.each(files)('$name se acepta, se sube por partes, se reproduce y se borra', async (file) => {
    const c = classifyFile(file)
    expect(c.ok).toBe(true)
    if (!c.ok) return
    const blob = await openAsBlob(join(DIR, file.name), { type: file.type })
    const t0 = performance.now()
    const { uploadUrl } = await drive.createUploadSession({ name: `prueba-${file.name}`, size: file.size, mime: file.type, folder: c.kind === 'photo' ? 'fotos' : 'videos' })
    let parts = 0
    const { fileId } = await uploadResumable({ file: blob, uploadUrl, onProgress: () => parts++ })
    const seconds = (performance.now() - t0) / 1000
    try {
      await drive.makePublic(fileId)
      const t1 = performance.now()
      const res = await fetch(drive.streamUrl(fileId), { headers: { range: 'bytes=0-65535' } })
      expect([200, 206]).toContain(res.status)
      expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
      const download = await fetch(drive.downloadUrl(fileId), { method: 'HEAD', redirect: 'manual' })
      expect(download.status).toBeLessThan(500)
      filas.push({
        archivo: file.name,
        tipo: c.kind === 'photo' ? 'foto' : 'video',
        tamaño: formatBytes(file.size),
        subida: `${seconds.toFixed(1)} s`,
        velocidad: `${formatBytes(file.size / seconds)}/s`,
        partes: String(parts),
        'primer byte': `${Math.round(performance.now() - t1)} ms`,
      })
    } finally {
      await drive.remove(fileId)
    }
  }, 900_000)
})
