import { STORAGE_THRESHOLDS } from '@/features/storage/quota'
import { formatBytes } from '@/lib/format'

export function StorageBar({ usedBytes, limitBytes }: { usedBytes: number; limitBytes: number }) {
  const ratio = limitBytes > 0 ? usedBytes / limitBytes : 0
  const percent = Math.round(ratio * 100)
  const alert = ratio >= STORAGE_THRESHOLDS[0]
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] opacity-75">{`${formatBytes(usedBytes)} de ${formatBytes(limitBytes)}`}</p>
      <div
        role="progressbar"
        aria-label="Espacio usado en Drive"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        data-alerta={alert ? 'true' : 'false'}
        className="h-2 overflow-hidden rounded-full bg-fucsia/12"
      >
        <div
          className={`h-full rounded-full ${alert ? 'bg-naranja' : 'bg-gradient-to-r from-fucsia to-naranja'}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}
