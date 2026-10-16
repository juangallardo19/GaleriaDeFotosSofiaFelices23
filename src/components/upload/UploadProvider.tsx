'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { makeThumbnails } from '@/features/upload/browser-thumbnails'
import { uploadResumable } from '@/features/upload/drive-upload'
import { dedupeFiles, fingerprint } from '@/features/upload/fingerprint'
import { createPipelineUploader } from '@/features/upload/pipeline'
import { UploadQueue, type QueueSnapshot } from '@/features/upload/upload-queue'
import type { MediaKind } from '@/features/media/media-kind'
import { api, postJson } from '@/lib/api'
import { useUploadQueue } from '@/hooks/useUploadQueue'

export function createBrowserQueue() {
  const uploader = createPipelineUploader({
    makeThumbnails,
    uploadThumb: async (blob, variant) =>
      (await api<{ url: string }>(`/api/uploads/thumb?variant=${variant}`, { method: 'POST', headers: { 'content-type': blob.type }, body: blob })).url,
    initUpload: (file) => postJson<{ uploadUrl: string; kind: MediaKind }>('/api/uploads/init', { name: file.name, size: file.size, type: file.type }),
    uploadFile: (file, uploadUrl, opts) => uploadResumable({ file, uploadUrl, ...opts }),
    register: (payload) => postJson('/api/media', payload),
  })
  return new UploadQueue<File>({ uploader })
}

interface Uploads {
  snapshot: QueueSnapshot<File>
  add: (files: File[]) => number
  retry: (id: string) => void
  cancel: (id: string) => void
  dismiss: () => void
  dismissed: boolean
}

const UploadsContext = createContext<Uploads | null>(null)

const PROGRESS_PREFIX = /^\(\d+ %\) Subiendo · /
const pageTitle = () => document.title.replace(PROGRESS_PREFIX, '')

// La cola vive en la raíz de la app: al navegar entre páginas (sin recargar) las subidas siguen
export function UploadProvider({ children, createQueue = createBrowserQueue }: { children: ReactNode; createQueue?: () => UploadQueue<File> }) {
  const [queue] = useState(createQueue)
  const snapshot = useUploadQueue(queue, pageTitle)
  const seen = useRef(new Set<string>())
  const [dismissed, setDismissed] = useState(false)

  const add = useCallback(
    (files: File[]) => {
      const { unique, duplicates } = dedupeFiles(seen.current, files)
      unique.forEach((f) => seen.current.add(fingerprint(f)))
      if (unique.length > 0) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission().catch(() => {})
        queue.add(unique)
        queue.start()
        setDismissed(false)
      }
      return duplicates.length
    },
    [queue],
  )

  const value = useMemo<Uploads>(
    () => ({ snapshot, add, retry: (id) => queue.retry(id), cancel: (id) => queue.cancel(id), dismiss: () => setDismissed(true), dismissed }),
    [snapshot, add, queue, dismissed],
  )

  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>
}

export function useUploads(): Uploads {
  const ctx = useContext(UploadsContext)
  if (!ctx) throw new Error('useUploads debe usarse dentro de <UploadProvider>')
  return ctx
}
