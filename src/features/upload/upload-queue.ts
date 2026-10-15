import { MinHeap } from '@/lib/ds/min-heap'

export type TaskStatus = 'en-cola' | 'subiendo' | 'listo' | 'error' | 'cancelado'

export interface FileInfo {
  name: string
  size: number
  type: string
}

export interface UploadTask<F extends FileInfo = FileInfo> {
  id: string
  file: F
  status: TaskStatus
  uploadedBytes: number
  attempts: number
  error?: string
}

export interface QueueSnapshot<F extends FileInfo = FileInfo> {
  tasks: UploadTask<F>[]
  totalBytes: number
  uploadedBytes: number
  done: number
  failed: number
  active: number
  pending: number
  isIdle: boolean
}

export interface UploadContext {
  onProgress: (uploadedBytes: number) => void
  signal: AbortSignal
}

export type Uploader<F extends FileInfo = FileInfo> = (task: UploadTask<F>, ctx: UploadContext) => Promise<void>

export interface QueueOptions<F extends FileInfo> {
  uploader: Uploader<F>
  concurrency?: number
  maxRetries?: number
  backoffMs?: (retry: number) => number
  sleep?: (ms: number) => Promise<void>
}

type Entry = { id: string; size: number; seq: number }

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export class UploadQueue<F extends FileInfo = FileInfo> {
  private tasks = new Map<string, UploadTask<F>>()
  private heap = new MinHeap<Entry>((a, b) => a.size - b.size || a.seq - b.seq)
  private controllers = new Map<string, AbortController>()
  private listeners = new Set<(s: QueueSnapshot<F>) => void>()
  private idleWaiters: (() => void)[] = []
  private snapshot: QueueSnapshot<F> | null = null
  private seq = 0
  private active = 0
  private started = false
  private paused = false
  private readonly opts: Required<QueueOptions<F>>

  constructor(opts: QueueOptions<F>) {
    this.opts = {
      concurrency: 2,
      maxRetries: 3,
      backoffMs: (n) => 1000 * 2 ** n,
      sleep: defaultSleep,
      ...opts,
    }
  }

  add(files: F[]): UploadTask<F>[] {
    const created = files.map((file) => {
      const task: UploadTask<F> = { id: `u${++this.seq}`, file, status: 'en-cola', uploadedBytes: 0, attempts: 0 }
      this.tasks.set(task.id, task)
      this.heap.push({ id: task.id, size: file.size, seq: this.seq })
      return task
    })
    this.changed()
    this.pump()
    return created
  }

  start() {
    this.started = true
    this.pump()
  }

  pause() {
    this.paused = true
    this.changed()
  }

  resume() {
    this.paused = false
    this.pump()
  }

  cancel(id: string) {
    const task = this.tasks.get(id)
    if (!task) return
    if (task.status === 'en-cola') {
      this.heap.remove((e) => e.id === id)
      task.status = 'cancelado'
      this.changed()
      this.checkIdle()
    } else if (task.status === 'subiendo') {
      this.controllers.get(id)?.abort()
    }
  }

  retry(id: string) {
    const task = this.tasks.get(id)
    if (!task || (task.status !== 'error' && task.status !== 'cancelado')) return
    Object.assign(task, { status: 'en-cola', attempts: 0, uploadedBytes: 0, error: undefined })
    this.heap.push({ id, size: task.file.size, seq: ++this.seq })
    this.changed()
    this.pump()
  }

  subscribe(listener: (s: QueueSnapshot<F>) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): QueueSnapshot<F> => {
    if (this.snapshot) return this.snapshot
    const tasks = [...this.tasks.values()].map((t) => ({ ...t }))
    const live = tasks.filter((t) => t.status !== 'cancelado')
    const count = (s: TaskStatus) => tasks.filter((t) => t.status === s).length
    this.snapshot = {
      tasks,
      totalBytes: live.reduce((s, t) => s + t.file.size, 0),
      uploadedBytes: live.reduce((s, t) => s + t.uploadedBytes, 0),
      done: count('listo'),
      failed: count('error'),
      active: this.active,
      pending: count('en-cola'),
      isIdle: this.isIdle(),
    }
    return this.snapshot
  }

  onIdle(): Promise<void> {
    if (this.isIdle()) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  private isIdle() {
    return this.active === 0 && this.heap.size === 0
  }

  private pump() {
    if (!this.started || this.paused) return
    while (this.active < this.opts.concurrency && this.heap.size > 0) {
      const entry = this.heap.pop()!
      const task = this.tasks.get(entry.id)
      if (task?.status === 'en-cola') void this.run(task)
    }
  }

  private async run(task: UploadTask<F>) {
    const controller = new AbortController()
    this.controllers.set(task.id, controller)
    this.active++
    task.status = 'subiendo'
    this.changed()
    const ctx: UploadContext = {
      signal: controller.signal,
      onProgress: (bytes) => {
        task.uploadedBytes = Math.min(Math.max(bytes, 0), task.file.size)
        this.changed()
      },
    }
    try {
      for (;;) {
        try {
          await this.opts.uploader(task, ctx)
          task.status = 'listo'
          task.uploadedBytes = task.file.size
          break
        } catch (err) {
          if (controller.signal.aborted) {
            task.status = 'cancelado'
            break
          }
          task.attempts++
          if (task.attempts > this.opts.maxRetries) {
            task.status = 'error'
            task.error = err instanceof Error ? err.message : String(err)
            break
          }
          this.changed()
          await this.opts.sleep(this.opts.backoffMs(task.attempts - 1))
        }
      }
    } finally {
      this.controllers.delete(task.id)
      this.active--
      this.changed()
      this.pump()
      this.checkIdle()
    }
  }

  private checkIdle() {
    if (!this.isIdle()) return
    const waiters = this.idleWaiters
    this.idleWaiters = []
    waiters.forEach((w) => w())
  }

  private changed() {
    this.snapshot = null
    if (this.listeners.size === 0) return
    const s = this.getSnapshot()
    this.listeners.forEach((l) => l(s))
  }
}
