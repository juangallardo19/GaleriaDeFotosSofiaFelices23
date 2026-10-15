import { describe, expect, it, vi } from 'vitest'
import { WakeLockManager, notifyUploadsDone, progressTitle, shouldBlockUnload } from '@/features/upload/background'
import type { QueueSnapshot } from '@/features/upload/upload-queue'

const snap = (p: Partial<QueueSnapshot>): QueueSnapshot => ({
  tasks: [],
  totalBytes: 0,
  uploadedBytes: 0,
  done: 0,
  failed: 0,
  active: 0,
  pending: 0,
  isIdle: true,
  ...p,
})

function fakeDocument() {
  const listeners: Record<string, (() => void)[]> = {}
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, fn: () => void) => void (listeners[type] ??= []).push(fn),
    removeEventListener: (type: string, fn: () => void) => void (listeners[type] = (listeners[type] ?? []).filter((x) => x !== fn)),
    emit(type: string) {
      ;(listeners[type] ?? []).forEach((fn) => fn())
    },
  }
}

describe('Mantener la pantalla encendida mientras sube (Wake Lock)', () => {
  it('pide el wake lock y lo suelta al terminar', async () => {
    const release = vi.fn(async () => {})
    const request = vi.fn(async () => ({ release, released: false }))
    const doc = fakeDocument()
    const m = new WakeLockManager({ wakeLock: { request } }, doc)
    await m.acquire()
    expect(request).toHaveBeenCalledWith('screen')
    await m.release()
    expect(release).toHaveBeenCalled()
  })

  it('lo vuelve a pedir cuando el usuario regresa a la pestaña', async () => {
    const request = vi.fn(async () => ({ release: async () => {}, released: false }))
    const doc = fakeDocument()
    const m = new WakeLockManager({ wakeLock: { request } }, doc)
    await m.acquire()
    doc.visibilityState = 'visible'
    doc.emit('visibilitychange')
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('no falla en navegadores sin soporte', async () => {
    const m = new WakeLockManager({}, fakeDocument())
    await expect(m.acquire()).resolves.toBe(false)
  })
})

describe('Progreso visible en el título de la pestaña', () => {
  it('muestra el porcentaje mientras sube', () => {
    const s = snap({ totalBytes: 1000, uploadedBytes: 620, active: 1, isIdle: false })
    expect(progressTitle(s, 'Álbum de Sofi')).toBe('(62 %) Subiendo · Álbum de Sofi')
  })

  it('vuelve al título normal al terminar', () => {
    expect(progressTitle(snap({}), 'Álbum de Sofi')).toBe('Álbum de Sofi')
  })
})

describe('Notificación al terminar', () => {
  it('notifica con el número de recuerdos si hay permiso', () => {
    const ctor = vi.fn()
    const shown = notifyUploadsDone(8, { Notification: Object.assign(ctor, { permission: 'granted' }) as never })
    expect(shown).toBe(true)
    expect(ctor).toHaveBeenCalledWith('¡Listo!', expect.objectContaining({ body: 'Tus 8 recuerdos ya se subieron al álbum de Sofi.' }))
  })

  it('usa singular para un solo recuerdo', () => {
    const ctor = vi.fn()
    notifyUploadsDone(1, { Notification: Object.assign(ctor, { permission: 'granted' }) as never })
    expect(ctor.mock.calls[0][1].body).toBe('Tu recuerdo ya se subió al álbum de Sofi.')
  })

  it('no hace nada sin permiso o sin soporte', () => {
    const ctor = vi.fn()
    expect(notifyUploadsDone(2, { Notification: Object.assign(ctor, { permission: 'denied' }) as never })).toBe(false)
    expect(notifyUploadsDone(2, {})).toBe(false)
    expect(ctor).not.toHaveBeenCalled()
  })
})

describe('Avisar antes de cerrar la pestaña con subidas pendientes', () => {
  it('bloquea solo si hay algo subiendo o en cola', () => {
    expect(shouldBlockUnload(snap({ active: 1, isIdle: false }))).toBe(true)
    expect(shouldBlockUnload(snap({ pending: 2, isIdle: false }))).toBe(true)
    expect(shouldBlockUnload(snap({ done: 3 }))).toBe(false)
  })
})
