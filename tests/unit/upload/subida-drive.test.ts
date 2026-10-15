import { describe, expect, it, vi } from 'vitest'
import { DriveUploadError, uploadResumable } from '@/features/upload/drive-upload'
import { PLACEHOLDERS, createPipelineUploader, type PipelineDeps } from '@/features/upload/pipeline'
import type { UploadTask } from '@/features/upload/upload-queue'

const MB = 1024 * 1024
const blob = (size: number) => new Blob([new Uint8Array(size)], { type: 'video/mp4' })

type Put = { range: string | null; size: number }

// Servidor de subida reanudable simulado (protocolo de Google Drive)
function resumableServer(total: number, opts: { failOnce?: number; confirmLess?: number; expire?: boolean } = {}) {
  let received = 0
  let failed = false
  const puts: Put[] = []
  const fn = vi.fn(async (_url: RequestInfo | URL, init: RequestInit = {}) => {
    const range = new Headers(init.headers).get('content-range')
    const body = init.body as Blob | null
    puts.push({ range, size: body?.size ?? 0 })
    if (opts.expire) return new Response('not found', { status: 404 })
    if (range?.startsWith('bytes */')) {
      return received >= total ? new Response(JSON.stringify({ id: 'drive-id' }), { status: 200 }) : new Response(null, { status: 308, headers: received ? { range: `bytes=0-${received - 1}` } : {} })
    }
    if (opts.failOnce !== undefined && !failed && puts.length - 1 === opts.failOnce) {
      failed = true
      throw new TypeError('Failed to fetch')
    }
    const [, start, end] = range!.match(/bytes (\d+)-(\d+)\//)!.map(Number)
    received = Math.max(received, end + 1)
    if (opts.confirmLess && puts.length === 1) received = start + opts.confirmLess
    if (received >= total) return new Response(JSON.stringify({ id: 'drive-id' }), { status: 201 })
    return new Response(null, { status: 308, headers: { range: `bytes=0-${received - 1}` } })
  })
  return { fetch: fn as unknown as typeof fetch, puts }
}

describe('RNF-06 · subida reanudable a Drive', () => {
  it('sube por partes con Content-Range y devuelve el id del archivo', async () => {
    const total = 20 * MB
    const server = resumableServer(total)
    const progress: number[] = []
    const r = await uploadResumable({ file: blob(total), uploadUrl: 'https://up/1', fetch: server.fetch, onProgress: (b) => progress.push(b) })
    expect(r).toEqual({ fileId: 'drive-id' })
    expect(server.puts.map((p) => p.range)).toEqual([`bytes 0-${8 * MB - 1}/${total}`, `bytes ${8 * MB}-${16 * MB - 1}/${total}`, `bytes ${16 * MB}-${total - 1}/${total}`])
    expect(progress.at(-1)).toBe(total)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
  })

  it('si Drive confirma menos bytes, reenvía desde donde quedó', async () => {
    const total = 10 * MB
    const server = resumableServer(total, { confirmLess: 5 * MB })
    await uploadResumable({ file: blob(total), uploadUrl: 'https://up/1', fetch: server.fetch })
    expect(server.puts[1].range).toBe(`bytes ${5 * MB}-${total - 1}/${total}`)
  })

  it('si se cae la red, pregunta a Drive cuánto llegó y continúa', async () => {
    const total = 20 * MB
    const server = resumableServer(total, { failOnce: 1 })
    const r = await uploadResumable({ file: blob(total), uploadUrl: 'https://up/1', fetch: server.fetch, retryDelayMs: 0 })
    expect(r.fileId).toBe('drive-id')
    expect(server.puts.some((p) => p.range === `bytes */${total}`)).toBe(true)
    expect(server.puts.at(-1)!.range).toBe(`bytes ${16 * MB}-${total - 1}/${total}`)
  })

  it('al reanudar después de cerrar la app primero consulta el estado', async () => {
    const server = resumableServer(MB)
    await uploadResumable({ file: blob(MB), uploadUrl: 'https://up/1', fetch: server.fetch, resume: true })
    expect(server.puts[0].range).toBe(`bytes */${MB}`)
  })

  it('una sesión vencida da un error claro para empezar de nuevo', async () => {
    const server = resumableServer(MB, { expire: true })
    await expect(uploadResumable({ file: blob(MB), uploadUrl: 'https://up/1', fetch: server.fetch })).rejects.toMatchObject({ code: 'sesion-vencida' })
    expect(new DriveUploadError('sesion-vencida')).toBeInstanceOf(Error)
  })

  it('se puede cancelar', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(uploadResumable({ file: blob(MB), uploadUrl: 'https://up/1', fetch: resumableServer(MB).fetch, signal: controller.signal })).rejects.toThrow(/abort/i)
  })
})

