export type ThumbVariant = 'thumb' | 'preview'
export type BlobAccess = 'public' | 'private'

export interface ThumbFile {
  body: ReadableStream<Uint8Array>
  contentType: string
  size: number
}

export interface ThumbStore {
  put(input: { data: ArrayBuffer; contentType: string; variant: ThumbVariant }): Promise<string>
  read?(path: string): Promise<ThumbFile | null>
  remove?(url: string): Promise<void>
}

export const THUMB_ROUTE = '/api/miniaturas'

const THUMB_PATH = /^(thumbs|previews)\/[\w-]+\.(webp|jpg)$/

export function isThumbPath(path: string): boolean {
  return THUMB_PATH.test(path)
}

// El almacén se crea privado o público en Vercel; si no se indica, se asume privado
export function blobAccess(value: string | undefined): BlobAccess {
  return value === 'public' ? 'public' : 'private'
}

// En un almacén privado las miniaturas solo se leen con el token del servidor,
// así que el sitio las sirve desde THUMB_ROUTE
export class BlobThumbStore implements ThumbStore {
  private readonly access: BlobAccess
  private readonly token?: string

  constructor(opts: { access: BlobAccess; token?: string }) {
    this.access = opts.access
    this.token = opts.token
  }

  async put(input: { data: ArrayBuffer; contentType: string; variant: ThumbVariant }) {
    const { put } = await import('@vercel/blob')
    const ext = input.contentType === 'image/jpeg' ? 'jpg' : 'webp'
    const blob = await put(`${input.variant}s/${crypto.randomUUID()}.${ext}`, input.data, {
      access: this.access,
      contentType: input.contentType,
      cacheControlMaxAge: 31_536_000,
      token: this.token,
    })
    return this.access === 'private' ? `${THUMB_ROUTE}/${blob.pathname}` : blob.url
  }

  async remove(url: string) {
    const target = url.startsWith(`${THUMB_ROUTE}/`) ? url.slice(THUMB_ROUTE.length + 1) : url.startsWith('https://') ? url : null
    if (!target) return
    const { del } = await import('@vercel/blob')
    await del(target, { token: this.token })
  }

  async read(path: string): Promise<ThumbFile | null> {
    const { get } = await import('@vercel/blob')
    const res = await get(path, { access: this.access, token: this.token })
    if (!res || res.statusCode !== 200) return null
    return { body: res.stream, contentType: res.blob.contentType, size: res.blob.size }
  }
}

// En desarrollo sin token de Blob, la miniatura queda en memoria y se sirve por la misma ruta que en producción
export class MemoryThumbStore implements ThumbStore {
  private readonly files = new Map<string, { data: ArrayBuffer; contentType: string }>()

  async put(input: { data: ArrayBuffer; contentType: string; variant: ThumbVariant }) {
    const path = `${input.variant}s/${crypto.randomUUID()}.${input.contentType === 'image/jpeg' ? 'jpg' : 'webp'}`
    this.files.set(path, { data: input.data.slice(0), contentType: input.contentType })
    return `${THUMB_ROUTE}/${path}`
  }

  async read(path: string): Promise<ThumbFile | null> {
    const file = this.files.get(path)
    if (!file) return null
    return { body: new Blob([file.data]).stream(), contentType: file.contentType, size: file.data.byteLength }
  }

  async remove(url: string) {
    if (url.startsWith(`${THUMB_ROUTE}/`)) this.files.delete(url.slice(THUMB_ROUTE.length + 1))
  }
}
