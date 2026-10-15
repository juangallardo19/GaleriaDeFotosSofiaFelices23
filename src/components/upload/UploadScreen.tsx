'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { makeThumbnails } from '@/features/upload/browser-thumbnails'
import { uploadResumable } from '@/features/upload/drive-upload'
import { dedupeFiles, fingerprint } from '@/features/upload/fingerprint'
import { createPipelineUploader } from '@/features/upload/pipeline'
import { UploadQueue } from '@/features/upload/upload-queue'
import type { MediaKind } from '@/features/media/media-kind'
import { api, postJson } from '@/lib/api'
import { SITE_TITLE } from '@/lib/event'
import { useUploadQueue } from '@/hooks/useUploadQueue'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { UploadList } from './UploadList'
import { UploadPicker } from './UploadPicker'

function createQueue() {
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

export function UploadScreen() {
  const queue = useMemo(() => createQueue(), [])
  const snapshot = useUploadQueue(queue, `Subir recuerdos · ${SITE_TITLE}`)
  const seen = useRef(new Set<string>())
  const [skipped, setSkipped] = useState(0)

  function select(files: File[]) {
    const { unique, duplicates } = dedupeFiles(seen.current, files)
    unique.forEach((f) => seen.current.add(fingerprint(f)))
    setSkipped(duplicates.length)
    if (unique.length === 0) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission().catch(() => {})
    queue.add(unique)
    queue.start()
  }

  const finished = snapshot.isIdle && snapshot.done > 0

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-16">
      <UploadPicker onSelect={select} />
      {skipped > 0 && (
        <p className="text-center text-xs opacity-70">{skipped === 1 ? 'Un archivo ya estaba en la lista.' : `${skipped} archivos ya estaban en la lista.`}</p>
      )}
      {snapshot.tasks.length === 0 && (
        <Reveal delay={240}>
          <ul className="flex flex-col gap-2.5 rounded-panel border border-linea bg-white/70 p-5 text-sm">
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Puedes elegir hasta 30 fotos y videos a la vez, de hasta 1 GB cada uno.
            </li>
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Se suben en su calidad original. Si se cae el internet, sigue desde donde iba.
            </li>
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Deja esta página abierta mientras sube; te avisamos cuando termine.
            </li>
          </ul>
        </Reveal>
      )}
      <UploadList snapshot={snapshot} onRetry={(id) => queue.retry(id)} onCancel={(id) => queue.cancel(id)} />
      {finished && (
        <div className="entrada flex flex-col items-center gap-3 rounded-panel bg-rosa/80 p-6 text-center [--animacion:entrar-pop]">
          <p className="font-script text-5xl text-fucsia">¡Gracias!</p>
          <p className="text-sm">
            {snapshot.done === 1 ? 'Tu recuerdo ya está en el álbum de Sofi.' : `Tus ${snapshot.done} recuerdos ya están en el álbum de Sofi.`}
          </p>
          <Link href="/" className={buttonClass('primary', 'mt-1')}>
            Ver el álbum
          </Link>
        </div>
      )}
    </div>
  )
}
