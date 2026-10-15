import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { MediaCard, type CardMedia } from '@/components/gallery/MediaCard'
import { SkeletonCard } from '@/components/gallery/SkeletonCard'
import { NewItemsPill } from '@/components/gallery/NewItemsPill'
import { PresenceBadge } from '@/components/gallery/PresenceBadge'

const media = (p: Partial<CardMedia> = {}): CardMedia => ({
  id: 'm1',
  kind: 'photo',
  thumbUrl: 'https://blob.fake/t.webp',
  width: 600,
  height: 800,
  dominantColor: '#aa3366',
  durationSec: null,
  author: { name: 'Tía Marta' },
  likesCount: 24,
  commentsCount: 5,
  downloadsCount: 12,
  likedByViewer: false,
  ...p,
})

describe('Botón "etiqueta cosida"', () => {
  it('es un botón accesible con su variante', () => {
    render(<Button variant="secondary">Subir más</Button>)
    const b = screen.getByRole('button', { name: 'Subir más' })
    expect(b).toHaveAttribute('data-variant', 'secondary')
    expect(b).toHaveAttribute('type', 'button')
  })

  it('RNF-15 · área táctil de al menos 44 px', () => {
    render(<Button>Entrar</Button>)
    expect(screen.getByRole('button', { name: 'Entrar' }).className).toMatch(/min-h-11/)
  })

  it('deshabilitado no dispara la acción', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Subiendo…
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Subiendo…' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('RF-05 · card de la galería', () => {
  it('muestra autor y contadores', () => {
    render(<MediaCard media={media()} onOpen={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByRole('img', { name: 'Foto de Tía Marta' })).toBeInTheDocument()
    expect(screen.getByText('Tía Marta')).toBeInTheDocument()
    expect(screen.getByLabelText('24 me gusta')).toBeInTheDocument()
    expect(screen.getByLabelText('5 comentarios')).toBeInTheDocument()
    expect(screen.getByLabelText('12 descargas')).toBeInTheDocument()
  })

  it('RNF-01 · reserva el espacio exacto de la foto y usa su color mientras carga', () => {
    render(<MediaCard media={media()} onOpen={() => {}} onToggleLike={() => {}} />)
    const frame = screen.getByTestId('media-frame')
    expect(frame.style.aspectRatio).toBe('600 / 800')
    expect(frame.style.backgroundColor).toBe('rgb(170, 51, 102)')
  })

  it('los videos muestran la insignia de play con la duración', () => {
    render(<MediaCard media={media({ kind: 'video', durationSec: 75 })} onOpen={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByRole('img', { name: 'Video de Tía Marta' })).toBeInTheDocument()
    expect(screen.getByText('1:15')).toBeInTheDocument()
  })

  it('RF-08 · el corazón refleja el like y no abre la foto', async () => {
    const onOpen = vi.fn()
    const onToggleLike = vi.fn()
    render(<MediaCard media={media({ likedByViewer: true })} onOpen={onOpen} onToggleLike={onToggleLike} />)
    const like = screen.getByRole('button', { name: 'Me gusta' })
    expect(like).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(like)
    expect(onToggleLike).toHaveBeenCalledWith('m1')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('RF-12 · tocar la foto abre el detalle', async () => {
    const onOpen = vi.fn()
    render(<MediaCard media={media()} onOpen={onOpen} onToggleLike={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir foto de Tía Marta' }))
    expect(onOpen).toHaveBeenCalledWith('m1')
  })

  it('RF-18 · al visitante le muestra los likes pero no le deja dar like', () => {
    render(<MediaCard media={media()} readOnly onOpen={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByLabelText('24 me gusta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Me gusta' })).toBeNull()
  })

  it('a veces lleva cinta washi', () => {
    const { rerender } = render(<MediaCard media={media()} onOpen={() => {}} onToggleLike={() => {}} tape="top" />)
    expect(screen.getByTestId('washi-tape')).toBeInTheDocument()
    rerender(<MediaCard media={media()} onOpen={() => {}} onToggleLike={() => {}} />)
    expect(screen.queryByTestId('washi-tape')).toBeNull()
  })
})

describe('RNF-01 · skeleton', () => {
  it('ocupa el tamaño real de la foto y es invisible para lectores de pantalla', () => {
    render(<SkeletonCard width={600} height={900} />)
    const s = screen.getByTestId('skeleton')
    expect(s).toHaveAttribute('aria-hidden', 'true')
    expect(s.style.aspectRatio).toBe('600 / 900')
  })
})

describe('Fotos nuevas sin interrumpir', () => {
  it('no aparece si no hay nuevas', () => {
    const { container } = render(<NewItemsPill count={0} onShow={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('avisa cuántas hay y las muestra al tocar', async () => {
    const onShow = vi.fn()
    render(<NewItemsPill count={3} onShow={onShow} />)
    await userEvent.click(screen.getByRole('button', { name: '3 recuerdos nuevos' }))
    expect(onShow).toHaveBeenCalled()
  })

  it('usa singular', () => {
    render(<NewItemsPill count={1} onShow={() => {}} />)
    expect(screen.getByRole('button', { name: '1 recuerdo nuevo' })).toBeInTheDocument()
  })
})

describe('Personas viendo el álbum', () => {
  it('muestra el conteo sin avatares', () => {
    render(<PresenceBadge count={15} />)
    expect(screen.getByRole('status')).toHaveTextContent('15 personas viendo el álbum')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('no muestra nada con 0', () => {
    const { container } = render(<PresenceBadge count={0} />)
    expect(container).toBeEmptyDOMElement()
  })
})
