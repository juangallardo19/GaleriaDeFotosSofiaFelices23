import { Icon } from '@/components/ui/Icon'

export function NewItemsPill({ count, onShow }: { count: number; onShow: () => void }) {
  if (count <= 0) return null
  const label = count === 1 ? '1 recuerdo nuevo' : `${count} recuerdos nuevos`
  return (
    <button
      type="button"
      onClick={onShow}
      className="cosido sombra-sticker aparecer relative inline-flex min-h-11 items-center gap-2 rounded-chip bg-fucsia px-5 text-sm font-semibold text-white"
    >
      <Icon name="chevronDown" size={16} strokeWidth={2.4} className="rotate-180" />
      {label}
    </button>
  )
}
