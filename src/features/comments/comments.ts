export const STICKERS = ['gato-aplaudiendo'] as const
export type Sticker = (typeof STICKERS)[number]
export const MAX_COMMENT_CHARS = 500

export const STICKER_INFO: Record<Sticker, { src: string; alt: string }> = {
  'gato-aplaudiendo': { src: '/stickers/gato-aplaudiendo.webp', alt: 'Sticker: gato aplaudiendo' },
}

export type CommentInput = { text: string; sticker?: string | null }
export type CommentError = 'vacio' | 'muy-largo' | 'sticker-invalido'

export function isSticker(value: unknown): value is Sticker {
  return typeof value === 'string' && (STICKERS as readonly string[]).includes(value)
}

export function validateComment(input: CommentInput): { ok: true; value: { text: string; sticker: Sticker | null } } | { ok: false; error: CommentError } {
  const text = (input.text ?? '').trim()
  const sticker = input.sticker ?? null
  if (sticker !== null && !isSticker(sticker)) return { ok: false, error: 'sticker-invalido' }
  if (!text && !sticker) return { ok: false, error: 'vacio' }
  // Contar por puntos de código para que un emoji cuente como un carácter
  if ([...text].length > MAX_COMMENT_CHARS) return { ok: false, error: 'muy-largo' }
  return { ok: true, value: { text, sticker } }
}

export interface CommentActor {
  id: string
  role: 'guest' | 'admin' | 'visitor'
}

export function canEditComment(actor: CommentActor, comment: { guestId: string }): boolean {
  return actor.role === 'guest' && actor.id === comment.guestId
}

export function canDeleteComment(actor: CommentActor, comment: { guestId: string }): boolean {
  return actor.role === 'admin' || actor.id === comment.guestId
}
