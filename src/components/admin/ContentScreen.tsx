'use client'

import { useCallback, useEffect, useState } from 'react'
import { mediaQuery, patchItem, removeItem } from '@/features/gallery/gallery-state'
import type { PublicMedia } from '@/server/serialize'
import { api, postJson } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AdminShell } from './AdminShell'

type Kind = 'photo' | 'video' | undefined

export function ContentScreen() {
  const [items, setItems] = useState<PublicMedia[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<Kind>(undefined)
  const [onlyHidden, setOnlyHidden] = useState(false)
  const [folder, setFolder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (from: string | null) => {
      api<{ items: PublicMedia[]; nextCursor: string | null }>(mediaQuery({ sort: 'recientes', filter: { kind, includeHidden: true }, cursor: from, limit: 48 })).then(
        (page) => {
          setItems((prev) => (from ? [...prev, ...page.items] : page.items))
          setCursor(page.nextCursor)
          setLoading(false)
        },
        (err) => {
          setError(err instanceof Error ? err.message : 'No se pudo cargar')
          setLoading(false)
        },
      )
    },
    [kind],
  )

  useEffect(() => {
    const t = setTimeout(() => load(null), 0)
    return () => clearTimeout(t)
  }, [load])

  function pickKind(next: Kind) {
    setKind(next)
    setItems([])
    setLoading(true)
  }

  useEffect(() => {
    api<{ folders: { all: string } | null }>('/api/media/resumen')
      .then((r) => setFolder(r.folders?.all ?? null))
      .catch(() => {})
  }, [])

  async function setHidden(id: string, hidden: boolean) {
    await postJson(`/api/admin/media/${id}`, { hidden }, 'PATCH')
    setItems((prev) => patchItem(prev, id, { hidden }))
  }

  async function remove(id: string) {
    if (!window.confirm('¿Borrar este recuerdo para siempre? También se borra de Drive.')) return
    await api(`/api/media/${id}`, { method: 'DELETE' })
    setItems((prev) => removeItem(prev, id))
  }

  const visible = onlyHidden ? items.filter((m) => m.hidden) : items
  const hiddenCount = items.filter((m) => m.hidden).length

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-chip border px-3.5 text-[13px] ${active ? 'border-fucsia bg-rosa font-semibold text-fucsia' : 'border-vino/20 bg-white/60 font-medium'}`}
    >
      {label}
    </button>
  )

  return (
    <AdminShell
      title="Contenido"
      subtitle={`${items.length}${cursor ? '+' : ''} recuerdos · ${hiddenCount} ocultos`}
      actions={
        folder && (
          <a href={folder} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
            <Icon name="folder" size={18} strokeWidth={2} />
            Abrir carpeta en Drive
          </a>
        )
      }
    >
      <div className="flex flex-wrap gap-2">
        {chip('Todo', !kind && !onlyHidden, () => (pickKind(undefined), setOnlyHidden(false)))}
        {chip('Fotos', kind === 'photo', () => pickKind('photo'))}
        {chip('Videos', kind === 'video', () => pickKind('video'))}
        {chip(`Ocultos (${hiddenCount})`, onlyHidden, () => setOnlyHidden((v) => !v))}
      </div>
      {error && <p className="mt-4 text-sm text-fucsia">{error}</p>}
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((m) => (
          <li key={m.id}>
            <div className="relative aspect-square overflow-hidden rounded-[18px]" style={{ backgroundColor: m.dominantColor }}>
              <img src={m.thumbUrl} alt={`${m.kind === 'video' ? 'Video' : 'Foto'} de ${m.author.name}`} loading="lazy" className="h-full w-full object-cover" />
              {m.hidden && <div className="absolute inset-0 bg-crema/65" />}
              <div className="absolute left-2 top-2 flex gap-1.5">
                {m.hidden && (
                  <span className="inline-flex items-center gap-1 rounded-[10px] bg-vino/85 px-2 py-1 text-[11px] font-semibold text-white">
                    <Icon name="eyeOff" size={13} strokeWidth={2} />
                    Oculto
                  </span>
                )}
                {m.kind === 'video' && (
                  <span className="inline-flex items-center gap-1 rounded-[9px] bg-[#2A0A1B]/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Icon name="play" size={10} filled />
                    {m.durationSec !== null ? formatDuration(m.durationSec) : 'Video'}
                  </span>
                )}
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  aria-label={m.hidden ? `Mostrar recuerdo de ${m.author.name}` : `Ocultar recuerdo de ${m.author.name}`}
                  onClick={() => void setHidden(m.id, !m.hidden)}
                  className="flex size-9 items-center justify-center rounded-xl bg-crema/92"
                >
                  <Icon name={m.hidden ? 'eye' : 'eyeOff'} size={16} strokeWidth={2} />
                </button>
                <button type="button" aria-label={`Borrar recuerdo de ${m.author.name}`} onClick={() => void remove(m.id)} className="flex size-9 items-center justify-center rounded-xl bg-crema/92">
                  <Icon name="trash" size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
            <p className="mt-1.5 truncate px-1 text-xs font-semibold opacity-80">{m.author.name}</p>
          </li>
        ))}
      </ul>
      {!loading && visible.length === 0 && <p className="py-10 text-center text-sm opacity-65">No hay recuerdos aquí todavía.</p>}
      {loading && <div className="shimmer mt-6 h-40 rounded-card" aria-hidden="true" />}
      {cursor && !loading && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => (setLoading(true), load(cursor))} className={buttonClass('secondary')}>
            Cargar más
          </button>
        </div>
      )}
    </AdminShell>
  )
}
