'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { MediaKind } from '@/features/media/media-kind'
import { NEEDS_QR } from '@/lib/messages'
import { timeAgo } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Portal } from '@/components/ui/Portal'

export interface ViewerMedia {
  id: string
  kind: MediaKind
  thumbUrl: string
  previewUrl: string | null
  streamUrl: string | null
  downloadPath: string
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
  author: { id: string; name: string }
  likesCount: number
  commentsCount: number
  downloadsCount: number
  likedByViewer: boolean
  createdAt: string
}

interface Props {
  media: ViewerMedia
  position?: string
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onToggleLike: (id: string) => void
  onDelete?: (id: string) => void
  readOnly?: boolean
  children?: ReactNode
}

function driveFileId(streamUrl: string): string | null {
  return /\/files\/([^/?]+)/.exec(streamUrl)?.[1] ?? null
}

function VideoPlayer({ media }: { media: ViewerMedia }) {
  const [fallback, setFallback] = useState(false)
  const id = media.streamUrl ? driveFileId(media.streamUrl) : null
  if (fallback && id) {
    return (
      <iframe
        title={`Video de ${media.author.name}`}
        src={`https://drive.google.com/file/d/${id}/preview`}
        allow="autoplay; fullscreen"
        allowFullScreen
        className="aspect-video w-full rounded-2xl border-0 bg-black"
      />
    )
  }
  return (
    <video
      data-testid="video-player"
      key={media.id}
      src={media.streamUrl ?? undefined}
      poster={media.thumbUrl}
      preload="metadata"
      controls
      playsInline
      onError={() => setFallback(true)}
      className="max-h-[70dvh] w-full rounded-2xl bg-black object-contain"
    />
  )
}

export function MediaViewer({ media, position, onClose, onPrev, onNext, onToggleLike, onDelete, readOnly = false, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext, onClose])

  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const name = media.author.name

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label={`Recuerdo de ${name}`} className="fixed inset-0 z-50 overflow-y-auto bg-[#2A0A1B]/92 text-crema">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col px-3 pb-8 pt-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={name} size={34} />
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs opacity-70">{timeAgo(new Date(media.createdAt))}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {position && <span className="text-xs font-semibold opacity-75">{position}</span>}
              <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-11 items-center justify-center rounded-[15px] bg-white/10">
                <Icon name="close" size={22} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="relative mt-3 flex flex-1 items-center justify-center">
            {media.kind === 'video' ? (
              <VideoPlayer media={media} />
            ) : (
              <img
                key={media.id}
                src={media.previewUrl ?? media.thumbUrl}
                alt={`Foto de ${name}`}
                className="max-h-[72dvh] w-auto max-w-full rounded-2xl object-contain"
                style={{ backgroundColor: media.dominantColor }}
              />
            )}
            <button
              type="button"
              aria-label="Recuerdo anterior"
              onClick={onPrev}
              className="absolute left-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 md:-left-2"
            >
              <Icon name="chevronLeft" size={22} />
            </button>
            <button
              type="button"
              aria-label="Siguiente recuerdo"
              onClick={onNext}
              className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 md:-right-2"
            >
              <Icon name="chevronLeft" size={22} className="rotate-180" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {readOnly ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-boton bg-white/10 px-4 text-sm font-semibold">
                <Icon name="heart" size={18} />
                {media.likesCount}
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Me gusta · ${media.likesCount}`}
                aria-pressed={media.likedByViewer}
                onClick={() => onToggleLike(media.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-boton px-4 text-sm font-semibold transition-transform active:scale-95 ${media.likedByViewer ? 'bg-fucsia text-white' : 'bg-white/10'}`}
              >
                <Icon name="heart" size={18} filled={media.likedByViewer} />
                {media.likesCount}
              </button>
            )}
            <a
              href={media.downloadPath}
              aria-label={`Descargar · ${media.downloadsCount}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-boton bg-crema px-4 text-sm font-semibold text-fucsia"
            >
              <Icon name="download" size={18} strokeWidth={2} />
              Descargar · {media.downloadsCount}
            </a>
            {onDelete && (
              <button
                type="button"
                onClick={() => window.confirm('¿Borrar este recuerdo del álbum? No se puede deshacer.') && onDelete(media.id)}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-boton px-3 text-sm font-semibold opacity-80 hover:bg-white/10"
              >
                <Icon name="trash" size={18} strokeWidth={2} />
                Borrar
              </button>
            )}
          </div>
          {readOnly && <p className="mt-3 rounded-2xl bg-white/10 p-3 text-sm">{NEEDS_QR}</p>}
          {children}
        </div>
      </div>
    </Portal>
  )
}
