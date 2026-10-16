'use client'

import { useSyncExternalStore } from 'react'
import { supportsScrollTimeline } from '@/features/gallery/parallax'

const noop = () => () => {}

// En el servidor no se sabe: se arranca sin animaciones de scroll y se activan al hidratar si el navegador las soporta
export function useScrollTimeline(check: () => boolean = supportsScrollTimeline): boolean {
  return useSyncExternalStore(noop, check, () => false)
}
