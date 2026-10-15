import { CHUNK_SIZE, contentRangeHeader, nextOffsetFromRange } from './chunker'

export type DriveUploadErrorCode = 'sesion-vencida' | 'rechazado' | 'sin-conexion'

export class DriveUploadError extends Error {
  constructor(
    readonly code: DriveUploadErrorCode,
    message: string = code,
  ) {
    super(message)
    this.name = 'DriveUploadError'
  }
}

export interface ResumableOptions {
  file: Blob
  uploadUrl: string
  fetch?: typeof fetch
  chunkSize?: number
  onProgress?: (uploadedBytes: number) => void
  signal?: AbortSignal
  resume?: boolean
  maxStatusChecks?: number
  retryDelayMs?: number
}

type Step = { done: true; fileId: string } | { done: false; offset: number }

function abortError(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason : new DOMException('This operation was aborted', 'AbortError')
}

async function interpret(res: Response): Promise<Step> {
  if (res.status === 200 || res.status === 201) {
    const body = (await res.json().catch(() => ({}))) as { id?: string }
    if (!body.id) throw new DriveUploadError('rechazado', 'Drive no devolvió el id del archivo')
    return { done: true, fileId: body.id }
  }
  if (res.status === 308) return { done: false, offset: nextOffsetFromRange(res.headers.get('range')) }
  if (res.status === 404 || res.status === 410) throw new DriveUploadError('sesion-vencida', 'La sesión de subida venció')
  throw new DriveUploadError('rechazado', `Drive respondió ${res.status}`)
}

export async function uploadResumable(opts: ResumableOptions): Promise<{ fileId: string }> {
  const fetchFn = opts.fetch ?? fetch
  const size = opts.chunkSize ?? CHUNK_SIZE
  const total = opts.file.size
  const signal = opts.signal
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const status = async (): Promise<Step> => {
    const res = await fetchFn(opts.uploadUrl, { method: 'PUT', headers: { 'content-range': `bytes */${total}` }, signal })
    return interpret(res)
  }

  if (signal?.aborted) throw abortError(signal)
  let offset = 0
  if (opts.resume) {
    const s = await status()
    if (s.done) return { fileId: s.fileId }
    offset = s.offset
    opts.onProgress?.(offset)
  }

  let checks = 0
  while (offset < total) {
    if (signal?.aborted) throw abortError(signal)
    const end = Math.min(offset + size, total) - 1
    let step: Step
    try {
      const res = await fetchFn(opts.uploadUrl, {
        method: 'PUT',
        headers: { 'content-range': contentRangeHeader(offset, end, total) },
        body: opts.file.slice(offset, end + 1),
        signal,
      })
      step = await interpret(res)
      checks = 0
    } catch (err) {
      if (signal?.aborted) throw abortError(signal)
      if (err instanceof DriveUploadError) throw err
      // Se cayó la red: preguntar a Drive cuántos bytes alcanzó a recibir y seguir desde ahí
      if (++checks > (opts.maxStatusChecks ?? 3)) throw new DriveUploadError('sin-conexion', 'Sin conexión con Drive')
      await wait(opts.retryDelayMs ?? 1500 * checks)
      step = await status().catch((e) => {
        if (e instanceof DriveUploadError) throw e
        return { done: false, offset } as Step
      })
    }
    if (step.done) {
      opts.onProgress?.(total)
      return { fileId: step.fileId }
    }
    offset = step.offset
    opts.onProgress?.(offset)
  }
  throw new DriveUploadError('rechazado', 'Drive no confirmó el final de la subida')
}
