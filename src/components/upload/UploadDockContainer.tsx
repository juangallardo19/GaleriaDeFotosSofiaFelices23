'use client'

import { usePathname } from 'next/navigation'
import { HIDE_DOCK_ON, UploadDock } from './UploadDock'
import { useUploads } from './UploadProvider'

// En "Subir" ya se ve la lista completa; en el resto de páginas aparece la mini barra
export function UploadDockContainer() {
  const pathname = usePathname() ?? '/'
  const { snapshot, dismiss, dismissed } = useUploads()
  if (dismissed || HIDE_DOCK_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  return <UploadDock snapshot={snapshot} onDismiss={dismiss} />
}
