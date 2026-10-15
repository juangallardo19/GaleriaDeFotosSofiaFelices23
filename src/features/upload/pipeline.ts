import type { MediaKind } from '@/features/media/media-kind'
import { FALLBACK_COLOR } from '@/features/media/thumbnail'
import { DriveUploadError } from './drive-upload'
import type { Uploader, UploadTask } from './upload-queue'

export const PLACEHOLDERS: Record<MediaKind, string> = {
  photo: '/assets/placeholder-foto.webp',
  video: '/assets/placeholder-video.webp',
}

export interface Thumbnails {
  thumb: Blob
  preview: Blob | null
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
}

export interface RegisterPayload {
  driveFileId: string
  kind: MediaKind
  thumbUrl: string
  previewUrl: string | null
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
  sizeBytes: number
}

export interface PipelineDeps {
  makeThumbnails: (file: File) => Promise<Thumbnails>
  uploadThumb: (blob: Blob, variant: 'thumb' | 'preview') => Promise<string>
  initUpload: (file: File) => Promise<{ uploadUrl: string; kind: MediaKind }>
  uploadFile: (file: Blob, uploadUrl: string, opts: { onProgress?: (bytes: number) => void; signal?: AbortSignal; resume?: boolean }) => Promise<{ fileId: string }>
  register: (payload: RegisterPayload) => Promise<unknown>
}

interface Progress {
  visuals?: Omit<RegisterPayload, 'driveFileId' | 'kind' | 'sizeBytes'>
  session?: { uploadUrl: string; kind: MediaKind }
  fileId?: string
  attemptedUpload?: boolean
}

// Peso de cada etapa en la barra de progreso: miniaturas 2 %, Drive 96 %, registro 2 %
const VISUALS_SHARE = 0.02
const DRIVE_SHARE = 0.96

// Facade: un solo punto de entrada que orquesta miniaturas, CDN, Drive y registro; recuerda lo hecho para reintentar sin repetir
export function createPipelineUploader(deps: PipelineDeps): Uploader<File> {
  const state = new Map<string, Progress>()

  return async (task: UploadTask<File>, ctx) => {
    const file = task.file
    const size = file.size || 1
    const p = state.get(task.id) ?? {}
    state.set(task.id, p)
    const report = (fraction: number) => ctx.onProgress(Math.round(Math.min(1, fraction) * size))

    if (!p.visuals) {
      try {
        const t = await deps.makeThumbnails(file)
        const thumbUrl = await deps.uploadThumb(t.thumb, 'thumb')
        const previewUrl = t.preview ? await deps.uploadThumb(t.preview, 'preview') : null
        p.visuals = { thumbUrl, previewUrl, width: t.width, height: t.height, dominantColor: t.dominantColor, durationSec: t.durationSec }
      } catch (err) {
        if (ctx.signal.aborted) throw err
        const kind: MediaKind = file.type.startsWith('video/') || /\.(mov|mp4|webm|3gp|m4v)$/i.test(file.name) ? 'video' : 'photo'
        p.visuals = { thumbUrl: PLACEHOLDERS[kind], previewUrl: null, width: 4, height: 5, dominantColor: FALLBACK_COLOR, durationSec: null }
      }
    }
    report(VISUALS_SHARE)

    if (!p.fileId) {
      if (!p.session) {
        p.session = await deps.initUpload(file)
        p.attemptedUpload = false
      }
      try {
        const { fileId } = await deps.uploadFile(file, p.session.uploadUrl, {
          signal: ctx.signal,
          resume: !!p.attemptedUpload,
          onProgress: (bytes) => report(VISUALS_SHARE + (bytes / size) * DRIVE_SHARE),
        })
        p.fileId = fileId
      } catch (err) {
        p.attemptedUpload = true
        if (err instanceof DriveUploadError && err.code === 'sesion-vencida') p.session = undefined
        throw err
      }
    }

    await deps.register({ driveFileId: p.fileId, kind: p.session!.kind, sizeBytes: file.size, ...p.visuals })
    state.delete(task.id)
    report(1)
  }
}
