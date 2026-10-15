import type { GoogleAuth } from '../google/auth'
import type { FolderLinks, StorageFolder, StorageProvider } from './types'

export const ROOT_FOLDER_NAME = 'Álbum Sofi 23'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

interface Folders {
  root: string
  fotos: string
  videos: string
}

export class GoogleDriveStorage implements StorageProvider {
  private folders: Promise<Folders> | null = null
  private links: Promise<FolderLinks> | null = null
  private readonly fetchFn: typeof fetch

  constructor(private readonly opts: { auth: GoogleAuth; apiKey: string; fetch?: typeof fetch }) {
    this.fetchFn = opts.fetch ?? fetch
  }

  private async request(url: string, init: RequestInit = {}) {
    const token = await this.opts.auth.accessToken()
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token}`)
    return this.fetchFn(url, { ...init, headers })
  }

  private async findOrCreateFolder(name: string, parent: string | null): Promise<string> {
    const q = [`name = '${name.replace(/'/g, "\\'")}'`, `mimeType = '${FOLDER_MIME}'`, 'trashed = false', parent ? `'${parent}' in parents` : `'root' in parents`].join(' and ')
    const found = await this.request(`${API}/files?${new URLSearchParams({ q, fields: 'files(id)', pageSize: '1' })}`)
    const list = (await found.json()) as { files?: { id: string }[] }
    if (list.files?.[0]) return list.files[0].id
    const created = await this.request(`${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) }),
    })
    const body = (await created.json()) as { id?: string }
    if (!body.id) throw new Error(`No se pudo crear la carpeta ${name} en Drive`)
    return body.id
  }

  ensureFolders(): Promise<Folders> {
    this.folders ??= (async () => {
      const root = await this.findOrCreateFolder(ROOT_FOLDER_NAME, null)
      const fotos = await this.findOrCreateFolder('Fotos', root)
      const videos = await this.findOrCreateFolder('Videos', root)
      return { root, fotos, videos }
    })().catch((err) => {
      this.folders = null
      throw err
    })
    return this.folders
  }

  // Comparte la carpeta del álbum (y por herencia sus subcarpetas) para descargarla completa desde Drive
  folderLinks(): Promise<FolderLinks> {
    this.links ??= (async () => {
      const f = await this.ensureFolders()
      await this.makePublic(f.root)
      const url = (id: string) => `https://drive.google.com/drive/folders/${id}`
      return { all: url(f.root), photos: url(f.fotos), videos: url(f.videos) }
    })().catch((err) => {
      this.links = null
      throw err
    })
    return this.links
  }

  async createUploadSession(input: { name: string; size: number; mime: string; folder: StorageFolder; origin?: string }) {
    const folders = await this.ensureFolders()
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-type': input.mime,
      'x-upload-content-length': String(input.size),
    }
    // Con el header Origin, Drive habilita CORS para que el navegador suba directo a la URL de la sesión
    if (input.origin) headers.origin = input.origin
    const res = await this.request(`${UPLOAD_API}?uploadType=resumable&fields=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: input.name, parents: [input.folder === 'fotos' ? folders.fotos : folders.videos] }),
    })
    const location = res.headers.get('location')
    if (!res.ok || !location) throw new Error(`Drive no inició la subida (${res.status})`)
    return { uploadUrl: location }
  }

  async makePublic(fileId: string) {
    const res = await this.request(`${API}/files/${fileId}/permissions?fields=id`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })
    if (!res.ok) throw new Error(`Drive no pudo compartir el archivo (${res.status})`)
  }

  downloadUrl(fileId: string) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`
  }

  streamUrl(fileId: string) {
    return `${API}/files/${fileId}?alt=media&key=${this.opts.apiKey}`
  }

  async remove(fileId: string) {
    const res = await this.request(`${API}/files/${fileId}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new Error(`Drive no pudo borrar el archivo (${res.status})`)
  }

  async quota() {
    const res = await this.request(`${API}/about?fields=storageQuota`)
    const body = (await res.json()) as { storageQuota?: { limit?: string; usage?: string } }
    return { usedBytes: Number(body.storageQuota?.usage ?? 0), limitBytes: Number(body.storageQuota?.limit ?? 0) }
  }
}
