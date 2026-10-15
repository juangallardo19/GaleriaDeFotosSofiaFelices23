'use client'

import Link from 'next/link'
import { useMe } from '@/hooks/useMe'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { NEEDS_QR } from '@/lib/messages'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { HeroParallax } from './HeroParallax'

export function HomeHero() {
  const reducedMotion = usePrefersReducedMotion()
  const me = useMe()
  return (
    <>
      <HeroParallax reducedMotion={reducedMotion} />
      <div className="relative mx-auto flex max-w-[640px] flex-col items-center px-6 pb-12 pt-4 text-center">
        <h1 className="flex flex-col items-center">
          <span className="font-serif text-[27px] leading-[1.15] md:text-5xl">23 años desde que nació este</span>
          <span className="font-script text-[70px] leading-[1.05] text-fucsia md:text-[120px]">Angelito</span>
        </h1>
        <div aria-hidden="true" className="mt-1 flex items-center gap-2.5 text-oro">
          <span className="h-px w-12 bg-oro" />
          <Icon name="heart" size={14} filled />
          <span className="h-px w-12 bg-oro" />
        </div>
        <p className="mt-4 text-sm leading-relaxed opacity-85 md:text-base">
          Sube aquí las fotos y videos de la fiesta. Todo lo que compartas queda guardado para verlo, darle amor y descargarlo.
        </p>
        {me && me.role !== 'visitor' && (
          <Link href="/subir" className={buttonClass('primary', 'mt-6 px-6')}>
            <Icon name="upload" size={18} strokeWidth={2} />
            Subir mis recuerdos
          </Link>
        )}
        {me?.role === 'visitor' && <p className="mt-5 rounded-2xl bg-rosa/70 px-4 py-3 text-sm">{NEEDS_QR}</p>}
      </div>
    </>
  )
}
