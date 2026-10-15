import type { IconName } from '@/components/ui/Icon'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  guestOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/subir', label: 'Subir recuerdos', icon: 'upload', guestOnly: true },
  { href: '/mis-recuerdos', label: 'Mis recuerdos', icon: 'image', guestOnly: true },
  { href: '/mis-likes', label: 'Mis likes', icon: 'heart', guestOnly: true },
  { href: '/descargar', label: 'Descargar álbum', icon: 'download' },
]

export function navFor(readOnly: boolean) {
  return readOnly ? NAV_ITEMS.filter((i) => !i.guestOnly) : NAV_ITEMS
}
