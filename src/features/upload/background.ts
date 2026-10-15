import type { QueueSnapshot } from './upload-queue'

interface Sentinel {
  release: () => Promise<void>
}
interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<Sentinel> }
}
interface VisibilityDocument {
  visibilityState: DocumentVisibilityState
  addEventListener: (type: 'visibilitychange', fn: () => void) => void
  removeEventListener: (type: 'visibilitychange', fn: () => void) => void
}

// El navegador suelta el wake lock al ocultar la pestaña; hay que pedirlo de nuevo al volver
export class WakeLockManager {
  private sentinel: Sentinel | null = null
  private wanted = false

  constructor(
    private readonly nav: WakeLockNavigator,
    private readonly doc: VisibilityDocument,
  ) {}

  async acquire(): Promise<boolean> {
    this.wanted = true
    if (!this.nav.wakeLock) return false
    this.doc.removeEventListener('visibilitychange', this.onVisibility)
    this.doc.addEventListener('visibilitychange', this.onVisibility)
    return this.request()
  }

  async release() {
    this.wanted = false
    this.doc.removeEventListener('visibilitychange', this.onVisibility)
    const s = this.sentinel
    this.sentinel = null
    await s?.release().catch(() => {})
  }

  private onVisibility = () => {
    if (this.wanted && this.doc.visibilityState === 'visible') void this.request()
  }

  private async request(): Promise<boolean> {
    try {
      this.sentinel = (await this.nav.wakeLock?.request('screen')) ?? null
      return this.sentinel !== null
    } catch {
      return false
    }
  }
}

export function progressTitle(s: QueueSnapshot, baseTitle: string): string {
  if (s.isIdle || s.totalBytes === 0) return baseTitle
  return `(${Math.floor((s.uploadedBytes / s.totalBytes) * 100)} %) Subiendo · ${baseTitle}`
}

interface NotificationCtor {
  new (title: string, options?: NotificationOptions): unknown
  permission: NotificationPermission
}

export function notifyUploadsDone(count: number, deps: { Notification?: NotificationCtor }): boolean {
  const N = deps.Notification
  if (!N || N.permission !== 'granted' || count < 1) return false
  const body = count === 1 ? 'Tu recuerdo ya se subió al álbum de Sofi.' : `Tus ${count} recuerdos ya se subieron al álbum de Sofi.`
  new N('¡Listo!', { body, icon: '/icons/icon-192.png', tag: 'subida-sofi' })
  return true
}

export function shouldBlockUnload(s: QueueSnapshot): boolean {
  return s.active > 0 || s.pending > 0
}
