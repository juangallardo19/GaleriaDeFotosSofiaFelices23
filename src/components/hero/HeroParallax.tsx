'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { HERO_LAYERS, heroScrollY, heroTimelineCss, layerOffset, scrollTimelineAvailable, smoothToward } from '@/features/gallery/parallax'
import { useScrollTimeline } from '@/hooks/useScrollTimeline'

interface Placement {
  x: number
  y: number
  w: number
  rot?: number
}

type Entrance = 'entrar-caer' | 'entrar-subir' | 'entrar-pop' | 'entrar-suave'

interface LayerArt {
  src: string
  ratio: number
  alt: string
  mobile: Placement | null
  desktop: Placement
  entrance: [Entrance, number]
  priority?: boolean
  float?: boolean
}

// Medidas del diseño en Figma: lienzo móvil de 390 × 770 y de escritorio de 1440 × 960
const M = { w: 390, h: 770 }
const D = { w: 1440, h: 960 }

const ART: Record<string, LayerArt> = {
  banderines: {
    entrance: ['entrar-caer', 0],
    src: '/assets/banderines.webp',
    ratio: 0.2489,
    alt: '',
    mobile: { x: -34, y: 34, w: 458 },
    desktop: { x: 95, y: 40, w: 1250 },
  },
  'globo-rosa': {
    entrance: ['entrar-subir', 380],
    src: '/assets/globo-rosa.webp',
    ratio: 2.5281,
    alt: '',
    mobile: { x: 12, y: 262, w: 78, rot: 9 },
    desktop: { x: 236, y: 300, w: 128, rot: 10 },
    float: true,
  },
  'globo-naranja': {
    entrance: ['entrar-subir', 460],
    src: '/assets/globo-naranja.webp',
    ratio: 1.7476,
    alt: '',
    mobile: { x: 296, y: 236, w: 98, rot: -7 },
    desktop: { x: 1068, y: 272, w: 176, rot: -8 },
    float: true,
  },
  'globo-rojo': {
    entrance: ['entrar-subir', 540],
    src: '/assets/globo-rojo.webp',
    ratio: 2.4684,
    alt: '',
    mobile: null,
    desktop: { x: 128, y: 440, w: 90, rot: -6 },
    float: true,
  },
  'happy-birthday': {
    entrance: ['entrar-pop', 200],
    src: '/assets/happy-birthday.webp',
    ratio: 0.46,
    alt: 'Happy Birthday en letras recortadas',
    mobile: { x: 66, y: 124, w: 260, rot: -3 },
    desktop: { x: 482, y: 146, w: 476, rot: -2 },
  },
  corazon: {
    entrance: ['entrar-pop', 720],
    src: '/assets/corazon.webp',
    ratio: 0.945,
    alt: '',
    mobile: { x: 26, y: 140, w: 48, rot: 14 },
    desktop: { x: 408, y: 158, w: 74, rot: 14 },
  },
  estrella: {
    entrance: ['entrar-pop', 800],
    src: '/assets/estrella.webp',
    ratio: 0.9717,
    alt: '',
    mobile: { x: 322, y: 110, w: 46, rot: 12 },
    desktop: { x: 950, y: 136, w: 64, rot: 12 },
  },
  'globo-2': {
    entrance: ['entrar-subir', 620],
    src: '/assets/globo-2.webp',
    ratio: 1.4975,
    alt: 'Globos dorados con el número 2',
    mobile: { x: 18, y: 452, w: 102, rot: -8 },
    desktop: { x: 404, y: 520, w: 166, rot: -9 },
  },
  'globo-3': {
    entrance: ['entrar-subir', 700],
    src: '/assets/globo-3.webp',
    ratio: 1.5437,
    alt: 'Globos dorados con el número 3',
    mobile: { x: 272, y: 448, w: 100, rot: 7 },
    desktop: { x: 872, y: 516, w: 162, rot: 8 },
  },
  sofi: {
    entrance: ['entrar-suave', 300],
    src: '/assets/sofi.webp',
    ratio: 1.372,
    alt: 'Sofi vestida de angelito con su gorrito de cumpleaños',
    mobile: { x: 72, y: 284, w: 246 },
    desktop: { x: 572, y: 350, w: 296 },
    priority: true,
  },
  pastel: {
    entrance: ['entrar-subir', 860],
    src: '/assets/pastel.webp',
    ratio: 0.9311,
    alt: '',
    mobile: { x: 82, y: 546, w: 226 },
    desktop: { x: 562, y: 652, w: 316 },
  },
}

