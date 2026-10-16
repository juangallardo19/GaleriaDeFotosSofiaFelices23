import type { QueueSnapshot, TaskStatus, UploadTask } from '@/features/upload/upload-queue'
import { formatBytes } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'

interface Props {
  snapshot: QueueSnapshot
  onRetry: (id: string) => void
  onCancel: (id: string) => void
}

const STATUS_TEXT: Record<Exclude<TaskStatus, 'subiendo'>, string> = {
  'en-cola': 'En cola',
  listo: 'Listo',
  error: 'No se pudo subir',
  cancelado: 'Cancelado',
}

function percent(part: number, total: number) {
  return total > 0 ? Math.floor((part / total) * 100) : 0
}

function TaskRow({ task, onRetry, onCancel }: { task: UploadTask; onRetry: Props['onRetry']; onCancel: Props['onCancel'] }) {
  const isVideo = task.file.type.startsWith('video/') || /\.(mov|mp4|webm|3gp|m4v)$/i.test(task.file.name)
  const progress = task.status === 'listo' ? 100 : percent(task.uploadedBytes, task.file.size)
  return (
    <li className="tarjeta flex items-center gap-3 p-3">
      <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isVideo ? 'bg-[#FFF0D4] text-naranja' : 'bg-rosa text-fucsia'}`}>
        <Icon name={isVideo ? 'play' : 'image'} size={20} filled={isVideo} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-semibold">{task.file.name}</p>
          <p className={`shrink-0 text-xs font-semibold ${task.status === 'error' ? 'text-fucsia' : task.status === 'listo' ? 'text-[#2a8a55]' : 'opacity-70'}`}>
            {task.status === 'subiendo' ? `${progress} %` : STATUS_TEXT[task.status]}
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fucsia/10">
            <div className={`h-full rounded-full transition-[width] ${task.status === 'error' ? 'bg-fucsia/40' : 'bg-gradient-to-r from-fucsia to-naranja'}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] opacity-60">{formatBytes(task.file.size)}</span>
        </div>
        {task.error && task.status === 'error' && <p className="mt-1 text-[11px] opacity-70">{task.error}</p>}
      </div>
      {task.status === 'error' && (
        <button type="button" aria-label={`Reintentar ${task.file.name}`} onClick={() => onRetry(task.id)} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rosa text-fucsia">
          <Icon name="retry" size={18} strokeWidth={2} />
        </button>
      )}
      {(task.status === 'en-cola' || task.status === 'subiendo') && (
        <button type="button" aria-label={`Cancelar ${task.file.name}`} onClick={() => onCancel(task.id)} className="flex size-11 shrink-0 items-center justify-center rounded-xl opacity-60 hover:opacity-100">
          <Icon name="close" size={18} strokeWidth={2} />
        </button>
      )}
    </li>
  )
}

export function UploadList({ snapshot, onRetry, onCancel }: Props) {
  const total = snapshot.tasks.length
  if (total === 0) return null
  const overall = percent(snapshot.uploadedBytes, snapshot.totalBytes)
  const busy = !snapshot.isIdle
  return (
    <section aria-label="Archivos en subida" className="flex flex-col gap-4">
      <div className="tarjeta p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-base font-semibold">{busy ? `Subiendo ${Math.min(total, snapshot.done + snapshot.active)} de ${total}` : `${snapshot.done} de ${total} recuerdos subidos`}</p>
          <p className="font-serif text-2xl text-fucsia">{`${overall} %`}</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-fucsia/10">
          <div className="h-full rounded-full bg-gradient-to-r from-fucsia to-naranja transition-[width] duration-300" style={{ width: `${overall}%` }} />
        </div>
        {busy && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed opacity-80">
            <Icon name="alert" size={16} strokeWidth={2} className="mt-px shrink-0 text-naranja" />
            No bloquees la pantalla. Puedes seguir viendo el álbum mientras sube (verás el avance abajo), pero si cierras o sales de la página, la subida se detiene.
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-2.5">
        {snapshot.tasks.map((t) => (
          <TaskRow key={t.id} task={t} onRetry={onRetry} onCancel={onCancel} />
        ))}
      </ul>
    </section>
  )
}
