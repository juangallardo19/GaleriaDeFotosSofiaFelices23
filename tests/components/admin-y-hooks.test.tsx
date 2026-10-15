import { describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'
import { GuestTable, type GuestRow } from '@/components/admin/GuestTable'
import { NewGuestDialog } from '@/components/admin/NewGuestDialog'
import { useUploadQueue } from '@/hooks/useUploadQueue'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { UploadQueue } from '@/features/upload/upload-queue'

describe('RF-14 · login del admin', () => {
  it('envía la contraseña y avisa si es incorrecta', async () => {
    const login = vi.fn(async () => false)
    render(<AdminLoginForm login={login} onSuccess={() => {}} />)
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(login).toHaveBeenCalledWith('mala')
    expect(await screen.findByRole('alert')).toHaveTextContent('Contraseña incorrecta')
  })

  it('con la contraseña correcta entra', async () => {
    const onSuccess = vi.fn()
    render(<AdminLoginForm login={async () => true} onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText('Contraseña'), 'buena')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('el campo es de tipo contraseña', () => {
    render(<AdminLoginForm login={async () => true} onSuccess={() => {}} />)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })
})

const rows: GuestRow[] = [
  { id: 'g1', name: 'Tía Marta', url: 'https://x/i/1', online: true, entered: true, uploads: 12 },
  { id: 'g2', name: 'Primo Andrés', url: 'https://x/i/2', online: false, entered: false, uploads: 0 },
]

describe('RF-14 · tabla de invitados', () => {
  it('muestra nombre, estado y recuerdos', () => {
    render(<GuestTable rows={rows} onShowQr={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('row', { name: /Tía Marta.*Entró.*12/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Primo Andrés.*Aún no entra.*0/ })).toBeInTheDocument()
  })

  it('busca sin importar tildes', async () => {
    render(<GuestTable rows={rows} onShowQr={() => {}} onDelete={() => {}} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar invitado' }), 'andres')
    expect(screen.queryByText('Tía Marta')).toBeNull()
    expect(screen.getByText('Primo Andrés')).toBeInTheDocument()
  })

  it('permite ver el QR y eliminar con confirmación', async () => {
    const onShowQr = vi.fn()
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<GuestTable rows={rows} onShowQr={onShowQr} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver QR de Tía Marta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar a Tía Marta' }))
    expect(onShowQr).toHaveBeenCalledWith('g1')
    expect(onDelete).toHaveBeenCalledWith('g1')
  })

  it('el lápiz permite cambiar el nombre', async () => {
    const onRename = vi.fn(async () => {})
    render(<GuestTable rows={rows} onShowQr={() => {}} onDelete={() => {}} onRename={onRename} />)
    await userEvent.click(screen.getByRole('button', { name: 'Editar a Tía Marta' }))
    const input = screen.getByRole('textbox', { name: 'Nuevo nombre de Tía Marta' })
    expect(input).toHaveValue('Tía Marta')
    await userEvent.clear(input)
    await userEvent.type(input, 'Tía Marta Gómez')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))
    expect(onRename).toHaveBeenCalledWith('g1', 'Tía Marta Gómez')
    expect(screen.queryByRole('textbox', { name: 'Nuevo nombre de Tía Marta' })).toBeNull()
  })

  it('al editar, vacío no se guarda y Escape cancela', async () => {
    const onRename = vi.fn(async () => {})
    render(<GuestTable rows={rows} onShowQr={() => {}} onDelete={() => {}} onRename={onRename} />)
    await userEvent.click(screen.getByRole('button', { name: 'Editar a Primo Andrés' }))
    await userEvent.clear(screen.getByRole('textbox', { name: 'Nuevo nombre de Primo Andrés' }))
    expect(screen.getByRole('button', { name: 'Guardar nombre' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Nuevo nombre de Primo Andrés' })).toBeNull()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('si no confirma, no elimina', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<GuestTable rows={rows} onShowQr={() => {}} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar a Tía Marta' }))
    expect(onDelete).not.toHaveBeenCalled()
  })
})

describe('RF-14 · nuevo invitado', () => {
  it('crea el invitado y muestra su QR', async () => {
    const create = vi.fn(async (name: string) => ({ name, url: 'https://x/i/abc', qr: 'data:image/png;base64,AAA' }))
    render(<NewGuestDialog open create={create} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Nombre del invitado'), 'Prima Valentina')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar invitado' }))
    expect(create).toHaveBeenCalledWith('Prima Valentina')
    expect(await screen.findByRole('img', { name: 'QR de Prima Valentina' })).toHaveAttribute('src', 'data:image/png;base64,AAA')
    expect(screen.getByRole('link', { name: 'Descargar QR (PNG)' })).toHaveAttribute('download', 'QR - Prima Valentina.png')
  })

  it('no deja guardar sin nombre', () => {
    render(<NewGuestDialog open create={async () => ({ name: '', url: '', qr: '' })} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Guardar invitado' })).toBeDisabled()
  })
})

describe('Hook de la cola de subida', () => {
  it('expone el progreso y avisa antes de cerrar mientras sube', async () => {
    let finish!: () => void
    const queue = new UploadQueue({ uploader: () => new Promise<void>((r) => (finish = r)) })
    const { result } = renderHook(() => useUploadQueue(queue, 'Álbum de Sofi'))
    act(() => {
      queue.add([{ name: 'a.jpg', size: 100, type: 'image/jpeg' }])
      queue.start()
    })
    expect(result.current.active).toBe(1)
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.title).toMatch(/Subiendo · Álbum de Sofi/)
    await act(async () => {
      finish()
      await queue.onIdle()
    })
    expect(result.current.done).toBe(1)
    expect(document.title).toBe('Álbum de Sofi')
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })
})

describe('Accesibilidad: reducir movimiento', () => {
  it('lee la preferencia del sistema', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }) as never
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })
})
