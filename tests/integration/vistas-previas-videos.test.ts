import { beforeEach, describe, expect, it } from 'vitest'
import { PLACEHOLDERS } from '@/features/upload/pipeline'
import { installTestContainer } from '../helpers/container'
import { pngHeader } from '../helpers/imagenes'

let app: ReturnType<typeof installTestContainer>
const admin = { id: 'admin', role: 'admin' as const }

beforeEach(() => {
  app = installTestContainer()
})

async function video(thumbUrl: string, driveFileId: string) {
  const { guest } = await app.guests.create(`Invitado ${driveFileId}`)
  const sinVista = thumbUrl === PLACEHOLDERS.video
  return app.media.register(
    { id: guest.id, role: 'guest' },
    {
      driveFileId,
      kind: 'video',
      thumbUrl,
      previewUrl: null,
      dominantColor: '#e9b7c6',
      sizeBytes: 1000,
      width: sinVista ? 4 : 1080,
      height: sinVista ? 5 : 1920,
      durationSec: sinVista ? null : 43,
    },
  )
}

describe('Vistas previas de los videos que subieron sin miniatura (iPhone)', () => {
  it('pone la miniatura de Drive en los videos con la imagen genérica y no toca los demás', async () => {
    const iphone = await video(PLACEHOLDERS.video, 'drive-iphone')
    const android = await video('/api/miniaturas/thumbs/android.webp', 'drive-android')
    app.storage.videoThumbnails.set('drive-iphone', { image: pngHeader(720, 1280), contentType: 'image/png', durationSec: 47 })

    expect(await app.media.refreshVideoThumbs(admin)).toEqual({ updated: 1, pending: 0 })

    const nuevo = await app.media.get(admin, iphone.id)
    expect(nuevo.thumbUrl).toMatch(/^\/api\/miniaturas\/thumbs\//)
    expect(nuevo).toMatchObject({ width: 720, height: 1280, durationSec: 47 })
    expect((await app.media.get(admin, android.id)).thumbUrl).toBe('/api/miniaturas/thumbs/android.webp')
    expect(app.thumbs.saved).toEqual([{ contentType: 'image/png', size: pngHeader(720, 1280).byteLength, variant: 'thumb' }])
  })

  it('si Drive todavía procesa el video, queda pendiente para intentar después', async () => {
    const iphone = await video(PLACEHOLDERS.video, 'drive-iphone')
    expect(await app.media.refreshVideoThumbs(admin)).toEqual({ updated: 0, pending: 1 })
    expect((await app.media.get(admin, iphone.id)).thumbUrl).toBe(PLACEHOLDERS.video)
  })

  it('solo el admin puede hacerlo', async () => {
    const { guest } = await app.guests.create('Curioso')
    await expect(app.media.refreshVideoThumbs({ id: guest.id, role: 'guest' })).rejects.toThrow()
  })
})
