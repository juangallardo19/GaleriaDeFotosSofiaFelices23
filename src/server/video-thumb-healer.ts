import { after } from 'next/server'
import { PLACEHOLDERS } from '@/features/media/placeholders'
import type { AppContainer } from './container'
import { ADMIN_VIEWER_ID } from './domain'

type Refresh = () => Promise<{ updated: number; pending: number }>

const EVERY_MS = 2 * 60_000

export function needsVideoThumbs(items: { kind: string; thumbUrl: string }[]): boolean {
  return items.some((m) => m.kind === 'video' && m.thumbUrl === PLACEHOLDERS.video)
}

// Pide a Drive las miniaturas de los videos que quedaron con la imagen genérica (los MOV del iPhone):
// como mucho cada 2 minutos y nunca dos veces a la vez, para no llamar a Drive en cada visita
export class VideoThumbHealer {
  private last = Number.NEGATIVE_INFINITY
  private running: Promise<void> | null = null

  constructor(private readonly opts: { refresh?: Refresh; now?: () => number; log?: (message: string, err: unknown) => void } = {}) {}

  run(refresh: Refresh | undefined = this.opts.refresh): Promise<void> {
    const now = (this.opts.now ?? Date.now)()
    if (!refresh || this.running || now - this.last < EVERY_MS) return this.running ?? Promise.resolve()
    this.last = now
    this.running = refresh()
      .then(
        () => undefined,
        (err) => (this.opts.log ?? console.error)('No se pudieron crear las vistas previas de videos', err),
      )
      .finally(() => {
        this.running = null
      })
    return this.running
  }

  idle(): Promise<void> {
    return this.running ?? Promise.resolve()
  }

  reset() {
    this.last = Number.NEGATIVE_INFINITY
    this.running = null
  }
}

export const videoThumbHealer = new VideoThumbHealer()

// Corre después de responder (after); fuera de una petición de Next, como en las pruebas, corre en el momento
export function healVideoThumbsLater(app: AppContainer) {
  const task = () => videoThumbHealer.run(() => app.media.refreshVideoThumbs({ id: ADMIN_VIEWER_ID, role: 'admin' }))
  try {
    after(task)
  } catch {
    void task()
  }
}
