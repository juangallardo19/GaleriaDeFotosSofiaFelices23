'use client'

import { useState } from 'react'
import { formatBytes } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export type DownloadChoice = 'todo' | 'fotos' | 'mios' | 'likes'

export interface DownloadStats {
  total: number
  totalBytes: number
  photos: number
  photosBytes: number
  mine: number
  liked: number
}

interface Props {
  open: boolean
  folderUrl: string | null
  photosUrl?: string | null
  stats: DownloadStats
  onClose: () => void
  onDownloadSet?: (choice: 'mios' | 'likes') => void
  readOnly?: boolean
  busy?: string | null
  asPage?: boolean
}

const recuerdos = (n: number) => (n === 1 ? '1 recuerdo' : `${n} recuerdos`)

export function DownloadSheet({ open, folderUrl, photosUrl, stats, onClose, onDownloadSet, readOnly = false, busy = null, asPage = false }: Props) {
  const [choice, setChoice] = useState<DownloadChoice>('todo')
  if (!open) return null

  const options: { id: DownloadChoice; title: string; detail: string }[] = [
    { id: 'todo', title: 'Todo el álbum', detail: `${recuerdos(stats.total)} · ${formatBytes(stats.totalBytes)}` },
    { id: 'fotos', title: 'Solo fotos', detail: `${stats.photos === 1 ? '1 foto' : `${stats.photos} fotos`} · ${formatBytes(stats.photosBytes)}` },
  ]
  if (!readOnly) {
    options.push({ id: 'mios', title: 'Mis recuerdos', detail: recuerdos(stats.mine) }, { id: 'likes', title: 'Mis likes', detail: recuerdos(stats.liked) })
  }

  function download() {
    if (choice === 'todo' && folderUrl) window.open(folderUrl, '_blank', 'noopener')
    else if (choice === 'fotos' && (photosUrl ?? folderUrl)) window.open((photosUrl ?? folderUrl)!, '_blank', 'noopener')
    else if (choice === 'mios' || choice === 'likes') onDownloadSet?.(choice)
  }

  const body = (
    <div className={asPage ? '' : 'aparecer relative w-full max-w-md rounded-t-panel bg-crema bg-[url(/assets/papel.jpg)] bg-[length:512px] p-6 pb-8 md:rounded-panel'}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">Descargar el álbum</h2>
        {!asPage && (
          <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-11 items-center justify-center rounded-[15px]">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        )}
      </div>
      <p className="mt-1 text-sm opacity-75">Los originales, en su calidad completa.</p>
      <div role="radiogroup" aria-label="Qué quieres descargar" className="mt-5 flex flex-col gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${choice === o.id ? 'border-fucsia bg-rosa/70' : 'border-linea bg-white/70'}`}
          >
            <input type="radio" name="descarga" checked={choice === o.id} onChange={() => setChoice(o.id)} className="size-4 accent-fucsia" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{o.title}</span>
              <span className="text-xs opacity-70">{o.detail}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed opacity-70">
        {choice === 'todo' || choice === 'fotos'
          ? 'Se abre la carpeta en Google Drive: toca los tres puntos y luego "Descargar" para bajarla completa en un .zip.'
          : 'Se descargan uno por uno. Si el navegador pregunta, permite las descargas múltiples.'}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button icon="download" onClick={download} disabled={!!busy}>
          {busy ?? 'Descargar'}
        </Button>
        {folderUrl && (
          <a href={folderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-fucsia underline-offset-4 hover:underline">
            <Icon name="folder" size={18} strokeWidth={2} />
            Abrir en Google Drive
          </a>
        )}
      </div>
    </div>
  )

  if (asPage) return body
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-[#3A0B24]/45" onClick={onClose} aria-hidden="true" />
      {body}
    </div>
  )
}
