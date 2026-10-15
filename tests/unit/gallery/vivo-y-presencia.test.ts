import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveFeed } from '@/features/gallery/live-feed'
import { ONLINE_WINDOW_MS, countOnline, isOnline, presenceLabel } from '@/features/presence/presence'

type Item = { id: string; createdAt: Date }
const it_ = (id: string, min: number): Item => ({ id, createdAt: new Date(Date.UTC(2026, 9, 16, 21, min)) })

describe('Fotos nuevas en vivo sin interrumpir (Observer)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('acumula las nuevas como pendientes y avisa, sin tocar lo que se está viendo', async () => {
    const fetchNewer = vi.fn(async () => [it_('n1', 5), it_('n2', 6)])
    const feed = new LiveFeed<Item>({ fetchNewer, intervalMs: 20_000 })
    const states: number[] = []
    feed.subscribe((s) => states.push(s.pending))
    feed.start(new Date(Date.UTC(2026, 9, 16, 21, 0)))
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchNewer).toHaveBeenCalledTimes(1)
    expect(states.at(-1)).toBe(2)
    feed.stop()
  })

  it('no cuenta dos veces la misma foto', async () => {
    const fetchNewer = vi.fn(async () => [it_('n1', 5)])
    const feed = new LiveFeed<Item>({ fetchNewer, intervalMs: 1000 })
    feed.start(new Date(0))
    await vi.advanceTimersByTimeAsync(3000)
    expect(feed.getState().pending).toBe(1)
    feed.stop()
  })

  it('flush entrega las nuevas (más reciente primero) y reinicia el contador', async () => {
    const feed = new LiveFeed<Item>({ fetchNewer: async () => [it_('n1', 5), it_('n2', 9)], intervalMs: 1000 })
    feed.start(new Date(0))
    await vi.advanceTimersByTimeAsync(1000)
    expect(feed.flush().map((x) => x.id)).toEqual(['n2', 'n1'])
    expect(feed.getState().pending).toBe(0)
    feed.stop()
  })

  it('pide solo lo posterior a la última foto conocida', async () => {
    const fetchNewer = vi.fn(async (_since: Date) => [it_('n1', 5)])
    const feed = new LiveFeed<Item>({ fetchNewer, intervalMs: 1000 })
    feed.start(new Date(0))
    await vi.advanceTimersByTimeAsync(1000)
    feed.flush()
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchNewer.mock.calls[1][0]).toEqual(it_('n1', 5).createdAt)
    feed.stop()
  })

  it('stop detiene las consultas', async () => {
    const fetchNewer = vi.fn(async () => [])
    const feed = new LiveFeed<Item>({ fetchNewer, intervalMs: 1000 })
    feed.start(new Date(0))
    feed.stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchNewer).not.toHaveBeenCalled()
  })

  it('un error de red no rompe el ciclo', async () => {
    const fetchNewer = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValue([it_('n1', 1)])
    const feed = new LiveFeed<Item>({ fetchNewer, intervalMs: 1000 })
    feed.start(new Date(0))
    await vi.advanceTimersByTimeAsync(2000)
    expect(feed.getState().pending).toBe(1)
    feed.stop()
  })
})

describe('Personas viendo el álbum', () => {
  const now = new Date('2026-10-16T22:00:00Z')
  it('se cuenta en línea hasta 1 minuto después de su última señal', () => {
    expect(ONLINE_WINDOW_MS).toBe(60_000)
    expect(isOnline(new Date(now.getTime() - 59_000), now)).toBe(true)
    expect(isOnline(new Date(now.getTime() - 61_000), now)).toBe(false)
    expect(isOnline(null, now)).toBe(false)
  })

  it('cuenta solo a los activos', () => {
    const seen = [now, new Date(now.getTime() - 30_000), new Date(now.getTime() - 120_000), null]
    expect(countOnline(seen, now)).toBe(2)
  })

  it.each([
    [0, null],
    [1, '1 persona viendo el álbum'],
    [15, '15 personas viendo el álbum'],
  ])('%d => %s', (n, label) => {
    expect(presenceLabel(n)).toBe(label)
  })
})
