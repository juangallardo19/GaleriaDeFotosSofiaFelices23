'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { HERO_LAYERS, layerOffset } from '@/features/gallery/parallax'

interface Placement {
  x: number
  y: number
  w: number
  rot?: number
}

interface LayerArt {
  src: string
  ratio: number
  alt: string
  mobile: Placement | null
  desktop: Placement
  priority?: boolean
  float?: boolean
}

// Medidas del diseño en Figma: lienzo móvil de 390 × 770 y de escritorio de 1440 × 960
const M = { w: 390, h: 770 }
const D = { w: 1440, h: 960 }

const ART: Record<string, LayerArt> = {
  banderines: { src: '/assets/banderines.webp', ratio: 0.2489, alt: '', mobile: { x: -34, y: 34, w: 458 }, desktop: { x: 95, y: 40, w: 1250 } },
  'globo-rosa': { src: '/assets/globo-rosa.webp', ratio: 2.5281, alt: '', mobile: { x: 12, y: 262, w: 78, rot: 9 }, desktop: { x: 236, y: 300, w: 128, rot: 10 }, float: true },
  'globo-naranja': { src: '/assets/globo-naranja.webp', ratio: 1.7476, alt: '', mobile: { x: 296, y: 236, w: 98, rot: -7 }, desktop: { x: 1068, y: 272, w: 176, rot: -8 }, float: true },
  'globo-rojo': { src: '/assets/globo-rojo.webp', ratio: 2.4684, alt: '', mobile: null, desktop: { x: 128, y: 440, w: 90, rot: -6 }, float: true },
  'happy-birthday': { src: '/assets/happy-birthday.webp', ratio: 0.46, alt: 'Happy Birthday en letras recortadas', mobile: { x: 66, y: 124, w: 260, rot: -3 }, desktop: { x: 482, y: 146, w: 476, rot: -2 } },
  corazon: { src: '/assets/corazon.webp', ratio: 0.945, alt: '', mobile: { x: 26, y: 140, w: 48, rot: 14 }, desktop: { x: 408, y: 158, w: 74, rot: 14 } },
  estrella: { src: '/assets/estrella.webp', ratio: 0.9717, alt: '', mobile: { x: 322, y: 110, w: 46, rot: 12 }, desktop: { x: 950, y: 136, w: 64, rot: 12 } },
  'globo-2': { src: '/assets/globo-2.webp', ratio: 1.4975, alt: 'Globos dorados con el número 2', mobile: { x: 18, y: 452, w: 102, rot: -8 }, desktop: { x: 404, y: 520, w: 166, rot: -9 } },
  'globo-3': { src: '/assets/globo-3.webp', ratio: 1.5437, alt: 'Globos dorados con el número 3', mobile: { x: 272, y: 448, w: 100, rot: 7 }, desktop: { x: 872, y: 516, w: 162, rot: 8 } },
  sofi: { src: '/assets/sofi.webp', ratio: 1.372, alt: 'Sofi vestida de angelito con su gorrito de cumpleaños', mobile: { x: 72, y: 284, w: 246 }, desktop: { x: 572, y: 350, w: 296 }, priority: true },
  pastel: { src: '/assets/pastel.webp', ratio: 0.9311, alt: '', mobile: { x: 82, y: 546, w: 226 }, desktop: { x: 562, y: 652, w: 316 } },
}

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

  useEffect(() => {
    if (reducedMotion) {
      layers.current.forEach((el) => (el.style.transform = ''))
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const limit = (root.current?.offsetHeight ?? 1000) * 1.2
      if (y > limit) return
      for (const layer of HERO_LAYERS) {
        const el = layers.current.get(layer.id)
        if (el) el.style.transform = `translate3d(${(y * (layer.drift ?? 0)).toFixed(1)}px, ${layerOffset(y, layer.speed)}px, 0)`
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  return (
    <div ref={root} className="relative mx-auto w-full max-w-[520px] overflow-hidden md:max-w-[1440px]">
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
          )
        })}
      </div>
      <a
        href="#galeria"
        className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-chip border border-fucsia/25 bg-crema/85 px-3.5 py-1.5 text-xs font-semibold text-fucsia"
      >
        Desliza
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-naranja">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  )
}
