'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin/invitados', label: 'Invitados', icon: 'users' },
  { href: '/admin/contenido', label: 'Contenido', icon: 'grid' },
  { href: '/admin/tarjetas', label: 'Tarjetas QR', icon: 'printer' },
  { href: '/', label: 'Ver el álbum', icon: 'link' },
]

interface Props {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function AdminShell({ title, subtitle, actions, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {})
    router.replace('/admin')
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="border-b border-oro/40 bg-rosa/55 md:sticky md:top-0 md:flex md:h-dvh md:w-[232px] lg:w-[264px] md:shrink-0 md:flex-col md:border-b-0 md:border-r md:px-4 md:pb-6 md:pt-5">
        <div className="flex items-center justify-between px-4 pt-3 md:block md:px-3 md:pt-0">
          <p className="flex items-start gap-0.5">
            <span className="font-script text-[40px] leading-none text-fucsia md:text-[46px]">Sofi</span>
            <span className="text-xs font-semibold text-oro">23</span>
          </p>
          <p className="text-[13px] font-semibold opacity-70 md:mt-3">Panel de anfitriones</p>
        </div>
        <nav
          aria-label="Secciones del panel"
          className="sin-scrollbar flex gap-1.5 overflow-x-auto px-3 py-3 md:mt-6 md:flex-col md:overflow-visible md:px-0 md:py-0"
        >
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-11 shrink-0 items-center gap-2.5 rounded-2xl px-3.5 text-sm transition-transform duration-200 hover:translate-x-1 md:text-[14.5px] ${active ? 'cosido border border-fucsia/50 bg-crema font-semibold text-fucsia [--costura:rgb(212_175_55/0.7)]' : 'font-medium hover:bg-crema/60'}`}
              >
                <Icon name={item.icon} size={19} strokeWidth={2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="hidden min-h-11 items-center gap-2.5 rounded-2xl px-3.5 text-sm font-medium hover:bg-crema/60 md:mt-auto md:flex"
        >
          <Icon name="logout" size={19} strokeWidth={2} />
          Cerrar sesión
        </button>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-10 lg:px-12">
        <div className="mx-auto max-w-[1080px]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <Reveal variant="izq">
              <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">{title}</h1>
              {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
            </Reveal>
            {actions && (
              <Reveal variant="der" delay={120} className="flex flex-wrap gap-2.5">
                {actions}
              </Reveal>
            )}
          </div>
          <Reveal delay={200} className="mt-7">
            {children}
          </Reveal>
          <button type="button" onClick={logout} className="mt-10 flex min-h-11 items-center gap-2 text-sm font-medium opacity-75 md:hidden">
            <Icon name="logout" size={18} strokeWidth={2} />
            Cerrar sesión
          </button>
        </div>
      </main>
    </div>
  )
}
