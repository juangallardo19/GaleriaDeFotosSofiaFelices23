import { describe, expect, it, vi } from 'vitest'
import { GoogleAuth } from '@/server/google/auth'
import { GoogleDriveStorage, ROOT_FOLDER_NAME } from '@/server/storage/google-drive'
import { GmailMailer } from '@/server/mail/gmail'

type Call = { url: string; method: string; headers: Record<string, string>; body: string | null }

function fakeFetch(handler: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers: Record<string, string> = {}
    new Headers(init.headers).forEach((v, k) => (headers[k] = v))
    const call = { url: String(input), method: init.method ?? 'GET', headers, body: typeof init.body === 'string' ? init.body : null }
    calls.push(call)
    return handler(call)
  })
  return { fn: fn as unknown as typeof fetch, calls }
}
const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })

function auth(fetchFn: typeof fetch, now = () => 0) {
  return new GoogleAuth({ clientId: 'cid', clientSecret: 'secret', refreshToken: 'refresh', fetch: fetchFn, now })
}

describe('Token de acceso de Google', () => {
  it('lo renueva con el refresh token y lo reutiliza mientras no venza', async () => {
    let t = 0
    const f = fakeFetch(() => json({ access_token: `tok-${t}`, expires_in: 3600 }))
    const a = auth(f.fn, () => t)
    expect(await a.accessToken()).toBe('tok-0')
    t = 1000 * 60 * 30
    expect(await a.accessToken()).toBe('tok-0')
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0].url).toBe('https://oauth2.googleapis.com/token')
    expect(new URLSearchParams(f.calls[0].body!).get('grant_type')).toBe('refresh_token')
    t = 1000 * 3600
    expect(await a.accessToken()).toBe(`tok-${t}`)
  })

  it('si llegan varias peticiones juntas renueva una sola vez', async () => {
    const f = fakeFetch(async () => json({ access_token: 'unico', expires_in: 3600 }))
    const a = auth(f.fn)
    await Promise.all([a.accessToken(), a.accessToken(), a.accessToken()])
    expect(f.calls).toHaveLength(1)
  })

  it('falla con un mensaje claro si Google rechaza el refresh token', async () => {
    const a = auth(fakeFetch(() => json({ error: 'invalid_grant' }, { status: 400 })).fn)
    await expect(a.accessToken()).rejects.toThrow(/Google rechazó el refresh token \(invalid_grant\)/)
  })

  it('ese fallo llega a la app como servicio no disponible (503), no como error genérico', async () => {
    const a = auth(fakeFetch(() => json({ error: 'invalid_client' }, { status: 401 })).fn)
    await expect(a.accessToken()).rejects.toMatchObject({ code: 'servicio', status: 503 })
  })
})

function driveWithFolders(extra: (c: Call) => Response | undefined = () => undefined) {
  let created = 0
  const f = fakeFetch((c) => {
    if (c.url.startsWith('https://oauth2.googleapis.com/token')) return json({ access_token: 'acc', expires_in: 3600 })
    const custom = extra(c)
    if (custom) return custom
    if (c.url.startsWith('https://www.googleapis.com/drive/v3/files?') && c.method === 'GET') return json({ files: [] })
    if (c.url === 'https://www.googleapis.com/drive/v3/files?fields=id' && c.method === 'POST') return json({ id: `folder-${++created}` })
    return json({})
  })
  const drive = new GoogleDriveStorage({ auth: auth(f.fn), fetch: f.fn, apiKey: 'api-key' })
  return { drive, calls: f.calls }
}

