import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SOFI_FRAME, SofiPortrait } from '@/components/ui/SofiPortrait'

// En sofi.webp (656 × 900) la cara está en x = 380 px
const CARA_X = 380 / 656

describe('Foto de Sofi en la polaroid', () => {
  it('mantiene la polaroid cuadrada de siempre', () => {
    render(<SofiPortrait />)
    expect(screen.getByRole('img', { name: 'Sofi' }).parentElement).toHaveClass('aspect-square')
  })

  it('deja la cara de Sofi en el centro del marco', () => {
    const centro = SOFI_FRAME.left + CARA_X * SOFI_FRAME.width
    expect(centro).toBeCloseTo(50, 0)
  })

  it('no corta el pompón del gorro', () => {
    expect(SOFI_FRAME.top).toBeGreaterThanOrEqual(0)
  })
})
