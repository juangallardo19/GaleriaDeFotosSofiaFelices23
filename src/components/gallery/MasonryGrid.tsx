'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cardRatio } from '@/features/gallery/gallery-state'
import { columnsForWidth, distribute } from '@/features/gallery/masonry'
import { cardOffset, columnFactors } from '@/features/gallery/parallax'

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

  useIsoLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setColumns(columnsForWidth(el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      cards.current.forEach(({ el }) => (el.style.transform = ''))
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      cards.current.forEach(({ el, k }) => {
        const r = el.parentElement!.getBoundingClientRect()
        if (r.bottom < -200 || r.top > vh + 200) return
        el.style.transform = `translate3d(0, ${cardOffset({ centerY: r.top + r.height / 2, viewportH: vh, k })}px, 0)`
      })
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, items, columns])

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
                    className="will-change-transform"
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