describe('Flujo completo de un archivo (Facade)', () => {
  const task = (size = 10 * MB): UploadTask<File> => ({
    id: 't1',
    file: new File([new Uint8Array(size)], 'IMG_1.HEIC', { type: 'image/heic' }),
    status: 'subiendo',
    uploadedBytes: 0,
    attempts: 0,
  })

  function deps(over: Partial<PipelineDeps> = {}): PipelineDeps & { log: string[] } {
    const log: string[] = []
    return {
      log,
      makeThumbnails: vi.fn(async () => {
        log.push('miniaturas')
        return { thumb: new Blob(['t']), preview: new Blob(['p']), width: 3024, height: 4032, dominantColor: '#123456', durationSec: null }
      }),
      uploadThumb: vi.fn(async (_b: Blob, variant: 'thumb' | 'preview') => {
        log.push(`cdn-${variant}`)
        return `https://cdn/${variant}.webp`
      }),
      initUpload: vi.fn(async () => {
        log.push('iniciar')
        return { uploadUrl: 'https://up/1', kind: 'photo' as const }
      }),
      uploadFile: vi.fn(async (_f: Blob, _u: string, o: { onProgress?: (n: number) => void }) => {
        log.push('drive')
        o.onProgress?.(5 * MB)
        return { fileId: 'drive-1' }
      }),
      register: vi.fn(async () => {
        log.push('registrar')
      }),
      ...over,
    }
  }

  it('genera miniaturas, sube al CDN y a Drive, y registra en orden', async () => {
    const d = deps()
    const progress: number[] = []
    await createPipelineUploader(d)(task(), { onProgress: (n) => progress.push(n), signal: new AbortController().signal })
    expect(d.log).toEqual(['miniaturas', 'cdn-thumb', 'cdn-preview', 'iniciar', 'drive', 'registrar'])
    expect(d.register).toHaveBeenCalledWith({
      driveFileId: 'drive-1',
      kind: 'photo',
      thumbUrl: 'https://cdn/thumb.webp',
      previewUrl: 'https://cdn/preview.webp',
      width: 3024,
      height: 4032,
      dominantColor: '#123456',
      durationSec: null,
      sizeBytes: 10 * MB,
    })
    expect(progress.at(-1)).toBe(10 * MB)
  })

  it('al reintentar no repite lo que ya estaba hecho y reanuda la misma sesión', async () => {
    let fail = true
    const d = deps({
      uploadFile: vi.fn(async (_f: Blob, _u: string, _o: { resume?: boolean }) => {
        if (fail) {
          fail = false
          throw new Error('red')
        }
        return { fileId: 'drive-1' }
      }),
    })
    const up = createPipelineUploader(d)
    const t = task()
    await expect(up(t, { onProgress: () => {}, signal: new AbortController().signal })).rejects.toThrow('red')
    await up(t, { onProgress: () => {}, signal: new AbortController().signal })
    expect(d.makeThumbnails).toHaveBeenCalledTimes(1)
    expect(d.initUpload).toHaveBeenCalledTimes(1)
    expect(vi.mocked(d.uploadFile).mock.calls[1][2]).toMatchObject({ resume: true })
  })

  it('si no se puede leer la imagen (por ejemplo HEIC en un PC) usa un placeholder y sube igual', async () => {
    const d = deps({ makeThumbnails: vi.fn(async () => Promise.reject(new Error('formato no soportado'))) })
    await createPipelineUploader(d)(task(), { onProgress: () => {}, signal: new AbortController().signal })
    expect(d.uploadThumb).not.toHaveBeenCalled()
    expect(d.register).toHaveBeenCalledWith(expect.objectContaining({ thumbUrl: PLACEHOLDERS.photo, previewUrl: null, dominantColor: '#fce1ea', width: 4, height: 5 }))
  })

  it('si la sesión de Drive venció, pide una nueva', async () => {
    let first = true
    const d = deps({
      uploadFile: vi.fn(async () => {
        if (first) {
          first = false
          throw new DriveUploadError('sesion-vencida')
        }
        return { fileId: 'drive-2' }
      }),
    })
    const up = createPipelineUploader(d)
    const t = task()
    await expect(up(t, { onProgress: () => {}, signal: new AbortController().signal })).rejects.toThrow()
    await up(t, { onProgress: () => {}, signal: new AbortController().signal })
    expect(d.initUpload).toHaveBeenCalledTimes(2)
  })
})
