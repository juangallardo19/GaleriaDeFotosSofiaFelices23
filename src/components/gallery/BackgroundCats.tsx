'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BACKGROUND_CATS_SPEED } from '@/features/gallery/parallax'
import { useScrollTimeline } from '@/hooks/useScrollTimeline'
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

// Recorrido del fondo mientras la gatita cruza la pantalla: más lenta que la página
const catAmplitude = (c: (typeof CATS)[number], viewportH: number) => Math.round((viewportH / 2 + c.w / 2) * (1 - c.speed))

export function BackgroundCats() {
  const reducedMotion = usePrefersReducedMotion()
  const refs = useRef<(HTMLImageElement | null)[]>([])
  const box = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const cssScroll = useScrollTimeline() && !reducedMotion
  const [viewportH, setViewportH] = useState(800)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setCount(Math.max(1, Math.floor(el.clientHeight / SPACING)))
      setViewportH(window.innerHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Plan B sin animaciones de scroll en CSS (Safari): la posición sale directo del scroll, sin suavizado,
  // para que al soltar el dedo los gatos no se sigan moviendo
  useEffect(() => {
    if (reducedMotion || cssScroll) {
      refs.current.forEach((el, i) => el && (el.style.transform = `rotate(${CATS[i % CATS.length].rot}deg)`))
      return
    }
    const applied = new Map<number, string>()
    let frame = 0
    const tick = () => {
      frame = 0
      // Altura estable: en iPhone innerHeight cambia cuando la barra de Safari aparece o se esconde
      const vh = document.documentElement.clientHeight
      refs.current.forEach((el, i) => {
        if (!el?.parentElement) return
        const cat = CATS[i % CATS.length]
        const r = el.parentElement.getBoundingClientRect()
        // Más lenta que la página: se queda atrás mientras el contenido sube
        const ty = ((vh / 2 - (r.top + r.height / 2)) * (1 - cat.speed)).toFixed(2)
        if (applied.get(i) === ty) return
        applied.set(i, ty)
        el.style.transform = `translate3d(0, ${ty}px, 0) rotate(${cat.rot}deg)`
      })
    }
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    kick()
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    return () => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, cssScroll, count])

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
            className={`w-full opacity-15 blur-[2px] ${cssScroll ? 'parallax-vista' : 'will-change-transform'}`}
            style={
              {
                transform: `rotate(${c.rot}deg)`,
                ...(cssScroll && { '--desde': `${-catAmplitude(c, viewportH)}px`, '--hasta': `${catAmplitude(c, viewportH)}px` }),
              } as CSSProperties
            }
          />
        </div>
      ))}
    </div>
  )
}
