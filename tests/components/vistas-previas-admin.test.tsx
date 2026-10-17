import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.fn()
const postJson = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/contenido', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({
  ApiError: class extends Error {},
  api: (...args: unknown[]) => api(...args),
  postJson: (...args: unknown[]) => postJson(...args),
}))

import { ContentScreen } from '@/components/admin/ContentScreen'

beforeEach(() => {
  api.mockReset()
  postJson.mockReset()
  api.mockImplementation(async (url: string) => (url.startsWith('/api/media/resumen') ? { folders: null } : { items: [], nextCursor: null }))
})

describe('Vistas previas de los videos del iPhone desde el panel', () => {
  it('las crea con la miniatura de Drive y avisa cuántas quedaron listas y cuántas siguen en proceso', async () => {
    postJson.mockResolvedValue({ updated: 5, pending: 1 })
    render(<ContentScreen />)
    await userEvent.click(await screen.findByRole('button', { name: 'Vistas previas de videos' }))
    expect(postJson).toHaveBeenCalledWith('/api/admin/media/vistas-previas', {})
    expect(await screen.findByRole('status')).toHaveTextContent('5 videos con vista previa nueva. 1 sigue procesándose en Drive: intenta en unos minutos.')
  })

  it('si no falta ninguna, lo dice', async () => {
    postJson.mockResolvedValue({ updated: 0, pending: 0 })
    render(<ContentScreen />)
    await userEvent.click(await screen.findByRole('button', { name: 'Vistas previas de videos' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Todos los videos ya tienen vista previa.')
  })
})
