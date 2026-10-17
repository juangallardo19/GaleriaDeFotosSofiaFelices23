import { THUMB_MAX, dominantColor, thumbnailSize } from '@/features/media/thumbnail'
import type { Thumbnails } from './pipeline'

const PREVIEW_MAX = 1600
const MAX_UPLOAD_BYTES = 1.9 * 1024 * 1024
const VIDEO_TIMEOUT_MS = 12_000

interface Frame {
  source: CanvasImageSource
  width: number
  height: number
  durationSec: number | null
  dispose: () => void
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

// Safari no codifica WebP en canvas: si devuelve otro formato, se usa JPEG
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new Error('No se pudo crear la miniatura')
  return jpeg
}

function draw(frame: Frame, max: number) {
  const size = thumbnailSize(frame.width, frame.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no permite dibujar la miniatura')
  ctx.drawImage(frame.source, 0, 0, size.width, size.height)
  return canvas
}

function colorOf(frame: Frame) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 16
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#fce1ea'
  ctx.drawImage(frame.source, 0, 0, 16, 16)
  return dominantColor(ctx.getImageData(0, 0, 16, 16).data)
}

async function imageFrame(file: File): Promise<Frame> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, durationSec: null, dispose: () => bitmap.close() }
    } catch {
      // HEIC en Chrome o un formato raro: se intenta con <img>, que en Safari sí lo abre
    }
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  try {
    await img.decode()
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, durationSec: null, dispose: () => URL.revokeObjectURL(url) }
}

function waitFor(el: HTMLMediaElement, event: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El video tardó demasiado en abrir')), timeoutMs)
    el.addEventListener(event, () => (clearTimeout(timer), resolve()), { once: true })
    el.addEventListener('error', () => (clearTimeout(timer), reject(new Error('El navegador no puede abrir este video'))), { once: true })
  })
}

const HAVE_CURRENT_DATA = 2

export async function videoFrame(file: File, opts: { createVideo?: () => HTMLVideoElement; timeoutMs?: number } = {}): Promise<Frame> {
  const timeoutMs = opts.timeoutMs ?? VIDEO_TIMEOUT_MS
  const url = URL.createObjectURL(file)
  const video = opts.createVideo?.() ?? document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.preload = 'auto'
  // Safari en iPhone decodifica mejor un video que está en la página: se agrega invisible mientras se saca el cuadro
  const attached = typeof Node !== 'undefined' && video instanceof Node
  if (attached) {
    video.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(video)
  }
  video.src = url
  const dispose = () => {
    video.pause()
    video.removeAttribute('src')
    video.load()
    if (attached) video.remove()
    URL.revokeObjectURL(url)
  }
  try {
    await waitFor(video, 'loadedmetadata', timeoutMs)
    const duration = Number.isFinite(video.duration) ? video.duration : null
    // En iPhone, Safari no carga ningún cuadro hasta que el video se reproduce: se reproduce un instante en silencio
    if (video.readyState < HAVE_CURRENT_DATA) {
      const loaded = waitFor(video, 'loadeddata', timeoutMs)
      await video.play().catch(() => {})
      await loaded
      video.pause()
    }
    const seeked = waitFor(video, 'seeked', timeoutMs)
    video.currentTime = Math.max(0.1, Math.min(1, (duration ?? 0) / 3))
    await seeked
    if (!video.videoWidth) throw new Error('El video no tiene imagen')
    return { source: video, width: video.videoWidth, height: video.videoHeight, durationSec: duration !== null ? Math.round(duration) : null, dispose }
  } catch (err) {
    dispose()
    throw err
  }
}

export async function makeThumbnails(file: File): Promise<Thumbnails> {
  const isVideo = file.type.startsWith('video/') || /\.(mov|mp4|webm|3gp|m4v)$/i.test(file.name)
  const frame = isVideo ? await videoFrame(file) : await imageFrame(file)
  try {
    const thumb = await encode(draw(frame, THUMB_MAX), 0.8)
    let preview: Blob | null = null
    if (!isVideo && Math.max(frame.width, frame.height) > THUMB_MAX) {
      preview = await encode(draw(frame, PREVIEW_MAX), 0.82)
      if (preview.size > MAX_UPLOAD_BYTES) preview = await encode(draw(frame, 1200), 0.75)
      if (preview.size > MAX_UPLOAD_BYTES) preview = null
    }
    return { thumb, preview, width: frame.width, height: frame.height, dominantColor: colorOf(frame), durationSec: frame.durationSec }
  } finally {
    frame.dispose()
  }
}
