'use client'

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { normalizeSearch } from '@/lib/format'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AdminShell } from './AdminShell'

interface GuestLink {
  id: string
  name: string
  url: string
}

const whatsappText = (g: GuestLink) =>
  `¡Hola ${g.name}! Este es tu enlace personal del álbum de los 23 de Sofi: ${g.url}\nÁbrelo para ver, subir y comentar las fotos y videos de la fiesta.`

const noop = () => () => {}

function CopyButton({ text, label, children }: { text: string; label: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => void navigator.clipboard?.writeText(text).then(() => setCopied(true))}
      className={buttonClass('secondary', 'min-h-10 px-3 text-sm')}
    >
      <Icon name={copied ? 'check' : 'copy'} size={16} strokeWidth={2} />
      {copied ? '¡Copiado!' : children}
    </button>
  )
}

// El link de cada QR, para mandarlo por WhatsApp a quien no pueda escanear su tarjeta
export function LinksScreen() {
  const [guests, setGuests] = useState<GuestLink[] | null>(null)
  const [query, setQuery] = useState('')
  // El link general es la dirección del propio sitio (en el servidor todavía no se conoce)
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => '',
  )

  useEffect(() => {
    api<{ items: GuestLink[] }>('/api/admin/guests')
      .then((r) => setGuests(r.items))
      .catch(() => setGuests([]))
  }, [])

  const visible = useMemo(() => {
    const q = normalizeSearch(query)
    return (guests ?? []).filter((g) => !q || normalizeSearch(g.name).includes(q))
  }, [guests, query])

  const all = (guests ?? []).map((g) => `${g.name}: ${g.url}`).join('\n')

  return (
    <AdminShell
      title="Enlaces"
      subtitle="El link de cada QR, para enviarlo sin tener que escanear la tarjeta"
      actions={
        guests && guests.length > 0 ? (
          <CopyButton text={all} label="Copiar todos">
            Copiar todos
          </CopyButton>
        ) : null
      }
    >
      <section aria-label="Link general del álbum" className="tarjeta flex flex-col gap-2 p-5">
        <p className="text-sm font-semibold">Link general del álbum</p>
        <p className="text-xs opacity-70">Para cualquiera de la fiesta: deja ver y descargar los recuerdos, pero no subir ni comentar.</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-boton bg-rosa/50 px-3 py-2 text-sm">{origin}</code>
          <CopyButton text={origin} label="Copiar link general">
            Copiar
          </CopyButton>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm opacity-75">Cada link personal es como escanear el QR de esa persona: entra con su nombre y puede subir y comentar.</p>
        <input
          type="search"
          aria-label="Buscar invitado"
          placeholder="Buscar invitado"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 rounded-boton border border-linea bg-white px-4 outline-none focus:border-fucsia"
        />
        {guests === null ? (
          <div className="shimmer h-40 rounded-card" aria-hidden="true" />
        ) : visible.length === 0 ? (
          <p className="text-sm opacity-75">{guests.length === 0 ? 'Todavía no hay invitados.' : 'Ningún invitado con ese nombre.'}</p>
        ) : (
          <ul aria-label="Enlaces de los invitados" className="flex flex-col gap-2">
            {visible.map((g) => (
              <li key={g.id} aria-label={g.name} className="tarjeta flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{g.name}</p>
                  <p className="truncate text-xs opacity-70">{g.url}</p>
                </div>
                <CopyButton text={g.url} label={`Copiar enlace de ${g.name}`}>
                  Copiar
                </CopyButton>
                <a
                  href={`https://wa.me/?${new URLSearchParams({ text: whatsappText(g) })}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Enviar a ${g.name} por WhatsApp`}
                  className={buttonClass('primary', 'min-h-10 px-3 text-sm')}
                >
                  <Icon name="send" size={16} strokeWidth={2} />
                  WhatsApp
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  )
}
