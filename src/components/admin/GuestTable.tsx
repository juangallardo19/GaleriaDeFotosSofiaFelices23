'use client'

import { Fragment, useMemo, useState, type FormEvent } from 'react'
import { normalizeSearch } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'

export interface GuestRow {
  id: string
  name: string
  url: string
  online: boolean
  entered: boolean
  uploads: number
}

type Filter = 'todos' | 'entraron' | 'faltan'

interface Props {
  rows: GuestRow[]
  onShowQr: (id: string) => void
  onDelete: (id: string) => void
  onRename?: (id: string, name: string) => Promise<void>
}

const ICON_BUTTON =
  'flex size-10 items-center justify-center rounded-xl border border-fucsia/25 bg-crema transition-[transform,background-color] hover:scale-110 hover:bg-rosa active:scale-95'

function NameEditor({ row, onSave, onCancel }: { row: GuestRow; onSave: (name: string) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState(row.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const name = draft.trim().replace(/\s+/g, ' ')
  const blocked = !name || name === row.name || saving

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (blocked) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          aria-label={`Nuevo nombre de ${row.name}`}
          value={draft}
          maxLength={60}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          className="min-h-10 w-full min-w-0 rounded-xl border border-fucsia/50 bg-white px-3 text-sm font-semibold outline-fucsia"
        />
        <button type="submit" aria-label="Guardar nombre" disabled={blocked} className={`${ICON_BUTTON} shrink-0 disabled:opacity-40 disabled:hover:scale-100`}>
          <Icon name="check" size={17} strokeWidth={2.4} />
        </button>
        <button type="button" aria-label="Cancelar edición" onClick={onCancel} className={`${ICON_BUTTON} shrink-0`}>
          <Icon name="close" size={17} strokeWidth={2} />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-fucsia">
          {error}
        </p>
      )}
    </form>
  )
}

export function GuestTable({ rows, onShowQr, onDelete, onRename }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')

  const visible = useMemo(() => {
    const q = normalizeSearch(query)
    return rows.filter((r) => (!q || normalizeSearch(r.name).includes(q)) && (filter === 'todos' || (filter === 'entraron' ? r.entered : !r.entered)))
  }, [rows, query, filter])

  const chip = (id: Filter, label: string) => (
    <button
      type="button"
      aria-pressed={filter === id}
      onClick={() => setFilter(id)}
      className="opcion min-h-10 rounded-chip px-3.5 text-[13px] font-medium hover:-translate-y-0.5 active:scale-95"
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 opacity-55">
            <Icon name="search" size={18} strokeWidth={2} />
          </span>
          <input
            type="search"
            aria-label="Buscar invitado"
            placeholder="Buscar invitado…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 w-full rounded-2xl border border-linea bg-white/85 pl-10 pr-3 text-sm outline-fucsia"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {chip('todos', 'Todos')}
          {chip('entraron', 'Ya entraron')}
          {chip('faltan', 'Aún no entran')}
        </div>
      </div>

      <div className="tarjeta overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-rosa/50 text-[12.5px] font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3 opacity-65">
                Invitado
              </th>
              <th scope="col" className="px-4 py-3 opacity-65">
                Estado
              </th>
              <th scope="col" className="hidden px-4 py-3 opacity-65 sm:table-cell">
                Recuerdos
              </th>
              <th scope="col" className="px-4 py-3 text-right opacity-65">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <Fragment key={r.id}>
                <tr className={`border-t border-linea transition-colors hover:bg-rosa/30 ${editing === r.id ? 'bg-rosa/30' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="relative">
                        <Avatar name={r.name} size={34} />
                        {r.online && (
                          <span title="En línea ahora" className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#2fb36b]" />
                        )}
                      </span>
                      <span className="font-semibold">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${r.entered ? 'bg-[#e3f5ea] text-[#23784a]' : 'bg-vino/8 opacity-70'}`}
                    >
                      {r.entered ? 'Entró' : 'Aún no entra'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">{r.uploads}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        aria-label={`Ver QR de ${r.name}`}
                        onClick={() => onShowQr(r.id)}
                        className="flex size-10 items-center justify-center rounded-xl border border-fucsia/25 bg-crema transition-[transform,background-color] hover:scale-110 hover:bg-rosa active:scale-95"
                      >
                        <Icon name="qr" size={17} strokeWidth={2} />
                      </button>
                      {onRename && (
                        <button type="button" aria-label={`Editar a ${r.name}`} onClick={() => setEditing(r.id)} className={ICON_BUTTON}>
                          <Icon name="edit" size={17} strokeWidth={2} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Eliminar a ${r.name}`}
                        onClick={() => window.confirm(`¿Eliminar a ${r.name}? Su QR dejará de funcionar.`) && onDelete(r.id)}
                        className="flex size-10 items-center justify-center rounded-xl border border-fucsia/25 bg-crema transition-[transform,background-color] hover:scale-110 hover:bg-rosa active:scale-95"
                      >
                        <Icon name="trash" size={17} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
                {editing === r.id && onRename && (
                  <tr className="bg-rosa/30">
                    <td colSpan={4} className="px-4 pb-3">
                      <NameEditor
                        row={r}
                        onCancel={() => setEditing(null)}
                        onSave={async (name) => {
                          await onRename(r.id, name)
                          setEditing(null)
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-sm opacity-65">{rows.length === 0 ? 'Todavía no hay invitados.' : 'Nadie coincide con la búsqueda.'}</p>
        )}
      </div>
    </div>
  )
}