describe('Google Drive (Adapter)', () => {
  it('crea una sola vez la carpeta del álbum con subcarpetas Fotos y Videos', async () => {
    const { drive, calls } = driveWithFolders()
    const folders = await drive.ensureFolders()
    await drive.ensureFolders()
    const creates = calls.filter((c) => c.method === 'POST' && c.url.includes('/drive/v3/files?fields=id'))
    expect(creates.map((c) => JSON.parse(c.body!).name)).toEqual([ROOT_FOLDER_NAME, 'Fotos', 'Videos'])
    expect(JSON.parse(creates[1].body!).parents).toEqual([folders.root])
    expect(ROOT_FOLDER_NAME).toBe('Álbum Sofi 23')
  })

  it('reutiliza carpetas existentes', async () => {
    const { drive, calls } = driveWithFolders((c) =>
      c.method === 'GET' && c.url.startsWith('https://www.googleapis.com/drive/v3/files?') ? json({ files: [{ id: 'existe' }] }) : undefined,
    )
    expect(await drive.ensureFolders()).toEqual({ root: 'existe', fotos: 'existe', videos: 'existe' })
    expect(calls.some((c) => c.method === 'POST' && c.url.includes('/drive/v3/files?fields=id'))).toBe(false)
  })

  it('inicia la subida reanudable en la carpeta correcta y con el origen para CORS', async () => {
    const { drive, calls } = driveWithFolders((c) =>
      c.url.startsWith('https://www.googleapis.com/upload/drive/v3/files') ? new Response(null, { status: 200, headers: { location: 'https://upload.googleapis.com/sesion-1' } }) : undefined,
    )
    const r = await drive.createUploadSession({ name: 'VID.MOV', size: 1234, mime: 'video/quicktime', folder: 'videos', origin: 'https://sofi23.vercel.app' })
    expect(r).toEqual({ uploadUrl: 'https://upload.googleapis.com/sesion-1' })
    const call = calls.find((c) => c.url.startsWith('https://www.googleapis.com/upload/'))!
    expect(call.url).toContain('uploadType=resumable')
    expect(call.headers['x-upload-content-type']).toBe('video/quicktime')
    expect(call.headers['x-upload-content-length']).toBe('1234')
    expect(call.headers.origin).toBe('https://sofi23.vercel.app')
    expect(call.headers.authorization).toBe('Bearer acc')
    expect(JSON.parse(call.body!)).toMatchObject({ name: 'VID.MOV', parents: ['folder-3'] })
  })

  it('falla si Drive no devuelve la URL de la sesión', async () => {
    const { drive } = driveWithFolders((c) => (c.url.startsWith('https://www.googleapis.com/upload/') ? new Response('{}', { status: 403 }) : undefined))
    await expect(drive.createUploadSession({ name: 'a', size: 1, mime: 'image/jpeg', folder: 'fotos' })).rejects.toThrow(/Drive no inició la subida/)
    await expect(drive.createUploadSession({ name: 'a', size: 1, mime: 'image/jpeg', folder: 'fotos' })).rejects.toMatchObject({ code: 'servicio' })
  })

  it('hace público el archivo como lector para cualquiera con el enlace', async () => {
    const { drive, calls } = driveWithFolders()
    await drive.makePublic('file-9')
    const call = calls.find((c) => c.url.includes('/files/file-9/permissions'))!
    expect(call.method).toBe('POST')
    expect(JSON.parse(call.body!)).toEqual({ role: 'reader', type: 'anyone' })
  })

  it('arma las URL de descarga y de reproducción', () => {
    const { drive } = driveWithFolders()
    expect(drive.downloadUrl('abc')).toBe('https://drive.google.com/uc?export=download&id=abc')
    expect(drive.streamUrl('abc')).toBe('https://www.googleapis.com/drive/v3/files/abc?alt=media&key=api-key')
  })

  it('lee la cuota de almacenamiento', async () => {
    const { drive } = driveWithFolders((c) => (c.url.includes('/about?') ? json({ storageQuota: { limit: '16106127360', usage: '1073741824' } }) : undefined))
    expect(await drive.quota()).toEqual({ usedBytes: 1073741824, limitBytes: 16106127360 })
  })

  it('comparte la carpeta del álbum una sola vez y da los enlaces de las carpetas', async () => {
    const { drive, calls } = driveWithFolders()
    const links = await drive.folderLinks()
    await drive.folderLinks()
    expect(links).toEqual({
      all: 'https://drive.google.com/drive/folders/folder-1',
      photos: 'https://drive.google.com/drive/folders/folder-2',
      videos: 'https://drive.google.com/drive/folders/folder-3',
    })
    const shares = calls.filter((c) => c.url.includes('/permissions'))
    expect(shares.map((c) => c.url)).toEqual(['https://www.googleapis.com/drive/v3/files/folder-1/permissions?fields=id'])
  })

  it('borra archivos', async () => {
    const { drive, calls } = driveWithFolders()
    await drive.remove('file-1')
    expect(calls.some((c) => c.method === 'DELETE' && c.url === 'https://www.googleapis.com/drive/v3/files/file-1')).toBe(true)
  })
})

describe('Vista previa de videos desde Drive', () => {
  it('si Drive todavía está procesando el video, no hay miniatura', async () => {
    const { drive } = driveWithFolders((c) => (c.url.startsWith('https://www.googleapis.com/drive/v3/files/vid1?') ? json({ hasThumbnail: false }) : undefined))
    expect(await drive.videoThumbnail('vid1')).toBeNull()
  })

  it('baja la miniatura que genera Drive en tamaño grande, con el token, y la duración del video', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    const { drive, calls } = driveWithFolders((c) => {
      if (c.url.startsWith('https://www.googleapis.com/drive/v3/files/vid1?'))
        return json({ thumbnailLink: 'https://lh3.googleusercontent.com/drive-storage/abc=s220', videoMediaMetadata: { durationMillis: '46500' } })
      if (c.url.startsWith('https://lh3.googleusercontent.com/')) return new Response(png, { headers: { 'content-type': 'image/png' } })
      return undefined
    })
    const thumb = await drive.videoThumbnail('vid1')
    expect(thumb).toEqual({ image: png, contentType: 'image/png', durationSec: 47 })
    const descarga = calls.find((c) => c.url.startsWith('https://lh3.googleusercontent.com/'))!
    expect(descarga.url).toBe('https://lh3.googleusercontent.com/drive-storage/abc=s720')
    expect(descarga.headers.authorization).toBe('Bearer acc')
  })
})

describe('Correo con Gmail', () => {
  it('envía el mensaje en UTF-8 al correo del álbum', async () => {
    const f = fakeFetch((c) => (c.url.includes('oauth2') ? json({ access_token: 'acc', expires_in: 3600 }) : json({ id: 'msg' })))
    const mailer = new GmailMailer({ auth: auth(f.fn), fetch: f.fn, from: 'sofiacumpleanosgaleriadefotos@gmail.com' })
    await mailer.send({ to: 'sofiacumpleanosgaleriadefotos@gmail.com', subject: 'El álbum de Sofi va en 82 %', text: 'Ya casi se llena' })
    const call = f.calls.find((c) => c.url.includes('gmail'))!
    expect(call.url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send')
    const raw = Buffer.from(JSON.parse(call.body!).raw, 'base64url').toString('utf8')
    expect(raw).toContain('To: sofiacumpleanosgaleriadefotos@gmail.com')
    expect(raw).toContain(`Subject: =?UTF-8?B?${Buffer.from('El álbum de Sofi va en 82 %').toString('base64')}?=`)
    expect(raw).toContain('Content-Type: text/plain; charset=UTF-8')
    expect(raw).toContain(Buffer.from('Ya casi se llena').toString('base64'))
  })
})
