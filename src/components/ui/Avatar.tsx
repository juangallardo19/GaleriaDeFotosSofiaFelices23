import { initials } from '@/lib/format'

const TONES = ['#FCE1EA', '#FFE6CC', '#EFE1F2', '#FFF0D4', '#FAD4DF', '#F3DCCF']

function toneFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-naranja/60 font-semibold text-fucsia"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), backgroundColor: toneFor(name) }}
    >
      {initials(name)}
    </span>
  )
}
