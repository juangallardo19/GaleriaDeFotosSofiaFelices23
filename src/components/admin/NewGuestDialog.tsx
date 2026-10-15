'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export interface CreatedGuest {
  name: string
  url: string
  qr: string
}

interface Props {
  open: boolean
  create: (name: string) => Promise<CreatedGuest>
  onClose: () => void
}

export function GuestQr({ guest }: { guest: CreatedGuest }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="entrada flex flex-col items-center gap-3 rounded-[24px] bg-rosa/80 p-5 [--animacion:entrar-pop]">
      <div className="rounded-[20px] bg-white p-3">
        <img src={guest.qr} alt={`QR de ${guest.name}`} width={220} height={220} className="size-[220px]" />
      </div>
      <p className="font-script text-4xl text-fucsia">{guest.name}</p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(guest.url)
          setCopied(true)
        }}
        className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white/85 px-3 py-2.5 text-left text-xs font-medium"
      >
        <span className="truncate">{guest.url}</span>
        <span className="flex shrink-0 items-center gap-1 text-fucsia">
          <Icon name={copied ? 'check' : 'copy'} size={16} strokeWidth={2} />
          {copied ? 'Copiado' : 'Copiar'}
        </span>
      </button>
      <a
        href={guest.qr}
        download={`QR - ${guest.name}.png`}
        className="cosido relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-boton border-[1.5px] border-fucsia bg-crema px-4 text-sm font-semibold text-fucsia [--costura:rgb(212_175_55/0.8)]"
      >
        <Icon name="download" size={18} strokeWidth={2} />
        Descargar QR (PNG)
      </a>
    </div>
  )
}

export function NewGuestDialog({ open, create, onClose }: Props) {
  const [name, setName] = useState('')
  const [created, setCreated] = useState<CreatedGuest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      setCreated(await create(name.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el invitado')
    } finally {
      setSaving(false)
    }
  }

  function another() {
    setCreated(null)
    setName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#3A0B24]/45" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo invitado"
        className="aparecer relative flex w-full max-w-3xl flex-col gap-6 rounded-panel bg-crema bg-[url('/assets/papel.jpg')] bg-[length:512px] p-6 shadow-2xl md:flex-row md:p-9"
      >
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-[15px]">
          <Icon name="close" size={20} strokeWidth={2} />
        </button>
        <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
          <h2 className="font-serif text-3xl">Nuevo invitado</h2>
          <p className="text-sm leading-relaxed opacity-75">Solo necesitas el nombre. El QR personal se genera solo y queda listo para imprimir.</p>
          <label htmlFor="nombre-invitado" className="mt-2 text-sm font-semibold">
            Nombre del invitado
          </label>
          <input
            id="nombre-invitado"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Tía Marta"
            disabled={!!created}
            className="-mt-2 min-h-12 rounded-2xl border border-linea bg-white px-4 text-base outline-fucsia"
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-fucsia">
              {error}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            {created ? (
              <>
                <Button onClick={another} icon="plus">
                  Crear otro
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Listo
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" icon="check" disabled={!name.trim() || saving}>
                  Guardar invitado
                </Button>
              </>
            )}
          </div>
        </form>
        <div className="md:w-[312px]">
          {created ? (
            <GuestQr guest={created} />
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-fucsia/25 p-6 text-center text-sm opacity-70">
              <Icon name="qr" size={40} strokeWidth={1.6} />
              Aquí aparecerá su QR
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
