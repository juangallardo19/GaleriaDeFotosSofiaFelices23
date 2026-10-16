'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { QueueSnapshot, UploadTask } from '@/features/upload/upload-queue'
import { Icon } from '@/components/ui/Icon'

interface Props {
  snapshot: QueueSnapshot
  onDismiss: () => void
}

function percent(part: number, total: number) {
  return total > 0 ? Math.floor((part / total) * 100) : 0
}

function estado(t: UploadTask) {
  if (t.status === 'subiendo') return `${percent(t.uploadedBytes, t.file.size)} %`
  return { 'en-cola': 'En cola', listo: 'Listo', error: 'No se pudo subir', cancelado: 'Cancelado' }[t.status]
}

// Mini barra flotante (como el video pequeño de YouTube): la subida sigue mientras se navega por el álbum
export function UploadDock({ snapshot, onDismiss }: Props) {
  const [open, setOpen] = useState(false)
  const total = snapshot.tasks.length
  if (total === 0) return null

  const busy = !snapshot.isIdle
  const overall = percent(snapshot.uploadedBytes, snapshot.totalBytes)

  return (
    <section
      role="region"
      aria-label="Subida en curso"
      className="tarjeta aparecer fixed bottom-3 left-3 right-[5.5rem] z-40 max-w-sm bg-[#FFFDFB] p-3 shadow-[0_18px_40px_rgb(90_18_56/0.22)] md:bottom-6 md:left-6 md:right-auto md:w-80"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${busy ? 'bg-rosa text-fucsia' : snapshot.failed ? 'bg-[#FFF0D4] text-naranja' : 'bg-[#e3f5ea] text-[#23784a]'}`}
        >
          <Icon name={busy ? 'upload' : snapshot.failed ? 'alert' : 'check'} size={18} strokeWidth={2} className={busy ? 'animate-bounce' : ''} />
        </span>
        <div className="min-w-0 flex-1">
          {busy ? (
            <p className="truncate text-sm font-semibold">{`Subiendo ${Math.min(total, snapshot.done + snapshot.active)} de ${total}`}</p>
          ) : snapshot.failed > 0 ? (
            <p className="text-sm font-semibold">{snapshot.failed === 1 ? '1 no se pudo subir' : `${snapshot.failed} no se pudieron subir`}</p>
          ) : (
            <p className="text-sm font-semibold">
              {snapshot.done === 1 ? '¡Listo! Tu recuerdo ya está en el álbum.' : `¡Listo! Tus ${snapshot.done} recuerdos ya están en el álbum.`}
            </p>
          )}
          {busy && (
            <div className="mt-1.5 flex items-center gap-2">
              <div
                role="progressbar"
                aria-label="Avance de la subida"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overall}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-fucsia/12"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-fucsia to-naranja transition-[width] duration-300" style={{ width: `${overall}%` }} />
              </div>
              <span className="shrink-0 text-xs font-semibold text-fucsia">{`${overall} %`}</span>
            </div>
          )}
          {!busy && snapshot.failed > 0 && (
            <Link href="/subir" className="text-xs font-semibold text-fucsia underline-offset-4 hover:underline">
              Reintentar
            </Link>
          )}
        </div>
        <button
          type="button"
          aria-label={open ? 'Ocultar archivos' : 'Ver archivos en subida'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-rosa"
        >
          <Icon name="chevronDown" size={18} strokeWidth={2} className={`transition-transform ${open ? '' : 'rotate-180'}`} />
        </button>
        {!busy && (
          <button
            type="button"
            aria-label="Cerrar aviso de subida"
            onClick={onDismiss}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-rosa"
          >
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        )}
      </div>
      {busy && (
        <p className="mt-2 text-[11px] leading-snug opacity-75">Puedes seguir viendo el álbum. Si cierras o sales de la página, la subida se detiene.</p>
      )}
      {open && (
        <ul className="mt-3 flex max-h-56 flex-col gap-1.5 overflow-y-auto border-t border-linea pt-3">
          {snapshot.tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate">{t.file.name}</span>
              <span className={`shrink-0 font-semibold ${t.status === 'error' ? 'text-fucsia' : t.status === 'listo' ? 'text-[#23784a]' : 'opacity-70'}`}>
                {estado(t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const HIDE_DOCK_ON = ['/subir', '/bienvenida', '/admin', '/qr-invalido']
