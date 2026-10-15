'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface Props {
  login: (password: string) => Promise<boolean>
  onSuccess: () => void
}

export function AdminLoginForm({ login, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || sending) return
    setSending(true)
    setError(null)
    try {
      if (await login(password)) onSuccess()
      else setError('Contraseña incorrecta')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar, intenta de nuevo')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="clave-admin" className="text-sm font-semibold">
        Contraseña
      </label>
      <div className="relative -mt-2">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60">
          <Icon name="lock" size={18} strokeWidth={2} />
        </span>
        <input
          id="clave-admin"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-linea bg-white px-11 text-base outline-fucsia"
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar lo escrito' : 'Ver lo escrito'}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center opacity-60"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} strokeWidth={2} />
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rosa px-3 py-2 text-sm font-semibold text-fucsia">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!password || sending}>
        {sending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
