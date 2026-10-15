'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { mediaQuery } from '@/features/gallery/gallery-state'
import type { PublicMedia } from '@/server/serialize'
import { api } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import { DownloadSheet, type DownloadStats } from './DownloadSheet'

interface Summary extends DownloadStats {
  folders: { all: string; photos: string; videos: string } | null
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Cada descarga va en un iframe oculto para no sacar a nadie de la página
function downloadInBackground(path: string) {
  const frame = document.createElement('iframe')
  frame.style.display = 'none'
  frame.src = path
  document.body.appendChild(frame)
  setTimeout(() => frame.remove(), 60_000)
}

export function DownloadScreen() {
  const router = useRouter()
  const me = useMe()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api<Summary>('/api/media/resumen')
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen'))
  }, [])

  async function downloadSet(choice: 'mios' | 'likes') {
    const filter = choice === 'mios' ? { mine: true } : { liked: true }
    const all: PublicMedia[] = []
    let cursor: string | null = null
    setBusy('Preparando…')
    try {
      do {
        const page: { items: PublicMedia[]; nextCursor: string | null } = await api(mediaQuery({ sort: 'antiguos', filter, cursor, limit: 60 }))
        all.push(...page.items)
        cursor = page.nextCursor
      } while (cursor)
      for (let i = 0; i < all.length; i++) {
        setBusy(`Descargando ${i + 1} de ${all.length}…`)
        downloadInBackground(all[i].downloadPath)
        await wait(1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron descargar')
    } finally {
      setBusy(null)
    }
  }

  if (error && !summary) return <p className="py-10 text-center text-sm">{error}</p>
  if (!summary || !me) return <div className="shimmer mx-auto h-80 w-full max-w-md rounded-panel" aria-hidden="true" />

  return (
    <div className="mx-auto w-full max-w-md rounded-panel border border-linea bg-white/70 p-6">
      <DownloadSheet
        open
        asPage
        folderUrl={summary.folders?.all ?? null}
        photosUrl={summary.folders?.photos ?? null}
        stats={summary}
        readOnly={me.role === 'visitor'}
        busy={busy}
        onDownloadSet={downloadSet}
        onClose={() => router.push('/')}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-fucsia">
          {error}
        </p>
      )}
    </div>
  )
}
