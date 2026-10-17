import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/enlaces', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, api: (...args: unknown[]) => api(...args), postJson: vi.fn() }))

import { LinksScreen } from '@/components/admin/LinksScreen'

const ALBITA = { id: 'g1', name: 'Albita', url: 'https://sofia-felices-23.vercel.app/i/AAAAAAAAAAAAAAAAAAAAAA' }
const JOSUE = { id: 'g2', name: 'Josué', url: 'https://sofia-felices-23.vercel.app/i/BBBBBBBBBBBBBBBBBBBBBB' }
let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue({ items: [ALBITA, JOSUE] })
  writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

describe('Enlaces para enviar a los invitados sin escanear el QR', () => {
  it('muestra el link personal de cada invitado y lo copia', async () => {
    render(<LinksScreen />)
    const fila = await screen.findByRole('listitem', { name: 'Albita' })
    expect(fila).toHaveTextContent(ALBITA.url)
    await userEvent.click(within(fila).getByRole('button', { name: 'Copiar enlace de Albita' }))
    expect(writeText).toHaveBeenCalledWith(ALBITA.url)
    expect(await within(fila).findByText('¡Copiado!')).toBeInTheDocument()
  })

  it('lo envía por WhatsApp con un mensaje ya escrito', async () => {
    render(<LinksScreen />)
    const fila = await screen.findByRole('listitem', { name: 'Josué' })
    const whatsapp = within(fila).getByRole('link', { name: 'Enviar a Josué por WhatsApp' })
    const href = new URL(whatsapp.getAttribute('href')!)
    expect(href.origin).toBe('https://wa.me')
    expect(href.searchParams.get('text')).toContain('Hola Josué')
    expect(href.searchParams.get('text')).toContain(JOSUE.url)
    expect(whatsapp).toHaveAttribute('target', '_blank')
  })

  it('copia todos los enlaces juntos, uno por línea con el nombre', async () => {
    render(<LinksScreen />)
    await screen.findByRole('listitem', { name: 'Albita' })
    await userEvent.click(screen.getByRole('button', { name: 'Copiar todos' }))
    expect(writeText).toHaveBeenCalledWith(`Albita: ${ALBITA.url}\nJosué: ${JOSUE.url}`)
  })

  it('busca por nombre, sin importar tildes', async () => {
    render(<LinksScreen />)
    await screen.findByRole('listitem', { name: 'Albita' })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar invitado' }), 'josue')
    expect(screen.queryByRole('listitem', { name: 'Albita' })).toBeNull()
    expect(screen.getByRole('listitem', { name: 'Josué' })).toBeInTheDocument()
  })

  it('también da el link general del álbum, que deja ver y descargar pero no subir', async () => {
    render(<LinksScreen />)
    const general = await screen.findByRole('region', { name: 'Link general del álbum' })
    expect(general).toHaveTextContent(window.location.origin)
    expect(general).toHaveTextContent('ver y descargar')
    await userEvent.click(within(general).getByRole('button', { name: 'Copiar link general' }))
    expect(writeText).toHaveBeenCalledWith(window.location.origin)
  })
})
