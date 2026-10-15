import Link from 'next/link'
import { buttonClass } from './Button'

interface Props {
  title: string
  text: string
  action?: { label: string; href: string }
}

export function EmptyState({ title, text, action }: Props) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-14 text-center">
      <img src="/assets/fondo/botellita-1.webp" alt="" width={160} height={100} className="mb-2 w-32 opacity-80" />
      <h2 className="font-serif text-2xl leading-tight">{title}</h2>
      <p className="text-sm leading-relaxed opacity-75">{text}</p>
      {action && (
        <Link href={action.href} className={buttonClass('primary', 'mt-3')}>
          {action.label}
        </Link>
      )}
    </div>
  )
}
