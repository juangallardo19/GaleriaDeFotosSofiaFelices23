import { USER_ICONS } from './user-icons'

const PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
  sort: 'M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  home: 'M4 11l8-6.5 8 6.5V20h-5v-5H9v5H4z',
  lock: 'M6.5 11h11a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  trash: 'M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7M6.5 7l.8 11.6a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v5M14 11v5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM14.5 7.5l2 2',
  copy: 'M9 9h10.5a.5.5 0 0 1 .5.5V20a.5.5 0 0 1-.5.5H9a.5.5 0 0 1-.5-.5V9.5A.5.5 0 0 1 9 9zM15.5 9V4.5a.5.5 0 0 0-.5-.5H4.5a.5.5 0 0 0-.5.5V15a.5.5 0 0 0 .5.5h4',
  alert: 'M12 4l9 15.5H3zM12 10v4.5M12 17.2v.1',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.9 3.6M6.4 7.5A15.6 15.6 0 0 0 2.5 12s3.5 6 9.5 6a9 9 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.3 3.2-5.5 6.5-5.5s5.9 2.2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.2 2.6 3.5 5.2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  printer: 'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  logout: 'M15 4.5h3.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H15M10 8l-4 4 4 4M6 12h10',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 18.5v1.5M18.5 14H20',
  retry: 'M20 11.5A8 8 0 1 0 17.7 17M20 5v6.5h-6.5',
  camera: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.5-2h5.4l1.5 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  folder: 'M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const

type PathIcon = keyof typeof PATHS
export type IconName = PathIcon | 'heart' | 'comment' | 'download' | 'upload' | 'plus' | 'image' | 'play' | 'send' | 'album' | 'chevronLeft'

interface Props {
  name: IconName
  size?: number
  filled?: boolean
  strokeWidth?: number
  className?: string
}

export function Icon({ name, size = 20, filled = false, strokeWidth = 1.8, className }: Props) {
  const user = USER_ICONS[name]
  if (user) {
    const body = user.body
      .split('{{C}}')
      .join('currentColor')
      .split('{{F}}')
      .join(filled ? 'currentColor' : 'none')
      .split('{{SW}}')
      .join(String(strokeWidth * 0.9))
    return (
      <svg
        width={size}
        height={size}
        viewBox={user.viewBox}
        fill={user.rootFill ? 'currentColor' : 'none'}
        aria-hidden="true"
        focusable="false"
        className={className}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d={PATHS[name as PathIcon]} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
