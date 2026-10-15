export type ThumbVariant = 'thumb' | 'preview'

export interface ThumbStore {
  put(input: { data: ArrayBuffer; contentType: string; variant: ThumbVariant }): Promise<string>
}

export class BlobThumbStore implements ThumbStore {
  constructor(private readonly token?: string) {}

  async put(input: { data: ArrayBuffer; contentType: string; variant: ThumbVariant }) {
    const { put } = await import('@vercel/blob')
    const ext = input.contentType === 'image/jpeg' ? 'jpg' : 'webp'
    const blob = await put(`${input.variant}s/${crypto.randomUUID()}.${ext}`, input.data, {
      access: 'public',
      contentType: input.contentType,
      cacheControlMaxAge: 31_536_000,
      token: this.token,
    })
    return blob.url
  }
}

// En desarrollo sin token de Blob, la miniatura viaja como data URL
export class InlineThumbStore implements ThumbStore {
  async put(input: { data: ArrayBuffer; contentType: string }) {
    return `data:${input.contentType};base64,${Buffer.from(input.data).toString('base64')}`
  }
}
