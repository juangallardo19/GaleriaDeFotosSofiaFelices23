import Link from 'next/link'
import { buttonClass } from './Button'
import { Reveal } from './Reveal'

interface Props {
  title: string
  text: string
  action?: { label: string; href: string }
}

export function EmptyState({ title, text, action }: Props) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-14 text-center">
      <Reveal variant="zoom">
        <img
          src="/assets/fondo/botellita-1.webp"
          alt=""
          width={160}
          height={100}
          className="mb-2 w-32 origin-bottom opacity-80 [animation:balanceo_3s_ease-in-out_infinite]"
        />
      </Reveal>
      <Reveal delay={120}>
        <h2 className="font-serif text-2xl leading-tight">{title}</h2>
      </Reveal>
      <Reveal delay={220}>
        <p className="text-sm leading-relaxed opacity-75">{text}</p>
      </Reveal>
      {action && (
        <Reveal delay={320} variant="zoom">
          <Link href={action.href} className={buttonClass('primary', 'mt-3')}>
            {action.label}
          </Link>
        </Reveal>
      )}
    </div>
  )
}
