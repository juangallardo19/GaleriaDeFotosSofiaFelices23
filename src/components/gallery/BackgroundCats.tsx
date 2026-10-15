'use client'

import { useEffect, useRef, useState } from 'react'
import { BACKGROUND_CATS_SPEED } from '@/features/gallery/parallax'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Botellita de fondo: difuminada y al 15 %, nunca pegada a los bordes; una cada ~420 px y cada una con su velocidad
const CATS = [
  { n: 1, left: 30, w: 150, rot: -14, speed: 0.55 },
  { n: 2, left: 62, w: 130, rot: 18, speed: 0.65 },
  { n: 3, left: 22, w: 170, rot: 9, speed: 0.5 },
  { n: 4, left: 58, w: 140, rot: -20, speed: 0.6 },
  { n: 6, left: 34, w: 150, rot: 12, speed: 0.55 },
  { n: 7, left: 60, w: 150, rot: -8, speed: 0.7 },
  { n: 8, left: 26, w: 135, rot: 16, speed: BACKGROUND_CATS_SPEED },
]
const SPACING = 420

export function BackgroundCats() {
  const reducedMotion = usePrefersReducedMotion()
  const refs = useRef<(HTMLImageElement | null)[]>([])
  const box = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setCount(Math.max(1, Math.floor(el.clientHeight / SPACING))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      refs.current.forEach((el) => el && (el.style.transform = ''))
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      refs.current.forEach((el, i) => {
        if (!el?.parentElement || !CATS[i % CATS.length]) return
        const cat = CATS[i % CATS.length]
        const r = el.parentElement.getBoundingClientRect()
        if (r.bottom < -400 || r.top > vh + 400) return
        // Más lenta que la página: se queda atrás mientras el contenido sube
        const offset = (vh / 2 - (r.top + r.height / 2)) * (1 - cat.speed)
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) rotate(${cat.rot}deg)`
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, count])

  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {Array.from({ length: count }, (_, i) => CATS[i % CATS.length]).map((c, i) => (
        <div key={i} className="absolute" style={{ top: i * SPACING + 40, left: `${c.left}%`, width: c.w }}>
          <img
            ref={(el) => {
              refs.current[i] = el
            }}
            src={`/assets/fondo/botellita-${c.n}.webp`}
            alt=""
            width={320}
            height={320}
            loading="lazy"
            className="w-full opacity-15 blur-[2px] transition-opacity duration-1000 will-change-transform"
            style={{ transform: `rotate(${c.rot}deg)` }}
          />
        </div>
      ))}
    </div>
  )
}
