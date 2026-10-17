import { describe, expect, it } from 'vitest'
import { videoFrame } from '@/features/upload/browser-thumbnails'

// Video simulado: en iPhone, Safari solo avisa los datos del video (loadedmetadata) y no carga ningún cuadro hasta que se reproduce
class VideoFalso extends EventTarget {
  muted = false
  defaultMuted = false
  playsInline = false
  preload = ''
  readyState = 0
  videoWidth = 0
  videoHeight = 0
  duration = Number.NaN
  played = false
  private source = ''
  private time = 0

  constructor(private readonly comoIphone: boolean) {
    super()
  }

  setAttribute() {}
  removeAttribute() {}
  load() {}
  pause() {}

  get src() {
    return this.source
  }
  set src(value: string) {
    this.source = value
    setTimeout(() => {
      Object.assign(this, { duration: 12.4, videoWidth: 1080, videoHeight: 1920, readyState: 1 })
      this.dispatchEvent(new Event('loadedmetadata'))
      if (!this.comoIphone) this.cargarCuadro()
    }, 1)
  }

  private cargarCuadro() {
    this.readyState = 2
    this.dispatchEvent(new Event('loadeddata'))
  }

  play() {
    this.played = true
    setTimeout(() => this.cargarCuadro(), 1)
    return Promise.resolve()
  }

  get currentTime() {
    return this.time
  }
  set currentTime(t: number) {
    this.time = t
    setTimeout(() => this.dispatchEvent(new Event('seeked')), 1)
  }
}

const mov = () => new File([new Uint8Array(16)], 'IMG_0001.MOV', { type: 'video/quicktime' })

describe('Cuadro de vista previa de un video al subirlo', () => {
  it('en iPhone reproduce el video un instante en silencio para que Safari cargue la imagen', async () => {
    const video = new VideoFalso(true)
    const frame = await videoFrame(mov(), { createVideo: () => video as unknown as HTMLVideoElement, timeoutMs: 500 })
    expect(video.played).toBe(true)
    expect(frame).toMatchObject({ width: 1080, height: 1920, durationSec: 12 })
    frame.dispose()
  })

  it('en Android ya trae la imagen y no hace falta reproducirlo', async () => {
    const video = new VideoFalso(false)
    const frame = await videoFrame(mov(), { createVideo: () => video as unknown as HTMLVideoElement, timeoutMs: 500 })
    expect(video.played).toBe(false)
    expect(frame).toMatchObject({ width: 1080, height: 1920, durationSec: 12 })
    frame.dispose()
  })
})