// Recorrido del scroll en el que se completa el parallax de la portada (mayor que la portada más alta)
const SCROLL_RANGE = 1200
const HALF_LIFE_MS = 60

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(3)}%`

function placementVars(art: LayerArt): CSSProperties {
  const m = art.mobile
  const d = art.desktop
  return {
    '--ml': m ? pct(m.x, M.w) : '0',
    '--mt': m ? pct(m.y, M.h) : '0',
    '--mw': m ? pct(m.w, M.w) : '0',
    '--mdisplay': m ? 'block' : 'none',
    '--dl': pct(d.x, D.w),
    '--dt': pct(d.y, D.h),
    '--dw': pct(d.w, D.w),
  } as CSSProperties
}

export function HeroParallax({ reducedMotion }: { reducedMotion: boolean }) {
  const layers = useRef(new Map<string, HTMLDivElement>())
  const root = useRef<HTMLDivElement>(null)
  const cue = useRef<HTMLSpanElement>(null)

  // Con animaciones ligadas al scroll el navegador mueve las capas al ritmo del scroll; si no las soporta, JavaScript
  const cssScroll = useScrollTimeline(scrollTimelineAvailable) && !reducedMotion

  useEffect(() => {
    if (reducedMotion) {
      layers.current.forEach((el) => (el.style.transform = ''))
      return
    }
    const pointer = { x: 0, y: 0 }
    const depthOf = new Map<string, { x: number; y: number }>()
    let frame = 0
    let last = 0
    let appliedY = -1
    let settled = false
    // Un solo bucle. El scroll se aplica directo, sin suavizado: al soltar el dedo no queda nada por acomodar.
    // Solo la profundidad con el mouse se suaviza
    const tick = (now: number) => {
      frame = 0
      const dt = Math.min(64, now - (last || now - 16))
      last = now
      const y = window.scrollY
      // La invitación a deslizar se desvanece apenas la persona empieza a bajar
      if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - y / 140))
      const sy = cssScroll ? 0 : heroScrollY(y, SCROLL_RANGE)
      if (sy === appliedY && settled) return
      let moving = false
      for (const layer of HERO_LAYERS) {
        const el = layers.current.get(layer.id)
        if (!el) continue
        // Profundidad: lo que está más al frente se mueve más con el mouse
        const depth = layer.speed - 0.15
        const target = { x: pointer.x * depth * 16, y: pointer.y * depth * 10 }
        const prev = depthOf.get(layer.id) ?? target
        const next = { x: smoothToward(prev.x, target.x, dt, HALF_LIFE_MS), y: smoothToward(prev.y, target.y, dt, HALF_LIFE_MS) }
        depthOf.set(layer.id, next)
        if (next.x !== target.x || next.y !== target.y) moving = true
        const tx = sy * (layer.drift ?? 0) + next.x
        const ty = layerOffset(sy, layer.speed) + next.y
        el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`
      }
      appliedY = sy
      settled = !moving
      if (moving) frame = requestAnimationFrame(tick)
    }
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const onPointer = (e: PointerEvent) => {
      const r = root.current?.getBoundingClientRect()
      if (!r) return
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2
      settled = false
      kick()
    }
    const onLeave = () => {
      pointer.x = 0
      pointer.y = 0
      settled = false
      kick()
    }
    const finePointer = window.matchMedia?.('(pointer: fine)').matches
    const el = root.current
    kick()
    window.addEventListener('scroll', kick, { passive: true })
    if (finePointer && el) {
      el.addEventListener('pointermove', onPointer)
      el.addEventListener('pointerleave', onLeave)
    }
    return () => {
      window.removeEventListener('scroll', kick)
      el?.removeEventListener('pointermove', onPointer)
      el?.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, cssScroll])

  return (
    <div ref={root} className="relative mx-auto w-full max-w-[520px] overflow-hidden md:max-w-[1440px]">
      {cssScroll && <style>{heroTimelineCss(SCROLL_RANGE)}</style>}
      <div className="relative aspect-[390/770] w-full md:aspect-[1440/960]">
        {HERO_LAYERS.map((layer) => {
          const art = ART[layer.id]
          if (!art) return null
          const rotM = art.mobile?.rot ?? 0
          const rotD = art.desktop.rot ?? 0
          return (
            <div
              key={layer.id}
              data-testid={`capa-${layer.id}`}
              data-speed={String(layer.speed)}
              data-static={reducedMotion ? 'true' : 'false'}
              className="capa will-change-transform"
              style={placementVars(art)}
              ref={(el) => {
                if (el) layers.current.set(layer.id, el)
                else layers.current.delete(layer.id)
              }}
            >
              <div className={cssScroll ? `parallax-${layer.id}` : undefined}>
                <div className="entrada" style={{ '--animacion': art.entrance[0], '--retraso': `${art.entrance[1]}ms` } as CSSProperties}>
                  <img
                    src={art.src}
                    alt={art.alt}
                    width={1000}
                    height={Math.round(1000 * art.ratio)}
                    decoding="async"
                    fetchPriority={art.priority ? 'high' : 'auto'}
                    className={`h-auto w-full select-none rotate-[var(--rm)] md:rotate-[var(--rd)] ${art.float && !reducedMotion ? 'flotar' : ''}`}
                    style={{ '--rm': `${rotM}deg`, '--rd': `${rotD}deg` } as CSSProperties}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <a
        href="#galeria"
        aria-label="Desliza para ver los recuerdos"
        className="entrada absolute bottom-2 left-1/2 -translate-x-1/2 p-2 transition-transform duration-300 [--retraso:1300ms] hover:scale-110"
      >
        <span ref={cue} data-testid="indicador-deslizar" aria-hidden="true" className="flex flex-col items-center gap-1 transition-opacity duration-300">
          <span className="flex h-[38px] w-6 justify-center rounded-full border-2 border-fucsia/70 bg-crema/80 pt-1.5 shadow-[0_2px_8px_rgb(90_18_56/0.12)]">
            <span className="rueda block size-[5px] rounded-full bg-naranja" />
          </span>
          <span className="flex flex-col items-center text-naranja">
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="cascada">
              <path d="M2 2l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="cascada -mt-1 [animation-delay:0.25s]">
              <path d="M2 2l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </a>
    </div>
  )
}
