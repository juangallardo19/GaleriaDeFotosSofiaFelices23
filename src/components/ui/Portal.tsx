'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Las ventanas encima de todo se montan en <body> para no quedar atrapadas en el apilamiento de la galería
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>
  return createPortal(children, document.body)
}
