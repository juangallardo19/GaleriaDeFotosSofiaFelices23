'use client'

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'

type Variant = 'subir' | 'zoom' | 'izq' | 'der'

interface Props {
  children: ReactNode
  as?: ElementType
  delay?: number
  variant?: Variant
  className?: string
}

// Aparece con animación la primera vez que entra a la pantalla; después se queda quieto
export function Reveal({ children, as: Tag = 'div', delay = 0, variant = 'subir', className }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(t)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`revelar ${className ?? ''}`}
      data-visible={visible ? 'true' : 'false'}
      data-variante={variant}
      style={{ '--retraso': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
