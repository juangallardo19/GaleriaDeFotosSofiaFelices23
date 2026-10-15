'use client'

import { useState, type FormEvent } from 'react'
import { MAX_COMMENT_CHARS, STICKER_INFO, type Sticker } from '@/features/comments/comments'
import { Icon } from '@/components/ui/Icon'

interface Props {
  onSubmit: (input: { text: string; sticker: Sticker | null }) => Promise<void>
}

const GATO: Sticker = 'gato-aplaudiendo'

export function CommentComposer({ onSubmit }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const empty = text.trim().length === 0

  async function send(input: { text: string; sticker: Sticker | null }) {
    setSending(true)
    try {
      await onSubmit(input)
      if (!input.sticker) setText('')
    } finally {
      setSending(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!empty && !sending) void send({ text: text.trim(), sticker: null })
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <button
        type="button"
        aria-label="Enviar sticker: gato aplaudiendo"
        disabled={sending}
        onClick={() => void send({ text: '', sticker: GATO })}
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-linea bg-white/80 p-1"
      >
        <img src={STICKER_INFO[GATO].src} alt="" width={40} height={40} className="h-full w-full object-contain" />
      </button>
      <textarea
        aria-label="Escribe un comentario"
        placeholder="Escribe un comentario…"
        value={text}
        maxLength={MAX_COMMENT_CHARS}
        rows={1}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) submit(e)
        }}
        className="min-h-11 flex-1 resize-none rounded-2xl border border-linea bg-white px-3.5 py-2.5 text-sm text-vino outline-fucsia"
      />
      <button
        type="submit"
        aria-label="Enviar comentario"
        disabled={empty || sending}
        className="sombra-sticker flex size-11 shrink-0 items-center justify-center rounded-2xl bg-fucsia text-white disabled:opacity-45"
      >
        <Icon name="send" size={20} filled />
      </button>
    </form>
  )
}
