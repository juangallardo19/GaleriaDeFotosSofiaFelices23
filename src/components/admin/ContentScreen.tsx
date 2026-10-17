'use client'

import { useCallback, useEffect, useState } from 'react'
import { mediaQuery, patchItem, removeItem } from '@/features/gallery/gallery-state'
import type { PublicMedia } from '@/server/serialize'
import { api, postJson } from '@/lib/api'
import { inBatches } from '@/lib/batch'
import { formatDuration } from '@/lib/format'
import { SelectionBar } from '@/components/gallery/SelectionBar'
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
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(
    (from: string | null) => {
      api<{ items: PublicMedia[]; nextCursor: string | null }>(
        mediaQuery({ sort: 'recientes', filter: { kind, includeHidden: true }, cursor: from, limit: 48 }),
      ).then(
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

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function stopSelecting() {
    setSelecting(false)
    setSelected(new Set())
  }

  // Acciones sobre todo lo elegido; la selección grande se manda por partes
  async function runOnSelected(label: string, send: (group: string[]) => Promise<number>, apply: (ids: Set<string>) => void, done: (n: number) => string) {
    const ids = [...selected]
    setBusy(`${label}…`)
    try {
      const n = await inBatches(ids, send, (d, t) => setBusy(`${label} ${d} de ${t}…`))
      apply(new Set(ids))
      setNotice(done(n))
      stopSelecting()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo completar')
    } finally {
      setBusy(null)
    }
  }

  const hideSelected = (hidden: boolean) =>
    runOnSelected(
      hidden ? 'Ocultando' : 'Mostrando',
      async (group) => (await postJson<{ updated: number }>('/api/admin/media', { ids: group, hidden }, 'PATCH')).updated,
      (ids) => setItems((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, hidden } : m))),
      (n) => `${n === 1 ? '1 recuerdo' : `${n} recuerdos`} ${hidden ? 'ocultos' : 'visibles de nuevo'}`,
    )

  const deleteSelected = () =>
    runOnSelected(
      'Borrando',
      async (group) => (await postJson<{ removed: number }>('/api/media/borrar', { ids: group })).removed,
      (ids) => setItems((prev) => prev.filter((m) => !ids.has(m.id))),
      (n) => (n === 1 ? 'Se borró 1 recuerdo' : `Se borraron ${n} recuerdos`),
    )

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  // Los videos del iPhone pueden quedar sin vista previa: se usa la miniatura que Drive genera unos minutos después
  async function refreshVideoThumbs() {
    setBusy('vistas')
    try {
      const { updated, pending } = await postJson<{ updated: number; pending: number }>('/api/admin/media/vistas-previas', {})
      const done = updated === 1 ? '1 video con vista previa nueva.' : `${updated} videos con vista previa nueva.`
      const waiting = pending === 1 ? ' 1 sigue procesándose en Drive: intenta en unos minutos.' : ` ${pending} siguen procesándose en Drive: intenta en unos minutos.`
      setNotice(updated === 0 && pending === 0 ? 'Todos los videos ya tienen vista previa.' : `${done}${pending ? waiting : ''}`)
      if (updated) load(null)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudieron crear las vistas previas')
    } finally {
      setBusy(null)
    }
  }

  const visible = onlyHidden ? items.filter((m) => m.hidden) : items
  const hiddenCount = items.filter((m) => m.hidden).length

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="opcion min-h-10 rounded-chip px-3.5 text-[13px] font-medium hover:-translate-y-0.5 active:scale-95"
    >
      {label}
    </button>
  )

  return (
    <AdminShell
      title="Contenido"
      subtitle={`${items.length}${cursor ? '+' : ''} recuerdos · ${hiddenCount} ocultos`}
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void refreshVideoThumbs()} disabled={busy !== null} className={buttonClass('secondary')}>
            <Icon name="play" size={18} strokeWidth={2} />
            Vistas previas de videos
          </button>
          {folder && (
            <a href={folder} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
              <Icon name="folder" size={18} strokeWidth={2} />
              Abrir carpeta en Drive
            </a>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        {chip('Todo', !kind && !onlyHidden, () => (pickKind(undefined), setOnlyHidden(false)))}
        {chip('Fotos', kind === 'photo', () => pickKind('photo'))}
        {chip('Videos', kind === 'video', () => pickKind('video'))}
        {chip(`Ocultos (${hiddenCount})`, onlyHidden, () => setOnlyHidden((v) => !v))}
        {items.length > 0 && chip('Seleccionar', selecting, () => (selecting ? stopSelecting() : setSelecting(true)))}
      </div>
      {error && <p className="mt-4 text-sm text-fucsia">{error}</p>}
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((m) => (
          <li key={m.id} className="aparecer group">
            <div
              className={`relative aspect-square overflow-hidden rounded-[18px] transition-[transform,box-shadow] duration-300 ${
                selected.has(m.id) ? 'scale-[0.95] outline-2 outline-offset-2 outline-fucsia' : 'group-hover:-translate-y-1 group-hover:shadow-[0_14px_28px_rgb(90_18_56/0.15)]'
              }`}
              style={{ backgroundColor: m.dominantColor }}
            >
              {selecting && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected.has(m.id)}
                  aria-label={`Seleccionar ${m.kind === 'video' ? 'video' : 'foto'} de ${m.author.name}`}
                  onClick={() => toggleSelected(m.id)}
                  className="absolute inset-0 z-20 cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border-2 shadow-sm ${selected.has(m.id) ? 'border-white bg-fucsia text-white' : 'border-white bg-black/20'}`}
                  >
                    {selected.has(m.id) && <Icon name="check" size={16} strokeWidth={3} />}
                  </span>
                  {selected.has(m.id) && <span className="absolute inset-0 bg-fucsia/15" />}
                </button>
              )}
              <img
                src={m.thumbUrl}
                alt={`${m.kind === 'video' ? 'Video' : 'Foto'} de ${m.author.name}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
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
              <div className={`absolute bottom-2 right-2 flex gap-1.5 ${selecting ? 'hidden' : ''}`}>
                <button
                  type="button"
                  aria-label={m.hidden ? `Mostrar recuerdo de ${m.author.name}` : `Ocultar recuerdo de ${m.author.name}`}
                  onClick={() => void setHidden(m.id, !m.hidden)}
                  className="flex size-9 items-center justify-center rounded-xl bg-crema/92"
                >
                  <Icon name={m.hidden ? 'eye' : 'eyeOff'} size={16} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label={`Borrar recuerdo de ${m.author.name}`}
                  onClick={() => void remove(m.id)}
                  className="flex size-9 items-center justify-center rounded-xl bg-crema/92"
                >
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
      {selecting && <div aria-hidden="true" className="h-40" />}
      {selecting && (
        <SelectionBar
          count={selected.size}
          total={visible.length}
          busy={busy}
          onSelectAll={() => setSelected(new Set(visible.map((m) => m.id)))}
          onClear={() => setSelected(new Set())}
          onCancel={stopSelecting}
          onHide={() => void hideSelected(true)}
          onShow={() => void hideSelected(false)}
          onDelete={() => void deleteSelected()}
        />
      )}
      {notice && (
        <p role="status" className="aparecer fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm rounded-2xl bg-vino px-4 py-3 text-center text-sm text-crema shadow-xl">
          {notice}
        </p>
      )}
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
