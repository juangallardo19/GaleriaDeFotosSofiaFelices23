export interface LiveFeedState {
  pending: number
}

interface Timed {
  id: string
  createdAt: Date
}

// Observer: consulta en segundo plano y acumula lo nuevo sin tocar lo que el usuario está viendo
export class LiveFeed<T extends Timed> {
  private pending = new Map<string, T>()
  private seen = new Set<string>()
  private listeners = new Set<(s: LiveFeedState) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private latest = new Date(0)
  private polling = false
  private state: LiveFeedState = { pending: 0 }

  constructor(private readonly opts: { fetchNewer: (since: Date) => Promise<T[]>; intervalMs?: number }) {}

  subscribe(listener: (s: LiveFeedState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): LiveFeedState => this.state

  start(latestKnown: Date) {
    this.stop()
    if (latestKnown > this.latest) this.latest = latestKnown
    this.timer = setInterval(() => void this.poll(), this.opts.intervalMs ?? 20_000)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  markSeen(items: T[]) {
    for (const item of items) {
      this.seen.add(item.id)
      if (item.createdAt > this.latest) this.latest = item.createdAt
    }
  }

  async poll() {
    if (this.polling) return
    this.polling = true
    try {
      const items = await this.opts.fetchNewer(this.latest)
      let added = false
      for (const item of items) {
        if (this.seen.has(item.id) || this.pending.has(item.id)) continue
        this.pending.set(item.id, item)
        added = true
      }
      if (added) this.emit()
    } catch {
      // Si la red falla, se reintenta en el siguiente ciclo
    } finally {
      this.polling = false
    }
  }

  flush(): T[] {
    const items = [...this.pending.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    this.pending.clear()
    this.markSeen(items)
    this.emit()
    return items
  }

  private emit() {
    this.state = { pending: this.pending.size }
    this.listeners.forEach((l) => l(this.state))
  }
}
