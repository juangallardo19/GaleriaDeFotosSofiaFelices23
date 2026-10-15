import { presenceLabel } from '@/features/presence/presence'

export function PresenceBadge({ count }: { count: number }) {
  const label = presenceLabel(count)
  if (!label) return null
  return (
    <p role="status" className="inline-flex items-center gap-2 rounded-chip border border-vino/15 bg-white/70 px-3.5 py-1.5 text-xs font-semibold">
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2fb36b] opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-[#2fb36b]" />
      </span>
      {label}
    </p>
  )
}
