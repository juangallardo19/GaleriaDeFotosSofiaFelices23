'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { WakeLockManager, notifyUploadsDone, progressTitle, shouldBlockUnload } from '@/features/upload/background'
import type { FileInfo, QueueSnapshot, UploadQueue } from '@/features/upload/upload-queue'

// Conecta la cola (Observer) con React y con el navegador: título de la pestaña, aviso al cerrar,
// pantalla encendida mientras sube y notificación al terminar
export function useUploadQueue<F extends FileInfo>(queue: UploadQueue<F>, baseTitle: string | (() => string)): QueueSnapshot<F> {
  const snapshot = useSyncExternalStore(
    (onChange) => queue.subscribe(onChange),
    queue.getSnapshot,
    queue.getSnapshot,
  )
  const latest = useRef(snapshot)
  const wakeLock = useRef<WakeLockManager | null>(null)
  const wasBusy = useRef(false)
  const doneAtStart = useRef(0)

  useEffect(() => {
    latest.current = snapshot
    const busy = shouldBlockUnload(snapshot)
    const base = typeof baseTitle === 'function' ? baseTitle() : baseTitle
    // Solo toca el título mientras sube (y al terminar lo devuelve): así no pisa el título de cada página
    if (busy) document.title = progressTitle(snapshot, base)
    else if (wasBusy.current) document.title = base

    wakeLock.current ??= new WakeLockManager(navigator as never, document)
    if (busy && !wasBusy.current) {
      doneAtStart.current = snapshot.done
      void wakeLock.current.acquire()
    }
    if (!busy && wasBusy.current) {
      void wakeLock.current.release()
      const uploaded = snapshot.done - doneAtStart.current
      if (document.visibilityState === 'hidden') notifyUploadsDone(uploaded, { Notification: typeof Notification === 'undefined' ? undefined : Notification })
    }
    wasBusy.current = busy
  }, [snapshot, baseTitle])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldBlockUnload(latest.current)) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void wakeLock.current?.release()
    }
  }, [])

  return snapshot
}
