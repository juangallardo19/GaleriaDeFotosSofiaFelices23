'use client'

import Link from 'next/link'
import { useMe } from '@/hooks/useMe'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { NEEDS_QR } from '@/lib/messages'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { HeroParallax } from './HeroParallax'

export function HomeHero() {
  const reducedMotion = usePrefersReducedMotion()
  const me = useMe()
  return (
    <>
      <HeroParallax reducedMotion={reducedMotion} />
      <div className="relative mx-auto flex max-w-[640px] flex-col items-center px-6 pb-12 pt-4 text-center">
        <h1 className="flex flex-col items-center">
          <Reveal as="span" className="font-serif text-[27px] leading-[1.15] md:text-5xl">
            23 años desde que nació este
          </Reveal>
          <Reveal as="span" variant="zoom" delay={180} className="font-script text-[70px] leading-[1.05] text-fucsia md:text-[120px]">
            Angelito
          </Reveal>
        </h1>
        <Reveal delay={320} variant="zoom" className="mt-1 flex items-center gap-2.5 text-naranja">
          <span aria-hidden="true" className="h-px w-12 bg-naranja" />
          <Icon name="heart" size={14} filled />
          <span aria-hidden="true" className="h-px w-12 bg-naranja" />
        </Reveal>
        <Reveal as="p" delay={420} className="mt-4 text-sm leading-relaxed opacity-85 md:text-base">
          Sube aquí las fotos y videos de la fiesta. Todo lo que compartas queda guardado para verlo, darle amor y descargarlo.
        </Reveal>
        {me && me.role !== 'visitor' && (
          <Reveal delay={540} variant="zoom">
            <Link href="/subir" className={buttonClass('primary', 'mt-6 px-6')}>
              <Icon name="upload" size={18} strokeWidth={2} />
              Subir mis recuerdos
            </Link>
          </Reveal>
        )}
        {me?.role === 'visitor' && (
          <Reveal as="p" delay={540} className="mt-5 rounded-2xl bg-rosa/70 px-4 py-3 text-sm">
            {NEEDS_QR}
          </Reveal>
        )}
      </div>
    </>
  )
}
