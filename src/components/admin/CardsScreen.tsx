'use client'

import { useEffect, useState } from 'react'
import { CARD_MESSAGE, CARD_QR_LINES, CARD_QR_TITLE, CARD_SIGNATURE } from '@/features/admin/card-text'
import { PARTY_DATE } from '@/lib/event'
import { api } from '@/lib/api'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AdminShell } from './AdminShell'

interface Guest {
  id: string
  name: string
}

// Línea, corazón, línea: el mismo separador del PDF
function Separador() {
  return (
    <span className="my-[7px] flex w-[46%] items-center gap-1.5 text-fucsia">
      <span className="h-px flex-1 bg-naranja" />
      <Icon name="heart" size={8} filled />
      <span className="h-px flex-1 bg-naranja" />
    </span>
  )
}

export function CardsScreen() {
  const [duplex, setDuplex] = useState(false)
  const [guests, setGuests] = useState<Guest[] | null>(null)

  useEffect(() => {
    api<{ items: Guest[] }>('/api/admin/guests')
      .then((r) => setGuests(r.items))
      .catch(() => setGuests([]))
  }, [])

  const count = guests?.length ?? 0
  const sheets = Math.ceil(count / 4) * (duplex ? 2 : 1)
  const sample = guests?.[0]?.name ?? 'Tía Marta'

  const option = (value: boolean, title: string, text: string) => (
    <label className="opcion flex min-h-16 flex-1 cursor-pointer items-start gap-3 rounded-boton p-4 hover:-translate-y-0.5">
      <input type="radio" name="caras" checked={duplex === value} onChange={() => setDuplex(value)} className="mt-1 size-4 accent-fucsia" />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs opacity-70">{text}</span>
      </span>
    </label>
  )

  return (
    <AdminShell
      title="Tarjetas QR"
      subtitle="Tarjeta con el nombre y el QR personal · 10 × 14 cm, 4 por hoja A4"
      actions={
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/cards?ver=1${duplex ? '&duplex=1' : ''}`}
            target="_blank"
            rel="noopener"
            className={buttonClass('secondary', count === 0 ? 'pointer-events-none opacity-55' : '')}
            aria-disabled={count === 0}
          >
            <Icon name="eye" size={18} strokeWidth={2} />
            Ver tarjetas
          </a>
          <a
            href={`/api/admin/cards${duplex ? '?duplex=1' : ''}`}
            className={buttonClass('primary', count === 0 ? 'pointer-events-none opacity-55' : '')}
            aria-disabled={count === 0}
          >
            <Icon name="download" size={18} strokeWidth={2} />
            {count ? `Descargar PDF (${sheets} ${sheets === 1 ? 'hoja' : 'hojas'})` : 'Descargar PDF'}
          </a>
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Cómo imprimir" className="flex flex-col gap-3 md:flex-row">
            {option(false, 'Tarjeta con QR (una cara)', 'El nombre, la fecha y el QR en el mismo lado.')}
            {option(true, 'Con frente decorado (doble cara)', 'Agrega un frente con «Este lugar es para» y el nombre. Imprime a doble cara.')}
          </div>
          <p className="text-sm opacity-75">
            {guests === null
              ? 'Cargando invitados…'
              : count === 0
                ? 'Primero crea o importa los invitados.'
                : `Se generan ${count} tarjetas, una por invitado, en orden alfabético.`}
          </p>
          <ul className="tarjeta flex flex-col gap-2 p-5 text-sm">
            <li className="flex gap-2.5">
              <Icon name="printer" size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-fucsia" />
              Imprime al 100 % (tamaño real), sin «ajustar a la página».
            </li>
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Cartulina mate de 250 g o más. Corta por las guías.
            </li>
            <li className="flex gap-2.5">
              <Icon name="qr" size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-fucsia" />
              Antes de imprimir todas, escanea una tarjeta de prueba con el celular.
            </li>
          </ul>
        </div>
        <div aria-hidden="true" className="mx-auto w-[284px]">
          {/* Misma composición que el PDF: 1 px de aquí ≈ 1 punto de la tarjeta de 10 × 14 cm */}
          <div className="relative flex aspect-[10/14] flex-col items-center overflow-hidden rounded-xl bg-crema px-[38px] text-center font-serif text-vino shadow-[0_14px_30px_rgb(90_18_56/0.15)] transition-transform duration-500 hover:-rotate-1 hover:scale-[1.03]">
            <span className="pointer-events-none absolute inset-2 rounded-[9px] border border-naranja" />
            <span className="pointer-events-none absolute inset-3 rounded-md border border-dashed border-fucsia/55" />
            <img src="/assets/banderines.webp" alt="" className="absolute left-[13%] top-[15px] w-[74%]" />
            <img src="/assets/corazon.webp" alt="" className="absolute left-[18px] top-[50px] w-4 -rotate-[14deg]" />
            <img src="/assets/estrella.webp" alt="" className="absolute right-[21px] top-[47px] w-[15px] rotate-12" />
            <p className="mt-[74px] font-script text-[42px] leading-[1.05] text-balance text-fucsia">{sample}</p>
            <Separador />
            <p className="text-[9.6px] leading-[13.4px]">{CARD_MESSAGE}</p>
            <Separador />
            <div className="relative mt-1 flex items-center gap-[10px] text-left">
              <img src="/assets/globo-rosa.webp" alt="" className="absolute -left-[21px] top-1 w-[14px] rotate-[8deg]" />
              <div className="grid size-[84px] shrink-0 grid-cols-7 grid-rows-7 gap-px border border-naranja bg-white p-1.5">
                {Array.from({ length: 49 }, (_, i) => (
                  <span key={i} className={(i * 7) % 3 === 0 || i % 5 === 0 ? 'bg-vino' : ''} />
                ))}
              </div>
              <span className="flex h-[72px] w-px items-center justify-center bg-naranja">
                <Icon name="heart" size={7} filled className="text-fucsia" />
              </span>
              <p className="text-[8.4px] leading-[10.6px]">
                <span className="mb-1 block text-[7.6px] tracking-[0.12em] text-fucsia">{CARD_QR_TITLE}</span>
                {CARD_QR_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <img src="/assets/globo-naranja.webp" alt="" className="absolute -right-[23px] top-2 w-[17px] -rotate-[8deg]" />
            </div>
            <Separador />
            <p className="text-[7.4px] tracking-[0.19em]">{CARD_SIGNATURE}</p>
            <p className="mt-1 font-script text-[32px] leading-none text-fucsia">Sofi</p>
            <p className="mt-1.5 text-[6.6px] tracking-[0.13em]">{PARTY_DATE.toUpperCase()}</p>
          </div>
          <p className="mt-3 text-center text-xs opacity-60">Vista aproximada; con «Ver tarjetas» ves el PDF real</p>
        </div>
      </div>
    </AdminShell>
  )
}
