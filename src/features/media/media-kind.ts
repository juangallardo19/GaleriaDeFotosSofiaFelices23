export type MediaKind = 'photo' | 'video'
export type RejectReason = 'tipo-no-soportado' | 'muy-grande' | 'vacio'

export const MAX_FILE_BYTES = 1024 ** 3
export const MAX_FILES_PER_BATCH = 30

const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/avif'])
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v'])
const PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'avif'])
const VIDEO_EXT = new Set(['mp4', 'mov', 'webm', '3gp', 'm4v'])

export interface FileLike {
  name: string
  type: string
  size: number
}

export type Classification = { ok: true; kind: MediaKind } | { ok: false; reason: RejectReason }

function kindOf(file: FileLike): MediaKind | null {
  const type = file.type.toLowerCase()
  if (PHOTO_MIME.has(type)) return 'photo'
  if (VIDEO_MIME.has(type)) return 'video'
  // iOS a veces entrega HEIC/MOV sin tipo MIME
  if (type === '' || type === 'application/octet-stream') {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (PHOTO_EXT.has(ext)) return 'photo'
    if (VIDEO_EXT.has(ext)) return 'video'
  }
  return null
}

export function classifyFile(file: FileLike): Classification {
  const kind = kindOf(file)
  if (!kind) return { ok: false, reason: 'tipo-no-soportado' }
  if (file.size <= 0) return { ok: false, reason: 'vacio' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'muy-grande' }
  return { ok: true, kind }
}

export function validateBatch<T extends FileLike>(files: T[]) {
  const accepted: { file: T; kind: MediaKind }[] = []
  const rejected: { file: T; reason: RejectReason }[] = []
  let overflow = 0
  for (const file of files) {
    const c = classifyFile(file)
    if (!c.ok) rejected.push({ file, reason: c.reason })
    else if (accepted.length >= MAX_FILES_PER_BATCH) overflow++
    else accepted.push({ file, kind: c.kind })
  }
  return { accepted, rejected, overflow }
}
