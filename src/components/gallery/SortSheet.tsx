'use client'

import { useState } from 'react'
import type { SortKey } from '@/features/gallery/sort'
import type { GalleryFilter } from '@/features/gallery/types'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Portal } from '@/components/ui/Portal'

export const SORT_LABELS: Record<SortKey, string> = {
  recientes: 'Más recientes',
  antiguos: 'Más antiguos',
  likes: 'Más likes',
  comentarios: 'Más comentarios',
  descargas: 'Más descargas',
}

interface Props {
  open: boolean
  sort: SortKey
  filter: GalleryFilter
  onApply: (sort: SortKey, filter: GalleryFilter) => void
  onClose: () => void
  readOnly?: boolean
}

function clean(filter: GalleryFilter): GalleryFilter {
  const out: GalleryFilter = {}
  if (filter.kind) out.kind = filter.kind
  if (filter.mine) out.mine = true
  if (filter.liked) out.liked = true
  return out
}

function Toggle({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="opcion min-h-11 rounded-chip px-4 text-[13px] font-medium hover:-translate-y-0.5 active:scale-95"
    >
      {label}
    </button>
  )
}

export function SortSheet({ open, sort, filter, onApply, onClose, readOnly = false }: Props) {
  const [draftSort, setDraftSort] = useState(sort)
  const [draft, setDraft] = useState<GalleryFilter>(filter)

  if (!open) return null

  const toggleKind = (kind: 'photo' | 'video') => setDraft((f) => ({ ...f, kind: f.kind === kind ? undefined : kind }))

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
        <div className="absolute inset-0 bg-[#3A0B24]/45" onClick={onClose} aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ordenar y filtrar"
          className="aparecer relative w-full max-w-md rounded-t-panel bg-crema bg-[url('/assets/papel.jpg')] bg-[length:512px] p-6 pb-8 md:rounded-panel"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ordenar y filtrar</h2>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-11 items-center justify-center rounded-[15px]">
              <Icon name="close" size={20} strokeWidth={2} />
            </button>
          </div>

          <div role="radiogroup" aria-label="Ordenar por" className="mt-4 flex flex-col gap-1">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <label
                key={key}
                className="opcion-ligera flex min-h-11 cursor-pointer items-center gap-3 rounded-boton px-3 text-sm"
              >
                <input type="radio" name="orden" value={key} checked={draftSort === key} onChange={() => setDraftSort(key)} className="size-4 accent-fucsia" />
                {SORT_LABELS[key]}
              </label>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide opacity-60">Mostrar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Toggle label="Fotos" pressed={draft.kind === 'photo'} onClick={() => toggleKind('photo')} />
            <Toggle label="Videos" pressed={draft.kind === 'video'} onClick={() => toggleKind('video')} />
            {!readOnly && (
              <>
                <Toggle label="Mis recuerdos" pressed={!!draft.mine} onClick={() => setDraft((f) => ({ ...f, mine: !f.mine }))} />
                <Toggle label="Mis likes" pressed={!!draft.liked} onClick={() => setDraft((f) => ({ ...f, liked: !f.liked }))} />
              </>
            )}
          </div>

          <div className="mt-7 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setDraftSort('recientes')
                setDraft({})
              }}
            >
              Limpiar
            </Button>
            <Button className="flex-1" onClick={() => onApply(draftSort, clean(draft))}>
              Ver recuerdos
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
