'use client'

import { Button } from '@/components/ui/Button'
import { Portal } from '@/components/ui/Portal'

interface Props {
  count: number
  total: number
  onSelectAll: () => void
  onClear: () => void
  onCancel: () => void
  onDelete: () => void
  onHide?: () => void
  onShow?: () => void
  busy?: string | null
}

const recuerdos = (n: number) => (n === 1 ? 'este recuerdo' : `estos ${n} recuerdos`)

// Barra fija abajo mientras se eligen varios recuerdos: contar, elegir todo, borrar y (admin) ocultar o mostrar
export function SelectionBar({ count, total, onSelectAll, onClear, onCancel, onDelete, onHide, onShow, busy = null }: Props) {
  const none = count === 0 || !!busy
  const all = total > 0 && count >= total

  function remove() {
    if (window.confirm(`¿Borrar ${recuerdos(count)}? También se borran de Google Drive y no se puede deshacer.`)) onDelete()
  }

  return (
    <Portal>
      <div className="aparecer fixed inset-x-3 bottom-4 z-50 mx-auto max-w-2xl md:bottom-6">
        <div
          role="toolbar"
          aria-label="Acciones con lo seleccionado"
          className="tarjeta flex flex-col gap-2.5 p-3 shadow-[0_18px_40px_rgb(90_18_56/0.22)] md:flex-row md:items-center md:p-4"
        >
          <div className="flex items-center justify-between gap-3 md:flex-1">
            <div className="min-w-0">
              <p role="status" className="whitespace-nowrap text-sm font-semibold">
                {busy ?? (count === 1 ? '1 seleccionado' : `${count} seleccionados`)}
              </p>
              <button
                type="button"
                onClick={all ? onClear : onSelectAll}
                disabled={!!busy}
                className="whitespace-nowrap text-xs font-semibold text-fucsia underline-offset-4 hover:underline disabled:opacity-50"
              >
                {all ? 'Quitar selección' : 'Elegir todo'}
              </button>
            </div>
            <Button variant="secondary" onClick={onCancel} disabled={!!busy} className="min-h-10 shrink-0 px-4 py-2">
              Cancelar
            </Button>
          </div>
          <div className="flex gap-2">
            {onHide && (
              <Button variant="secondary" icon="eyeOff" onClick={onHide} disabled={none} className="min-h-10 flex-1 px-3 py-2 md:flex-none">
                Ocultar
              </Button>
            )}
            {onShow && (
              <Button variant="secondary" icon="eye" onClick={onShow} disabled={none} className="min-h-10 flex-1 px-3 py-2 md:flex-none">
                Mostrar
              </Button>
            )}
            <Button icon="trash" onClick={remove} disabled={none} className="min-h-10 flex-1 whitespace-nowrap px-4 py-2 md:flex-none">
              {`Borrar (${count})`}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
