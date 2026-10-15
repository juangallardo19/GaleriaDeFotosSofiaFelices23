'use client'

import { useState, type ChangeEvent } from 'react'
import { MAX_FILES_PER_BATCH, validateBatch, type RejectReason } from '@/features/media/media-kind'
import { Icon } from '@/components/ui/Icon'

const REASONS: Record<RejectReason, string> = {
  'tipo-no-soportado': 'este tipo de archivo no se puede subir.',
  'muy-grande': 'pesa más de 1 GB.',
  vacio: 'el archivo está vacío.',
}

export function UploadPicker({ onSelect, disabled = false }: { onSelect: (files: File[]) => void; disabled?: boolean }) {
  const [messages, setMessages] = useState<string[]>([])

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const { accepted, rejected, overflow } = validateBatch(files)
    const notes = rejected.map((r) => `${r.file.name}: ${REASONS[r.reason]}`)
    if (overflow > 0) notes.push(`Se pueden subir hasta ${MAX_FILES_PER_BATCH} a la vez: ${overflow} ${overflow === 1 ? 'quedó' : 'quedaron'} por fuera.`)
    setMessages(notes)
    if (accepted.length > 0) onSelect(accepted.map((a) => a.file))
  }

  const tile = 'cosido relative flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-panel p-5 text-center transition-transform active:scale-[0.98]'

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className={`${tile} sombra-sticker bg-fucsia text-white ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
          <Icon name="image" size={30} />
          <span className="text-sm font-semibold">Elegir de la galería</span>
          <span className="text-[11px] opacity-85">Fotos y videos, varios a la vez</span>
          <input type="file" aria-label="Elegir de la galería" multiple accept="image/*,video/*" onChange={handle} disabled={disabled} className="sr-only" />
        </label>
        <label className={`${tile} border-[1.5px] border-fucsia bg-crema text-fucsia [--costura:rgb(212_175_55/0.8)] ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
          <Icon name="camera" size={30} strokeWidth={1.8} />
          <span className="text-sm font-semibold">Tomar foto o video</span>
          <span className="text-[11px] opacity-85">Con la cámara del celular</span>
          <input type="file" aria-label="Tomar foto o video" accept="image/*,video/*" capture="environment" onChange={handle} disabled={disabled} className="sr-only" />
        </label>
      </div>
      {messages.length > 0 && (
        <div role="alert" className="rounded-2xl border border-naranja/40 bg-[#FFF0D4] p-3 text-sm">
          <ul className="flex flex-col gap-1">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
