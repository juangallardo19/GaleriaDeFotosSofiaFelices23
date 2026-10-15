'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { mediaQuery } from '@/features/gallery/gallery-state'
import type { PublicMedia } from '@/server/serialize'
import { api } from '@/lib/api'
import { loadMe } from '@/hooks/useMe'
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen'

const MIN_MS = 2600

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })
}

// La barra avanza con lo que de verdad se carga (datos del invitado, primera página y sus miniaturas)
export default function BienvenidaPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loaded, setLoaded] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const started = performance.now()
    const tick = setInterval(() => setElapsed(Math.min(1, (performance.now() - started) / MIN_MS)), 80)
    let alive = true
    ;(async () => {
      const me = await loadMe(true).catch(() => null)
      if (!alive) return
      setName(me?.name ?? '')
      setLoaded(0.25)
      const page = await api<{ items: PublicMedia[] }>(mediaQuery({ sort: 'recientes', filter: {} })).catch(() => ({ items: [] }))
      setLoaded(0.5)
      const thumbs = page.items.slice(0, 8).map((m) => m.thumbUrl)
      let done = 0
      await Promise.all(
        thumbs.map((src) =>
          preload(src).then(() => {
            done++
            if (alive) setLoaded(0.5 + (done / thumbs.length) * 0.5)
          }),
        ),
      )
      if (alive) setLoaded(1)
    })()
    return () => {
      alive = false
      clearInterval(tick)
    }
  }, [])

  const progress = Math.min(loaded, elapsed)

  useEffect(() => {
    if (progress < 1) return
    const t = setTimeout(() => router.replace('/'), 700)
    return () => clearTimeout(t)
  }, [progress, router])

  return <WelcomeScreen guestName={name} progress={progress} />
}
