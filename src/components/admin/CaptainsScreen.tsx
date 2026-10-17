'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CAPTAIN_SHOTS, CAPTAIN_TABLE, CARD_SIGNATURE } from '@/features/admin/card-text'
import { MAX_CAPTAIN_NAME, captainTexts, type Captain, type CaptainTitle } from '@/features/admin/captains'
import { PARTY_DATE } from '@/lib/event'
import { ApiError, api, postJson } from '@/lib/api'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AdminShell } from './AdminShell'

type CaptainInput = Omit<Captain, 'id'> & { id?: string }

const TITLES: { value: CaptainTitle; label: string }[] = [
  { value: 'capitan', label: 'Capitán' },
  { value: 'capitana', label: 'Capitana' },
  { value: 'capitanes', label: 'Capitanes' },
  { value: 'capitanas', label: 'Capitanas' },
]

// Silueta de flor del recorte para el cuello de la botella (la misma del PDF)
const SCALLOP = (() => {
  const at = (a: number, k: number) => `${(Math.cos(a) * 32 * k).toFixed(2)},${(Math.sin(a) * 32 * k).toFixed(2)}`
  let d = `M${at(-Math.PI / 2, 1)}`
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    d += ` Q${at(a - Math.PI / 12, 1.24)} ${at(a, 1)}`
  }
  return `${d} Z`
})()

function Separador() {
  return (
    <span className="my-[4px] flex w-[52%] items-center gap-1.5 text-fucsia">
      <span className="h-px flex-1 bg-naranja" />
      <Icon name="heart" size={7} filled />
      <span className="h-px flex-1 bg-naranja" />
    </span>
  )
}

function TitlePicker({ value, onChange, name }: { value: CaptainTitle; onChange: (t: CaptainTitle) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label="Título" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TITLES.map((t) => (
        <label key={t.value} className="opcion flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-boton px-3 text-sm font-semibold">
          <input type="radio" name={name} checked={value === t.value} onChange={() => onChange(t.value)} className="size-4 accent-fucsia" />
          {t.label}
        </label>
      ))}
    </div>
  )
}

// Vista aproximada de la tarjeta: 1 px de aquí ≈ 0,7 puntos de la tarjeta de 14 × 19,8 cm
function CaptainPreview({ captain }: { captain: CaptainInput }) {
  const texts = captainTexts(captain.title)
  return (
    <div className="relative flex aspect-[140/198] w-[280px] flex-col items-center overflow-hidden rounded-xl bg-crema px-[30px] text-center font-serif text-vino shadow-[0_14px_30px_rgb(90_18_56/0.15)]">
      <span className="pointer-events-none absolute inset-[6px] rounded-[7px] border border-naranja" />
      <span className="pointer-events-none absolute inset-[9px] rounded-[5px] border border-dashed border-fucsia/55" />
      <svg viewBox="-42 -42 84 84" className="mt-[12px] w-[52px] shrink-0 overflow-visible" aria-hidden="true">
        <path d={SCALLOP} fill="none" stroke="var(--color-fucsia)" strokeWidth="1.2" strokeDasharray="4 3" />
        <text y="2" textAnchor="middle" fontSize="6.5" letterSpacing="1.2" fill="var(--color-fucsia)">
          RECORTA
        </text>
      </svg>
      <img src="/assets/tarjeta/bola-disco.svg" alt="" className="-mt-px w-[45px]" />
      <p data-testid="vista-capitan-nombre" className="mt-0.5 font-script text-[34px] leading-[1.05] text-balance text-fucsia">
        {captain.name || 'Nombre'}
      </p>
      <Separador />
      <p className="text-[7px] tracking-[0.22em]">{texts.intro}</p>
      <div className="relative w-full">
        <img src="/assets/globo-rosa.webp" alt="" className="absolute -left-1 top-1 w-[15px] rotate-[8deg]" />
        <p className={`mt-1 leading-none tracking-[0.07em] ${texts.heading.length > 8 ? 'text-[23px]' : 'text-[27px]'}`}>{texts.heading}</p>
        <p className="mt-1 text-[14.5px] leading-none tracking-[0.3em]">{CAPTAIN_TABLE}</p>
        <img src="/assets/globo-naranja.webp" alt="" className="absolute -right-1 top-1 w-[20px] -rotate-[8deg]" />
      </div>
      <Separador />
      <p className="text-[6.8px] tracking-[0.18em]">{texts.task}</p>
      <p className="flex items-center gap-1">
        <span className="font-script text-[36px] leading-[1.1] text-fucsia">{CAPTAIN_SHOTS}</span>
        <img src="/assets/tarjeta/shots.svg" alt="" className="w-[41px]" />
      </p>
      <p className="text-[8px]">{texts.mission}</p>
      <Separador />
      <p className="text-[5.3px] tracking-[0.19em]">{CARD_SIGNATURE}</p>
      <p className="font-script text-[20px] leading-tight text-fucsia">Sofi</p>
      <p className="text-[4.7px] tracking-[0.13em]">{PARTY_DATE.toUpperCase()}</p>
    </div>
  )
}

