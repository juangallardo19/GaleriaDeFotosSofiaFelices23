import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaCard, type CardMedia } from '@/components/gallery/MediaCard'
import { SelectionBar } from '@/components/gallery/SelectionBar'

const media = (p: Partial<CardMedia> = {}): CardMedia => ({
  id: 'm1',
  kind: 'photo',
  thumbUrl: 'https://blob.fake/t.webp',
  width: 600,
  height: 800,
  dominantColor: '#aa3366',
  durationSec: null,
  author: { name: 'Tía Marta' },
  likesCount: 2,
  commentsCount: 0,
  downloadsCount: 0,
  likedByViewer: false,
  ...p,
})

describe('Elegir varios recuerdos', () => {
  it('en modo selección, tocar la card la marca en vez de abrirla', async () => {
    const onOpen = vi.fn()
    const onSelect = vi.fn()
    render(<MediaCard media={media()} selecting selected={false} onSelect={onSelect} onOpen={onOpen} onToggleLike={() => {}} />)
    const check = screen.getByRole('checkbox', { name: 'Seleccionar foto de Tía Marta' })
    expect(check).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(check)
    expect(onSelect).toHaveBeenCalledWith('m1')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('muestra cuál está marcada y esconde el like mientras se elige', () => {
    render(<MediaCard media={media()} selecting selected onSelect={() => {}} onOpen={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Seleccionar foto de Tía Marta' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('button', { name: 'Me gusta' })).toBeNull()
  })

  it('fuera del modo selección todo sigue igual', () => {
    render(<MediaCard media={media()} onOpen={() => {}} onToggleLike={() => {}} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Abrir foto de Tía Marta' })).toBeInTheDocument()
  })
})

describe('Barra de acciones por lotes', () => {
  const base = { total: 8, onSelectAll: () => {}, onClear: () => {}, onCancel: () => {}, onDelete: () => {} }

  it('cuenta lo elegido', () => {
    const { rerender } = render(<SelectionBar {...base} count={3} />)
    expect(screen.getByText('3 seleccionados')).toBeInTheDocument()
    rerender(<SelectionBar {...base} count={1} />)
    expect(screen.getByText('1 seleccionado')).toBeInTheDocument()
  })

  it('borra lo elegido después de confirmar', async () => {
    const onDelete = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SelectionBar {...base} count={3} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar (3)' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('3 recuerdos'))
    expect(onDelete).toHaveBeenCalled()
  })

  it('si no confirma, no borra', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SelectionBar {...base} count={2} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar (2)' }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('sin nada elegido no se puede borrar', () => {
    render(<SelectionBar {...base} count={0} />)
    expect(screen.getByRole('button', { name: 'Borrar (0)' })).toBeDisabled()
  })

  it('elige todo o quita la selección', async () => {
    const onSelectAll = vi.fn()
    const onClear = vi.fn()
    const { rerender } = render(<SelectionBar {...base} count={3} onSelectAll={onSelectAll} onClear={onClear} />)
    await userEvent.click(screen.getByRole('button', { name: 'Elegir todo' }))
    expect(onSelectAll).toHaveBeenCalled()
    rerender(<SelectionBar {...base} count={8} onSelectAll={onSelectAll} onClear={onClear} />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar selección' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('el admin además puede ocultar y mostrar', async () => {
    const onHide = vi.fn()
    const onShow = vi.fn()
    render(<SelectionBar {...base} count={2} onHide={onHide} onShow={onShow} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(onHide).toHaveBeenCalled()
    expect(onShow).toHaveBeenCalled()
  })

  it('mientras trabaja muestra el avance y bloquea los botones', () => {
    render(<SelectionBar {...base} count={2} busy="Borrando 2 recuerdos…" />)
    expect(screen.getByText('Borrando 2 recuerdos…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Borrar (2)' })).toBeDisabled()
  })
})
