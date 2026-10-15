'use client'

import { useState } from 'react'
import { MAX_COMMENT_CHARS, STICKER_INFO, canDeleteComment, canEditComment, type CommentActor, type Sticker } from '@/features/comments/comments'
import { timeAgo } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'

export interface CommentView {
  id: string
  guestId: string
  body: string
  sticker: Sticker | null
  author: { name: string }
  createdAt: Date
  editedAt: Date | null
}

interface Props {
  comment: CommentView
  viewer: CommentActor
  now?: Date
  onEdit: (id: string, text: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}

export function CommentItem({ comment, viewer, now, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const canEdit = canEditComment(viewer, comment)
  const canDelete = canDeleteComment(viewer, comment)
  const sticker = comment.sticker ? STICKER_INFO[comment.sticker] : null

  async function save() {
    const text = draft.trim()
    if (!text && !comment.sticker) return
    await onEdit(comment.id, text)
    setEditing(false)
  }

  return (
    <li className="flex gap-2.5">
      <Avatar name={comment.author.name} size={30} />
      <div className="min-w-0 flex-1">
        <p className="text-xs">
          <span className="font-semibold">{comment.author.name}</span> <span className="opacity-60">{timeAgo(comment.createdAt, now)}</span>{' '}
          {comment.editedAt && <span className="opacity-60">(editado)</span>}
        </p>
        {editing ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              aria-label="Editar el comentario"
              value={draft}
              maxLength={MAX_COMMENT_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-linea bg-white px-3 py-2 text-sm outline-fucsia"
            />
            <div className="flex gap-2 text-xs font-semibold">
              <button type="button" onClick={save} className="min-h-9 rounded-xl bg-fucsia px-3 text-white">
                Guardar
              </button>
              <button type="button" onClick={() => setEditing(false)} className="min-h-9 rounded-xl px-3">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            {comment.body && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-snug">{comment.body}</p>}
            {sticker && <img src={sticker.src} alt={sticker.alt} width={96} height={96} className="mt-1 h-24 w-auto" />}
          </>
        )}
      </div>
      {!editing && (canEdit || canDelete) && (
        <div className="flex shrink-0 items-start gap-0.5">
          {canEdit && (
            <button type="button" aria-label="Editar comentario" onClick={() => setEditing(true)} className="flex size-9 items-center justify-center rounded-xl opacity-60 hover:bg-rosa hover:opacity-100">
              <Icon name="edit" size={16} strokeWidth={2} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              aria-label="Borrar comentario"
              onClick={() => window.confirm('¿Borrar este comentario?') && onDelete(comment.id)}
              className="flex size-9 items-center justify-center rounded-xl opacity-60 hover:bg-rosa hover:opacity-100"
            >
              <Icon name="trash" size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
