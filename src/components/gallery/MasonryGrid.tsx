'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cardRatio } from '@/features/gallery/gallery-state'
import { columnsForWidth, distribute } from '@/features/gallery/masonry'
import { cardAmplitude, cardOffset, columnFactors } from '@/features/gallery/parallax'
import { useScrollTimeline } from '@/hooks/useScrollTimeline'

interface Sized {
  id: string
  width: number
  height: number
}

interface Props<T extends Sized> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  reducedMotion: boolean
  footer?: ReactNode
}

const GAP = 14

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

// Masonry: cada recuerdo va a la columna más corta; con parallax suave por columna (acotado para que nunca se choquen)
export function MasonryGrid<T extends Sized>({ items, renderItem, reducedMotion, footer }: Props<T>) {
  const root = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(2)
  const cards = useRef(new Map<string, { el: HTMLDivElement; k: number }>())
  const cssScroll = useScrollTimeline() && !reducedMotion
  const [viewportH, setViewportH] = useState(800)

  useIsoLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => {
      setColumns(columnsForWidth(el.clientWidth))
      setViewportH(window.innerHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Plan B sin animaciones de scroll en CSS (Safari): la posición sale directo del scroll, sin suavizado,
  // para que al soltar el dedo cada card ya esté en su lugar
  useEffect(() => {
    if (reducedMotion || cssScroll) {
      cards.current.forEach(({ el }) => (el.style.transform = ''))
      return
    }
    const applied = new Map<string, string>()
    let frame = 0
    const tick = () => {
      frame = 0
      // Altura estable: en iPhone innerHeight cambia cuando la barra de Safari aparece o se esconde
      const vh = document.documentElement.clientHeight
      cards.current.forEach(({ el, k }, id) => {
        const r = el.parentElement!.getBoundingClientRect()
        const ty = cardOffset({ centerY: r.top + r.height / 2, viewportH: vh, k }).toFixed(2)
        if (applied.get(id) === ty) return
        applied.set(id, ty)
        el.style.transform = `translate3d(0, ${ty}px, 0)`
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
  }, [reducedMotion, cssScroll, items, columns])

  const indexed = items.map((item, index) => ({ item, index, height: cardRatio(item.width, item.height) + 0.35 }))
  const cols = distribute(indexed, columns)
  const factors = columnFactors(columns)

  return (
    <div ref={root}>
      <div className="flex items-start pb-16" style={{ gap: GAP }}>
        {cols.map((col, ci) => (
          <div key={ci} className="flex min-w-0 flex-1 flex-col" style={{ gap: GAP + 4, paddingTop: columns > 2 && ci % 2 === 1 ? 28 : 0 }}>
            {col.map(({ item, index }, j) => {
              const k = factors[ci] + (((j * 7 + ci * 3) % 5) - 2) * 0.006
              return (
                <div key={item.id} className="aparecer" style={{ animationDelay: `${Math.min(index % 24, 12) * 30}ms` }}>
                  <div
                    className={cssScroll ? 'parallax-vista' : 'will-change-transform'}
                    style={cssScroll ? ({ '--desde': `${cardAmplitude(k, viewportH, 300)}px`, '--hasta': `${-cardAmplitude(k, viewportH, 300)}px` } as CSSProperties) : undefined}
                    ref={(el) => {
                      if (el) cards.current.set(item.id, { el, k: reducedMotion ? 0 : k })
                      else cards.current.delete(item.id)
                    }}
                  >
                    {renderItem(item, index)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {footer}
    </div>
  )
}
