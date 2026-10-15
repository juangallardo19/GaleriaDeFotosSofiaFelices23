import { describe, expect, it, vi } from 'vitest'
import { STICKERS, canDeleteComment, canEditComment, validateComment } from '@/features/comments/comments'
import { createToggleLike, type LikeState } from '@/features/likes/like-command'

describe('RF-09 · comentarios', () => {
  it('acepta texto con emojis y lo recorta', () => {
    expect(validateComment({ text: '  ¡Qué hermosa! 😍🎉  ' })).toEqual({ ok: true, value: { text: '¡Qué hermosa! 😍🎉', sticker: null } })
  })

  it('acepta solo el sticker del gato aplaudiendo, con o sin texto', () => {
    expect(STICKERS).toEqual(['gato-aplaudiendo'])
    expect(validateComment({ text: '', sticker: 'gato-aplaudiendo' })).toEqual({ ok: true, value: { text: '', sticker: 'gato-aplaudiendo' } })
    expect(validateComment({ text: 'jaja', sticker: 'otro' })).toEqual({ ok: false, error: 'sticker-invalido' })
  })

  it('rechaza comentarios vacíos o de más de 500 caracteres', () => {
    expect(validateComment({ text: '   ' })).toEqual({ ok: false, error: 'vacio' })
    expect(validateComment({ text: 'a'.repeat(501) })).toEqual({ ok: false, error: 'muy-largo' })
    expect(validateComment({ text: '😍'.repeat(500) }).ok).toBe(true)
  })

  const comment = { guestId: 'autor' }
  it('solo el autor puede editar su comentario', () => {
    expect(canEditComment({ id: 'autor', role: 'guest' }, comment)).toBe(true)
    expect(canEditComment({ id: 'otro', role: 'guest' }, comment)).toBe(false)
    expect(canEditComment({ id: 'admin1', role: 'admin' }, comment)).toBe(false)
  })

  it('el autor o el admin pueden borrarlo; un tercero no', () => {
    expect(canDeleteComment({ id: 'autor', role: 'guest' }, comment)).toBe(true)
    expect(canDeleteComment({ id: 'admin1', role: 'admin' }, comment)).toBe(true)
    expect(canDeleteComment({ id: 'otro', role: 'guest' }, comment)).toBe(false)
  })
})

describe('RF-08 · like optimista con deshacer (Command)', () => {
  function store(initial: LikeState) {
    let s = initial
    return { get: () => s, set: vi.fn((v: LikeState) => void (s = v)) }
  }

  it('actualiza la interfaz al instante y luego confirma con el servidor', async () => {
    const st = store({ liked: false, count: 4 })
    let release!: () => void
    const api = vi.fn(() => new Promise<LikeState>((r) => (release = () => r({ liked: true, count: 6 }))))
    const cmd = createToggleLike({ store: st, api })
    const done = cmd.execute()
    expect(st.get()).toEqual({ liked: true, count: 5 })
    release()
    await done
    expect(st.get()).toEqual({ liked: true, count: 6 })
    expect(api).toHaveBeenCalledWith(true)
  })

  it('si el servidor falla, revierte el cambio', async () => {
    const st = store({ liked: true, count: 3 })
    const cmd = createToggleLike({ store: st, api: async () => Promise.reject(new Error('sin red')) })
    await expect(cmd.execute()).rejects.toThrow('sin red')
    expect(st.get()).toEqual({ liked: true, count: 3 })
  })

  it('undo deja todo como estaba', async () => {
    const st = store({ liked: false, count: 0 })
    const api = vi.fn(async (liked: boolean) => ({ liked, count: liked ? 1 : 0 }))
    const cmd = createToggleLike({ store: st, api })
    await cmd.execute()
    await cmd.undo()
    expect(st.get()).toEqual({ liked: false, count: 0 })
    expect(api).toHaveBeenLastCalledWith(false)
  })
})
