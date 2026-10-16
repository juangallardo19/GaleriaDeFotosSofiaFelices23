import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CARD_MESSAGE } from '@/features/admin/card-text'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/tarjetas', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ items: [{ id: 'g1', name: 'Albita' }] })) }))

import { CardsScreen } from '@/components/admin/CardsScreen'

describe('Pantalla de tarjetas QR', () => {
  it('la vista previa muestra el nombre del invitado arriba, grande y en cursiva, con el mensaje de la tarjeta', async () => {
    render(<CardsScreen />)
    const nombre = await screen.findByText('Albita')
    expect(nombre).toHaveClass('font-script')
    expect(screen.getByText(CARD_MESSAGE)).toBeInTheDocument()
  })

  it('deja ver el PDF en el navegador antes de descargarlo para imprimir', async () => {
    render(<CardsScreen />)
    const ver = await screen.findByRole('link', { name: 'Ver tarjetas' })
    expect(ver).toHaveAttribute('href', '/api/admin/cards?ver=1')
    expect(ver).toHaveAttribute('target', '_blank')
    expect(await screen.findByRole('link', { name: /Descargar PDF \(1 hoja\)/ })).toHaveAttribute('href', '/api/admin/cards')
  })
})
