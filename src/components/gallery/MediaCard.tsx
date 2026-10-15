'use client'

import { useState } from 'react'
import type { MediaKind } from '@/features/media/media-kind'
import { formatDuration } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'

export interface CardMedia {
  id: string
  kind: MediaKind
  thumbUrl: string
  width: number
  height: number
  dominantColor: string
  durationSec: number | null
  author: { name: string }
  likesCount: number
  commentsCount: number
  downloadsCount: number
  likedByViewer: boolean
}

export type TapePosition = 'top' | 'tr' | 'tl'

const TAPE_STYLE: Record<TapePosition, string> = {
  top: 'left-1/2 -top-2.5 w-16 -translate-x-1/2 -rotate-6',
  tr: '-right-3 top-2 w-16 rotate-[38deg]',
  tl: '-left-3 top-2 w-16 -rotate-[38deg]',
}

interface Props {
  media: CardMedia
  onOpen: (id: string) => void
  onToggleLike: (id: string) => void
  tape?: TapePosition
  tapeColor?: string
  readOnly?: boolean
}

export function MediaCard({ media, onOpen, onToggleLike, tape, tapeColor = '#F7B8CF', readOnly = false }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [beat, setBeat] = useState(0)
  const word = media.kind === 'video' ? 'Video' : 'Foto'
  const name = media.author.name
  const frameHeight = Math.round(Math.min(media.height, media.width * 1.6)) || 5
  const frameWidth = media.width || 4

  return (
    <article className="sombra-card group relative rounded-card border border-oro/35 bg-[#FFFDFB]/95 p-[7px] pb-2.5 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:rotate-[-0.6deg] hover:shadow-[0_18px_34px_rgb(90_18_56/0.16)]">
      {tape && (
        <span
          data-testid="washi-tape"
          aria-hidden="true"
          className={`absolute z-10 h-[18px] rounded-[1px] opacity-80 shadow-sm transition-transform duration-300 group-hover:scale-110 ${TAPE_STYLE[tape]}`}
          style={{ backgroundColor: tapeColor }}
        />
      )}
      <button type="button" aria-label={`Abrir ${word.toLowerCase()} de ${name}`} onClick={() => onOpen(media.id)} className="block w-full cursor-zoom-in">
        <div
          data-testid="media-frame"
          className="relative overflow-hidden rounded-2xl"
          style={{ aspectRatio: `${frameWidth} / ${frameHeight}`, backgroundColor: media.dominantColor }}
        >
          <img
            src={media.thumbUrl}
            alt={`${word} de ${name}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.05] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {media.kind === 'video' && (
            <>
              <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex size-[42px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-crema/90 text-naranja shadow-[0_3px_0_rgb(90_18_56/0.2)] transition-transform duration-300 group-hover:scale-115">
                <Icon name="play" size={20} filled />
              </span>
              {media.durationSec !== null && (
                <span className="absolute left-2 top-2 rounded-[9px] bg-[#2A0A1B]/55 px-2 py-0.5 text-[10px] font-semibold text-white">{formatDuration(media.durationSec)}</span>
              )}
            </>
          )}
        </div>
      </button>
      <div className="mt-2 flex items-center gap-[7px] px-1">
        <Avatar name={name} size={22} />
        <span className="truncate text-[11.5px] font-semibold">{name}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 px-1 text-[11.5px] font-semibold">
        <span className={`flex items-center gap-1 ${media.likedByViewer ? 'text-fucsia' : ''}`}>
          {readOnly ? (
            <Icon name="heart" size={16} />
          ) : (
            <button
              type="button"
              aria-label="Me gusta"
              aria-pressed={media.likedByViewer}
              onClick={() => {
                setBeat((b) => b + 1)
                onToggleLike(media.id)
              }}
              className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2 transition-transform hover:scale-125 active:scale-90"
            >
              <span key={beat} className={beat ? 'latido' : ''}>
                <Icon name="heart" size={16} filled={media.likedByViewer} />
              </span>
            </button>
          )}
          <span aria-label={`${media.likesCount} me gusta`}>{media.likesCount}</span>
        </span>
        <span className="flex items-center gap-1 opacity-85">
          <Icon name="comment" size={16} />
          <span aria-label={`${media.commentsCount} comentarios`}>{media.commentsCount}</span>
        </span>
        <span className="flex items-center gap-1 opacity-85">
          <Icon name="download" size={16} />
          <span aria-label={`${media.downloadsCount} descargas`}>{media.downloadsCount}</span>
        </span>
      </div>
    </article>
  )
}
