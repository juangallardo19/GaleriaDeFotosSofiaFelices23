'use client'

import { useEffect, useState } from 'react'
import { PARTY_DATE } from '@/lib/event'
import { api } from '@/lib/api'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AdminShell } from './AdminShell'

interface Guest {
  id: string
  name: string
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
    <label
      className="opcion flex min-h-16 flex-1 cursor-pointer items-start gap-3 rounded-boton p-4 hover:-translate-y-0.5"
    >
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
        <a
          href={`/api/admin/cards${duplex ? '?duplex=1' : ''}`}
          className={buttonClass('primary', count === 0 ? 'pointer-events-none opacity-55' : '')}
          aria-disabled={count === 0}
        >
          <Icon name="download" size={18} strokeWidth={2} />
          {count ? `Descargar PDF (${sheets} ${sheets === 1 ? 'hoja' : 'hojas'})` : 'Descargar PDF'}
        </a>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Cómo imprimir" className="flex flex-col gap-3 md:flex-row">
            {option(false, 'Tarjeta con QR (una cara)', 'El nombre, la fecha y el QR en el mismo lado.')}
            {option(true, 'Con frente decorado (doble cara)', 'Agrega un frente con «Captura tus recuerdos». Imprime a doble cara.')}
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
        <div aria-hidden="true" className="mx-auto w-[260px]">
          <div className="relative flex aspect-[10/14] flex-col items-center overflow-hidden rounded-xl border border-naranja/50 bg-crema px-5 pt-4 text-center shadow-[0_14px_30px_rgb(90_18_56/0.15)] transition-transform duration-500 hover:-rotate-2 hover:scale-[1.04]">
            <img src="/assets/banderines.webp" alt="" className="w-[92%]" />
            <p className="mt-2 text-[9px] font-semibold tracking-[0.18em]">CAPTURA TUS</p>
            <p className="-mt-1 font-script text-[30px] leading-tight text-fucsia">Recuerdos</p>
            <p className="text-[12px] font-semibold">{sample}</p>
            <p className="mt-1 text-[8px] leading-snug opacity-80">
              Gracias por estar en este día tan especial. Baila, come rico, toma muchas fotos y no te vayas sin abrazar a Sofi.
            </p>
            <div className="mt-2 flex w-full items-center gap-2 text-left">
              <div className="grid size-[76px] shrink-0 grid-cols-5 grid-rows-5 gap-px rounded border border-naranja/60 bg-white p-1.5">
                {Array.from({ length: 25 }, (_, i) => (
                  <span key={i} className={(i * 7) % 3 === 0 || i % 6 === 0 ? 'bg-vino' : ''} />
                ))}
              </div>
              <p className="text-[8px] leading-snug">
                <span className="block font-semibold tracking-wide">ESCANEA EL QR</span>y sube tus fotos y videos de la fiesta al álbum de Sofi.
              </p>
            </div>
            <p className="mt-auto text-[8px] font-semibold tracking-wide">CON CARIÑO,</p>
            <p className="font-script text-2xl leading-tight text-fucsia">Sofi</p>
            <p className="mb-3 text-[8px] opacity-70">{PARTY_DATE}</p>
          </div>
          <p className="mt-3 text-center text-xs opacity-60">Vista aproximada de una tarjeta</p>
        </div>
      </div>
    </AdminShell>
  )
}
