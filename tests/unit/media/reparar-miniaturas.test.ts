import { describe, expect, it, vi } from 'vitest'
import { PLACEHOLDERS } from '@/features/media/placeholders'
import { VideoThumbHealer, needsVideoThumbs } from '@/server/video-thumb-healer'

const sinVista = { kind: 'video', thumbUrl: PLACEHOLDERS.video }
const conVista = { kind: 'video', thumbUrl: '/api/miniaturas/thumbs/a.jpg' }
const foto = { kind: 'photo', thumbUrl: PLACEHOLDERS.photo }

describe('Reparación automática de las vistas previas de videos', () => {
  it('solo hace falta si en la página hay videos con la imagen genérica', () => {
    expect(needsVideoThumbs([conVista, foto])).toBe(false)
    expect(needsVideoThumbs([conVista, sinVista])).toBe(true)
  })

  it('pide las miniaturas a Drive como mucho una vez cada 2 minutos', async () => {
    let now = 0
    const refresh = vi.fn(async () => ({ updated: 1, pending: 0 }))
    const healer = new VideoThumbHealer({ refresh, now: () => now })
    await healer.run()
    await healer.run()
    expect(refresh).toHaveBeenCalledTimes(1)
    now = 2 * 60_000
    await healer.run()
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('no lanza dos reparaciones a la vez', async () => {
    let finish!: () => void
    const refresh = vi.fn(() => new Promise<{ updated: number; pending: number }>((r) => (finish = () => r({ updated: 0, pending: 0 }))))
    let now = 0
    const healer = new VideoThumbHealer({ refresh, now: () => now })
    const first = healer.run()
    now = 10 * 60_000
    void healer.run()
    finish()
    await first
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('si Drive falla, el álbum sigue funcionando', async () => {
    const healer = new VideoThumbHealer({ refresh: async () => Promise.reject(new Error('Drive caído')), now: () => 0, log: () => {} })
    await expect(healer.run()).resolves.toBeUndefined()
  })
})
