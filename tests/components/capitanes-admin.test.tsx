import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.fn()
const postJson = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/capitanes', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({
  ApiError: class extends Error {},
  api: (...args: unknown[]) => api(...args),
  postJson: (...args: unknown[]) => postJson(...args),
}))

import { CaptainsScreen } from '@/components/admin/CaptainsScreen'

const ANDRES = { id: 'c1', name: 'Andres', title: 'capitan' }

beforeEach(() => {
  api.mockReset()
  postJson.mockReset()
  postJson.mockImplementation(async (_url: string, body: { items: unknown[] }) => ({
    items: body.items.map((item, i) => ({ id: `c${i + 1}`, ...(item as object) })),
  }))
})

describe('Capitanes de mesa en el panel', () => {
  it('agrega una capitana y aparece en la lista, lista para imprimir', async () => {
    api.mockResolvedValue({ items: [] })
    render(<CaptainsScreen />)
    expect(await screen.findByText('Todavía no hay capitanes de mesa.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Juliana')
    await userEvent.click(screen.getByRole('radio', { name: 'Capitana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(postJson).toHaveBeenCalledWith('/api/admin/capitanes', { items: [{ name: 'Juliana', title: 'capitana' }] }, 'PUT')
    expect(await screen.findByRole('listitem', { name: 'Juliana' })).toHaveTextContent('Capitana de mesa')
    expect(screen.getByRole('link', { name: /Descargar PDF \(1 hoja\)/ })).toHaveAttribute('href', '/api/admin/capitanes/tarjetas')
  })

  it('para dos o más en la misma mesa se elige Capitanes', async () => {
    api.mockResolvedValue({ items: [] })
    render(<CaptainsScreen />)
    await screen.findByText('Todavía no hay capitanes de mesa.')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Juliana y Andrés')
    await userEvent.click(screen.getByRole('radio', { name: 'Capitanes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(postJson).toHaveBeenCalledWith('/api/admin/capitanes', { items: [{ name: 'Juliana y Andrés', title: 'capitanes' }] }, 'PUT')
    expect(await screen.findByRole('listitem', { name: 'Juliana y Andrés' })).toHaveTextContent('Capitanes de mesa')
  })

  it('cambia el nombre con el lápiz y conserva el mismo capitán', async () => {
    api.mockResolvedValue({ items: [ANDRES] })
    render(<CaptainsScreen />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar a Andres' }))
    const campo = screen.getByRole('textbox', { name: 'Nuevo nombre de Andres' })
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Andrés')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(postJson).toHaveBeenCalledWith('/api/admin/capitanes', { items: [{ id: 'c1', name: 'Andrés', title: 'capitan' }] }, 'PUT')
    expect(await screen.findByRole('listitem', { name: 'Andrés' })).toBeInTheDocument()
  })

  it('borra un capitán después de confirmar', async () => {
    api.mockResolvedValue({ items: [ANDRES] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CaptainsScreen />)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar a Andres' }))
    expect(postJson).toHaveBeenCalledWith('/api/admin/capitanes', { items: [] }, 'PUT')
    expect(await screen.findByText('Todavía no hay capitanes de mesa.')).toBeInTheDocument()
  })

  it('deja ver las tarjetas en el navegador y muestra la vista previa con el nombre en cursiva', async () => {
    api.mockResolvedValue({ items: [ANDRES] })
    render(<CaptainsScreen />)
    const ver = await screen.findByRole('link', { name: 'Ver tarjetas' })
    expect(ver).toHaveAttribute('href', '/api/admin/capitanes/tarjetas?ver=1')
    expect(ver).toHaveAttribute('target', '_blank')
    expect(screen.getByTestId('vista-capitan-nombre')).toHaveTextContent('Andres')
    expect(screen.getByTestId('vista-capitan-nombre')).toHaveClass('font-script')
  })
})
