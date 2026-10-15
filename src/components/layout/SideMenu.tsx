'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { NEEDS_QR } from '@/lib/messages'
import { Icon } from '@/components/ui/Icon'
import { navFor } from './nav-items'

interface Props {
  open: boolean
  current: string
  onClose: () => void
  readOnly?: boolean
  guestName?: string | null
}

export function SideMenu({ open, current, onClose, readOnly = false, guestName }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#3A0B24]/45" onClick={onClose} aria-hidden="true" />
      <aside className="aparecer absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col bg-crema bg-[url('/assets/papel.jpg')] bg-[length:512px] px-5 pb-8 pt-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="flex items-start gap-0.5">
            <span className="font-script text-[40px] leading-none text-fucsia">Sofi</span>
            <span className="text-xs font-semibold text-oro">23</span>
          </p>
          <button type="button" aria-label="Cerrar menú" onClick={onClose} className="flex size-11 items-center justify-center rounded-[15px] border border-fucsia/30 bg-crema">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>
        {guestName && <p className="mt-3 text-sm opacity-75">Hola, {guestName}</p>}
        <nav aria-label="Menú principal" className="mt-6 flex flex-col gap-1.5">
          {navFor(readOnly).map((item, i) => {
            const active = item.href === current
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                style={{ animationDelay: `${80 + i * 60}ms` }}
                className={`aparecer relative flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] transition-transform duration-200 hover:translate-x-1 ${active ? 'cosido border border-fucsia/50 bg-crema font-semibold text-fucsia [--costura:rgb(212_175_55/0.7)]' : 'font-medium'}`}
              >
                <Icon name={item.icon} size={20} strokeWidth={2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        {readOnly && <p className="mt-auto rounded-2xl bg-rosa/70 p-4 text-sm leading-relaxed">{NEEDS_QR}</p>}
      </aside>
    </div>
  )
}
