'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useMe } from '@/hooks/useMe'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { navFor } from './nav-items'
import { SideMenu } from './SideMenu'

export function Logo({ big = false }: { big?: boolean }) {
  return (
    <Link href="/" aria-label="Inicio del álbum de Sofi" className="flex items-start gap-0.5 transition-transform hover:-rotate-3 hover:scale-105">
      <span className={`font-script leading-none text-fucsia ${big ? 'text-[46px]' : 'text-[34px]'}`}>Sofi</span>
      <span className={`font-semibold text-naranja ${big ? 'text-[13px]' : 'text-[10px]'}`}>23</span>
    </Link>
  )
}

export function AppHeader() {
  const me = useMe()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const readOnly = me?.role === 'visitor'
  const items = navFor(me ? readOnly : true)

  return (
    <>
      <header className="papel sticky top-0 z-40 border-b border-naranja/40 shadow-[0_4px_16px_rgb(90_18_56/0.06)]">
        <div className="mx-auto flex h-[66px] max-w-[1440px] items-center justify-between gap-4 px-3.5 md:px-8">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
            className="flex size-[42px] items-center justify-center rounded-[15px] border border-fucsia/30 bg-crema/90 shadow-[0_2px_0_rgb(230_21_122/0.18)] transition-transform hover:scale-105 active:scale-95 lg:hidden"
          >
            <Icon name="menu" size={20} strokeWidth={2} />
          </button>
          <Logo />
          <nav aria-label="Navegación" className="hidden items-center gap-1 lg:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-2xl px-3 text-sm transition-[background-color,transform] hover:-translate-y-0.5 ${pathname === item.href ? 'bg-rosa font-semibold text-fucsia' : 'font-medium hover:bg-rosa/50'}`}
              >
                <Icon name={item.icon} size={18} strokeWidth={2} />
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="flex size-[42px] items-center justify-center">{me?.name && me.role === 'guest' ? <Avatar name={me.name} size={40} /> : null}</span>
        </div>
      </header>
      <SideMenu open={open} current={pathname} onClose={() => setOpen(false)} readOnly={readOnly} guestName={me?.role === 'guest' ? me.name : null} />
    </>
  )
}
