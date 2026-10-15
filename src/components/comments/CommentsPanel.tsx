'use client'

import { useEffect, useState } from 'react'
import type { CommentActor, Sticker } from '@/features/comments/comments'
import { api, postJson } from '@/lib/api'
import { CommentComposer } from './CommentComposer'
import { CommentItem, type CommentView } from './CommentItem'

interface ApiComment {
  id: string
  guestId: string
  body: string
  sticker: Sticker | null
  author: { id: string; name: string }
  createdAt: string
  editedAt: string | null
}

const toView = (c: ApiComment): CommentView => ({ ...c, createdAt: new Date(c.createdAt), editedAt: c.editedAt ? new Date(c.editedAt) : null })

interface Props {
  mediaId: string
  viewer: CommentActor
  onCountChange: (mediaId: string, count: number) => void
}

export function CommentsPanel({ mediaId, viewer, onCountChange }: Props) {
  const [items, setItems] = useState<CommentView[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api<{ items: ApiComment[] }>(`/api/media/${mediaId}/comments`)
      .then(({ items }) => alive && setItems(items.map(toView)))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'No se pudieron cargar los comentarios'))
    return () => {
      alive = false
    }
  }, [mediaId])

  const update = (next: CommentView[]) => {
    setItems(next)
    onCountChange(mediaId, next.length)
  }

  async function add(input: { text: string; sticker: Sticker | null }) {
    setError(null)
    try {
      const { comment } = await postJson<{ comment: ApiComment }>(`/api/media/${mediaId}/comments`, input)
      update([...(items ?? []), toView(comment)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comentar')
      throw err
    }
  }

  async function edit(id: string, text: string) {
    await postJson(`/api/comments/${id}`, { text }, 'PATCH')
    setItems((list) => list?.map((c) => (c.id === id ? { ...c, body: text, editedAt: new Date() } : c)) ?? null)
  }

  async function remove(id: string) {
    await api(`/api/comments/${id}`, { method: 'DELETE' })
    update((items ?? []).filter((c) => c.id !== id))
  }

  const canWrite = viewer.role !== 'visitor'

  return (
    <section aria-label="Comentarios" className="tarjeta mt-5 p-4 text-vino md:p-5">
      <h3 className="text-sm font-semibold">Comentarios {items ? `(${items.length})` : ''}</h3>
      {items === null && !error && <p className="mt-3 text-sm opacity-60">Cargando…</p>}
      {items?.length === 0 && <p className="mt-3 text-sm opacity-60">{canWrite ? 'Sé el primero en comentar.' : 'Todavía no hay comentarios.'}</p>}
      {items && items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3.5">
          {items.map((c) => (
            <CommentItem key={c.id} comment={c} viewer={viewer} onEdit={edit} onDelete={remove} />
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-fucsia">
          {error}
        </p>
      )}
      {canWrite && (
        <div className="mt-4">
          <CommentComposer onSubmit={add} />
        </div>
      )}
    </section>
  )
}