export function CaptainsScreen() {
  const [captains, setCaptains] = useState<Captain[] | null>(null)
  const [name, setName] = useState('')
  const [title, setTitle] = useState<CaptainTitle>('capitan')
  const [editing, setEditing] = useState<{ id: string; name: string; title: CaptainTitle } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ items: Captain[] }>('/api/admin/capitanes')
      .then((r) => setCaptains(r.items))
      .catch(() => setCaptains([]))
  }, [])

  // Se guarda la lista completa; el servidor devuelve la versión limpia con los ids
  async function save(items: CaptainInput[]) {
    setBusy(true)
    setError(null)
    try {
      const res = await postJson<{ items: Captain[] }>('/api/admin/capitanes', { items }, 'PUT')
      setCaptains(res.items)
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar. Intenta de nuevo.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || !captains) return
    if (await save([...captains, { name: clean, title }])) setName('')
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing || !captains || !editing.name.trim()) return
    const next = captains.map((c) => (c.id === editing.id ? { id: c.id, name: editing.name.trim(), title: editing.title } : c))
    if (await save(next)) setEditing(null)
  }

  async function remove(c: Captain) {
    if (!captains || !window.confirm(`¿Quitar a ${c.name} de los capitanes de mesa?`)) return
    await save(captains.filter((x) => x.id !== c.id))
  }

  const count = captains?.length ?? 0
  const sheets = Math.ceil(count / 2)
  const preview: CaptainInput = editing ?? (name.trim() ? { name: name.trim(), title } : (captains?.[0] ?? { name: 'Juliana', title: 'capitana' }))

  return (
    <AdminShell
      title="Capitanes de mesa"
      subtitle="Tarjeta para colgar de la botella · media hoja, 2 por hoja A4 acostada"
      actions={
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/capitanes/tarjetas?ver=1"
            target="_blank"
            rel="noopener"
            className={buttonClass('secondary', count === 0 ? 'pointer-events-none opacity-55' : '')}
            aria-disabled={count === 0}
          >
            <Icon name="eye" size={18} strokeWidth={2} />
            Ver tarjetas
          </a>
          <a
            href="/api/admin/capitanes/tarjetas"
            className={buttonClass('primary', count === 0 ? 'pointer-events-none opacity-55' : '')}
            aria-disabled={count === 0}
          >
            <Icon name="download" size={18} strokeWidth={2} />
            {count ? `Descargar PDF (${sheets} ${sheets === 1 ? 'hoja' : 'hojas'})` : 'Descargar PDF'}
          </a>
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <form onSubmit={add} className="tarjeta flex flex-col gap-3 p-5">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Nombre
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_CAPTAIN_NAME}
                placeholder="Ej.: Juliana"
                className="min-h-11 rounded-boton border border-linea bg-white px-4 font-normal outline-none focus:border-fucsia"
              />
            </label>
            <TitlePicker value={title} onChange={setTitle} name="titulo-nuevo" />
            <p className="text-xs opacity-70">
              Si son dos o más en la misma mesa, escribe los nombres juntos (Ej.: Juliana y Andrés) y elige Capitanes o Capitanas.
            </p>
            <button type="submit" disabled={busy || !name.trim()} className={buttonClass('primary', 'self-start')}>
              <Icon name="plus" size={18} strokeWidth={2} />
              Agregar
            </button>
          </form>

          {error && (
            <p role="alert" className="text-sm font-semibold text-fucsia">
              {error}
            </p>
          )}

          {captains === null ? (
            <div className="shimmer h-32 rounded-card" aria-hidden="true" />
          ) : captains.length === 0 ? (
            <p className="text-sm opacity-75">Todavía no hay capitanes de mesa.</p>
          ) : (
            <ul aria-label="Capitanes" className="flex flex-col gap-3">
              {captains.map((c) => (
                <li key={c.id} aria-label={c.name} className="tarjeta p-4">
                  {editing?.id === c.id ? (
                    <form onSubmit={saveEdit} className="flex flex-col gap-3">
                      <input
                        aria-label={`Nuevo nombre de ${c.name}`}
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        maxLength={MAX_CAPTAIN_NAME}
                        autoFocus
                        className="min-h-11 rounded-boton border border-linea bg-white px-4 outline-none focus:border-fucsia"
                      />
                      <TitlePicker value={editing.title} onChange={(t) => setEditing({ ...editing, title: t })} name={`titulo-${c.id}`} />
                      <div className="flex gap-2">
                        <button type="submit" disabled={busy || !editing.name.trim()} className={buttonClass('primary')}>
                          Guardar
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className={buttonClass('secondary')}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-script text-3xl leading-tight text-fucsia">{c.name}</p>
                        <p className="text-xs font-semibold tracking-wide opacity-70">{captainTexts(c.title).label}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Editar a ${c.name}`}
                        onClick={() => setEditing({ id: c.id, name: c.name, title: c.title })}
                        className="flex size-10 items-center justify-center rounded-xl border border-fucsia/25 bg-crema transition-[transform,background-color] hover:scale-110 hover:bg-rosa active:scale-95"
                      >
                        <Icon name="edit" size={17} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Borrar a ${c.name}`}
                        onClick={() => void remove(c)}
                        disabled={busy}
                        className="flex size-10 items-center justify-center rounded-xl border border-fucsia/25 bg-crema transition-[transform,background-color] hover:scale-110 hover:bg-rosa active:scale-95"
                      >
                        <Icon name="trash" size={17} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <ul className="tarjeta flex flex-col gap-2 p-5 text-sm">
            <li className="flex gap-2.5">
              <Icon name="printer" size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-fucsia" />
              Imprime al 100 % en hoja A4 acostada: salen dos tarjetas por hoja.
            </li>
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Corta por la línea del medio y recorta la flor de arriba para meter el cuello de la botella.
            </li>
          </ul>
        </div>
        <div aria-hidden="true" className="mx-auto">
          <CaptainPreview captain={preview} />
          <p className="mt-3 text-center text-xs opacity-60">Vista aproximada; con «Ver tarjetas» ves el PDF real</p>
        </div>
      </div>
    </AdminShell>
  )
}
