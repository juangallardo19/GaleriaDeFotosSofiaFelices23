import { describe, expect, it, vi } from 'vitest'
import { UploadQueue, type Uploader } from '@/features/upload/upload-queue'

const file = (name: string, size: number) => ({ name, size, type: 'image/jpeg' })
const deferred = () => {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

describe('RNF-08/09 · cola de subida', () => {
  it('nunca sube más archivos a la vez que la concurrencia', async () => {
    let active = 0
    let maxActive = 0
    const uploader: Uploader = async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
    }
    const q = new UploadQueue({ uploader, concurrency: 2 })
    q.add([1, 2, 3, 4, 5].map((n) => file(`f${n}`, n)))
    q.start()
    await q.onIdle()
    expect(maxActive).toBe(2)
    expect(q.getSnapshot().done).toBe(5)
  })

  it('sube primero los archivos livianos (cola de prioridad)', async () => {
    const order: string[] = []
    const q = new UploadQueue({ uploader: async (t) => void order.push(t.file.name), concurrency: 1 })
    q.add([file('video', 900), file('foto-a', 10), file('foto-b', 50)])
    q.start()
    await q.onIdle()
    expect(order).toEqual(['foto-a', 'foto-b', 'video'])
  })

  it('reintenta con espera creciente y marca error al agotar los intentos', async () => {
    const sleep = vi.fn(async (_ms: number) => {})
    const uploader = vi.fn(async () => {
      throw new Error('sin conexión')
    })
    const q = new UploadQueue({ uploader, maxRetries: 2, sleep, backoffMs: (n) => 1000 * 2 ** n })
    const [t] = q.add([file('a', 1)])
    q.start()
    await q.onIdle()
    expect(uploader).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000])
    const snap = q.getSnapshot()
    expect(snap.tasks.find((x) => x.id === t.id)!.status).toBe('error')
    expect(snap.failed).toBe(1)
  })

  it('retry vuelve a encolar una tarea con error', async () => {
    let fail = true
    const q = new UploadQueue({
      uploader: async () => {
        if (fail) throw new Error('x')
      },
      maxRetries: 0,
    })
    const [t] = q.add([file('a', 1)])
    q.start()
    await q.onIdle()
    fail = false
    q.retry(t.id)
    await q.onIdle()
    expect(q.getSnapshot().tasks[0].status).toBe('listo')
  })

  it('acumula el progreso y avisa a los suscriptores (Observer)', async () => {
    const q = new UploadQueue({
      uploader: async (t, ctx) => {
        ctx.onProgress(t.file.size / 2)
        ctx.onProgress(t.file.size)
      },
    })
    const seen: number[] = []
    const unsubscribe = q.subscribe((s) => seen.push(s.uploadedBytes))
    q.add([file('a', 100), file('b', 300)])
    q.start()
    await q.onIdle()
    unsubscribe()
    expect(q.getSnapshot().uploadedBytes).toBe(400)
    expect(q.getSnapshot().totalBytes).toBe(400)
    expect(seen.at(-1)).toBe(400)
  })

  it('getSnapshot devuelve la misma referencia si nada cambió (useSyncExternalStore)', () => {
    const q = new UploadQueue({ uploader: async () => {} })
    q.add([file('a', 1)])
    expect(q.getSnapshot()).toBe(q.getSnapshot())
  })

  it('cancelar aborta la subida en curso', async () => {
    const gate = deferred()
    let aborted = false
    const q = new UploadQueue({
      uploader: async (_t, ctx) => {
        ctx.signal.addEventListener('abort', () => {
          aborted = true
          gate.reject(new DOMException('abort', 'AbortError'))
        })
        await gate.promise
      },
    })
    const [t] = q.add([file('a', 1)])
    q.start()
    await Promise.resolve()
    q.cancel(t.id)
    await q.onIdle()
    expect(aborted).toBe(true)
    expect(q.getSnapshot().tasks[0].status).toBe('cancelado')
  })

  it('pausar no inicia tareas nuevas y reanudar continúa', async () => {
    const started: string[] = []
    const q = new UploadQueue({ uploader: async (t) => void started.push(t.file.name), concurrency: 1 })
    q.add([file('a', 1), file('b', 2)])
    q.pause()
    q.start()
    await new Promise((r) => setTimeout(r, 10))
    expect(started).toEqual([])
    q.resume()
    await q.onIdle()
    expect(started).toEqual(['a', 'b'])
  })
})
