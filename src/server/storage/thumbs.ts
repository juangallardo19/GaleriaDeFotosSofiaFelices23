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

  async read(path: string): Promise<ThumbFile | null> {
    const { get } = await import('@vercel/blob')
    const res = await get(path, { access: this.access, token: this.token })
    if (!res || res.statusCode !== 200) return null
    return { body: res.stream, contentType: res.blob.contentType, size: res.blob.size }
  }
}

// En desarrollo sin token de Blob, la miniatura viaja como data URL
export class InlineThumbStore implements ThumbStore {
  async put(input: { data: ArrayBuffer; contentType: string }) {
    return `data:${input.contentType};base64,${Buffer.from(input.data).toString('base64')}`
  }
}
