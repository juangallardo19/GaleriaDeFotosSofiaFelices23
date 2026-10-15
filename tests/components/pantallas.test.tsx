import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroParallax } from '@/components/hero/HeroParallax'
import { SortSheet } from '@/components/gallery/SortSheet'
import { MediaViewer, type ViewerMedia } from '@/components/gallery/MediaViewer'
import { UploadPicker } from '@/components/upload/UploadPicker'
import { CommentComposer } from '@/components/comments/CommentComposer'
import { DownloadSheet } from '@/components/gallery/DownloadSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { StorageBar } from '@/components/admin/StorageBar'
import { HERO_LAYERS } from '@/features/gallery/parallax'

describe('Portada con parallax por capas', () => {
  it('cada asset vive en su propia capa con su velocidad', () => {
    render(<HeroParallax reducedMotion={false} />)
    for (const layer of HERO_LAYERS) {
      const el = screen.getByTestId(`capa-${layer.id}`)
      expect(el).toHaveAttribute('data-speed', String(layer.speed))
    }
  })

  it('las imágenes tienen texto alternativo y Sofi es la imagen principal', () => {
    render(<HeroParallax reducedMotion={false} />)
    expect(screen.getByRole('img', { name: 'Sofi vestida de angelito con su gorrito de cumpleaños' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Globos dorados con el número 2' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Globos dorados con el número 3' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Happy Birthday en letras recortadas' })).toBeInTheDocument()
  })

  it('con "reducir movimiento" las capas quedan quietas', () => {
    render(<HeroParallax reducedMotion />)
    for (const layer of HERO_LAYERS) expect(screen.getByTestId(`capa-${layer.id}`)).toHaveAttribute('data-static', 'true')
  })

  it('invita a deslizar con una animación, sin texto visible', () => {
    render(<HeroParallax reducedMotion={false} />)
    const cue = screen.getByRole('link', { name: 'Desliza para ver los recuerdos' })
    expect(cue).toHaveAttribute('href', '#galeria')
    expect(within(cue).getByTestId('indicador-deslizar')).toBeInTheDocument()
    expect(screen.queryByText('Desliza')).toBeNull()
  })
})

describe('RF-10/11 · ordenar y filtrar', () => {
  it('muestra todas las opciones y marca la actual', () => {
    render(<SortSheet open sort="recientes" filter={{}} onApply={() => {}} onClose={() => {}} />)
    const group = screen.getByRole('radiogroup', { name: 'Ordenar por' })
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-label') ?? r.closest('label')?.textContent)).toEqual([
      'Más recientes',
      'Más antiguos',
      'Más likes',
      'Más comentarios',
      'Más descargas',
    ])
    expect(screen.getByRole('radio', { name: 'Más recientes' })).toBeChecked()
  })

  it('aplica el orden y los filtros elegidos', async () => {
    const onApply = vi.fn()
    render(<SortSheet open sort="recientes" filter={{}} onApply={onApply} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Más likes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Videos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mis likes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ver recuerdos' }))
    expect(onApply).toHaveBeenCalledWith('likes', { kind: 'video', liked: true })
  })

  it('limpiar vuelve a lo normal', async () => {
    const onApply = vi.fn()
    render(<SortSheet open sort="likes" filter={{ kind: 'photo' }} onApply={onApply} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ver recuerdos' }))
    expect(onApply).toHaveBeenCalledWith('recientes', {})
  })
})

const viewerMedia = (p: Partial<ViewerMedia> = {}): ViewerMedia => ({
  id: 'm1',
  kind: 'photo',
  thumbUrl: 'https://cdn/t.webp',
  previewUrl: 'https://cdn/p.webp',
  streamUrl: null,
  downloadPath: '/api/media/m1/download',
  width: 600,
  height: 800,
  dominantColor: '#aa3366',
  durationSec: null,
  author: { id: 'g1', name: 'Tía Marta' },
  likesCount: 24,
  commentsCount: 5,
  downloadsCount: 12,
  likedByViewer: false,
  createdAt: '2026-10-16T21:50:00Z',
  ...p,
})

describe('RF-12 · ver una foto o un video', () => {
  it('muestra la foto en buena calidad con su autor', () => {
    render(<MediaViewer media={viewerMedia()} position="3 / 128" onClose={() => {}} onPrev={() => {}} onNext={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByRole('img', { name: 'Foto de Tía Marta' })).toHaveAttribute('src', 'https://cdn/p.webp')
    expect(screen.getByText('3 / 128')).toBeInTheDocument()
  })

  it('los videos se reproducen ahí mismo, solo al tocarlos', () => {
    render(<MediaViewer media={viewerMedia({ kind: 'video', streamUrl: 'https://drive/stream', durationSec: 42 })} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onToggleLike={() => {}} />)
    const video = screen.getByTestId('video-player') as HTMLVideoElement
    expect(video).toHaveAttribute('src', 'https://drive/stream')
    expect(video).toHaveAttribute('poster', 'https://cdn/t.webp')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video.autoplay).toBe(false)
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
  })

  it('si el navegador no puede reproducir el formato (MOV de iPhone) usa el reproductor de Google', () => {
    render(<MediaViewer media={viewerMedia({ kind: 'video', streamUrl: 'https://www.googleapis.com/drive/v3/files/abc?alt=media&key=k' })} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onToggleLike={() => {}} />)
    fireEvent.error(screen.getByTestId('video-player'))
    expect(screen.getByTitle('Video de Tía Marta')).toHaveAttribute('src', 'https://drive.google.com/file/d/abc/preview')
  })

  it('descargar apunta al original y cuenta la descarga', () => {
    render(<MediaViewer media={viewerMedia()} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByRole('link', { name: 'Descargar · 12' })).toHaveAttribute('href', '/api/media/m1/download')
  })

  it('se navega con botones y con las flechas del teclado, y Escape cierra', async () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const onClose = vi.fn()
    render(<MediaViewer media={viewerMedia()} onClose={onClose} onPrev={onPrev} onNext={onNext} onToggleLike={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente recuerdo' }))
    await userEvent.keyboard('{ArrowLeft}')
    await userEvent.keyboard('{Escape}')
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('RF-18 · el visitante puede descargar pero no dar like', () => {
    render(<MediaViewer media={viewerMedia()} readOnly onClose={() => {}} onPrev={() => {}} onNext={() => {}} onToggleLike={() => {}} />)
    expect(screen.getByRole('link', { name: 'Descargar · 12' })).toHaveAttribute('href', '/api/media/m1/download')
    expect(screen.queryByRole('button', { name: /Me gusta/ })).toBeNull()
    expect(screen.getByText('Para subir, comentar o dar like, escanea el QR de tu tarjeta')).toBeInTheDocument()
  })

  it('el like funciona desde el detalle', async () => {
    const onToggleLike = vi.fn()
    render(<MediaViewer media={viewerMedia({ likedByViewer: true })} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onToggleLike={onToggleLike} />)
    const like = screen.getByRole('button', { name: 'Me gusta · 24' })
    expect(like).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(like)
    expect(onToggleLike).toHaveBeenCalledWith('m1')
  })
})

describe('RF-06 · elegir archivos', () => {
  const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type })

  it('acepta fotos y videos, varios a la vez', () => {
    render(<UploadPicker onSelect={() => {}} />)
    const input = screen.getByLabelText('Elegir de la galería') as HTMLInputElement
    expect(input.multiple).toBe(true)
    expect(input.accept).toBe('image/*,video/*')
  })

  it('ofrece tomar foto o video con la cámara', () => {
    render(<UploadPicker onSelect={() => {}} />)
    expect(screen.getByLabelText('Tomar foto o video')).toHaveAttribute('capture')
  })

  it('entrega los válidos y explica los rechazados', async () => {
    const onSelect = vi.fn()
    render(<UploadPicker onSelect={onSelect} />)
    await userEvent.upload(screen.getByLabelText('Elegir de la galería'), [file('a.jpg', 'image/jpeg'), file('b.mov', 'video/quicktime')])
    expect(onSelect.mock.calls[0][0].map((f: File) => f.name)).toEqual(['a.jpg', 'b.mov'])
  })

  it('avisa si eligen más de 30', async () => {
    const onSelect = vi.fn()
    render(<UploadPicker onSelect={onSelect} />)
    await userEvent.upload(
      screen.getByLabelText('Elegir de la galería'),
      Array.from({ length: 32 }, (_, i) => file(`f${i}.jpg`, 'image/jpeg')),
    )
    expect(onSelect.mock.calls[0][0]).toHaveLength(30)
    expect(screen.getByRole('alert')).toHaveTextContent('Se pueden subir hasta 30 a la vez: 2 quedaron por fuera.')
  })

  it('explica por qué un archivo no se puede subir', async () => {
    render(<UploadPicker onSelect={() => {}} />)
    fireEvent.change(screen.getByLabelText('Elegir de la galería'), { target: { files: [file('doc.pdf', 'application/pdf')] } })
    expect(screen.getByRole('alert')).toHaveTextContent('doc.pdf: este tipo de archivo no se puede subir.')
  })
})

describe('RF-09 · escribir un comentario', () => {
  it('envía el texto con emojis y limpia la caja', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<CommentComposer onSubmit={onSubmit} />)
    const box = screen.getByRole('textbox', { name: 'Escribe un comentario' })
    await userEvent.type(box, 'Qué linda 😍')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar comentario' }))
    expect(onSubmit).toHaveBeenCalledWith({ text: 'Qué linda 😍', sticker: null })
    expect(box).toHaveValue('')
  })

  it('no envía comentarios vacíos', () => {
    render(<CommentComposer onSubmit={async () => {}} />)
    expect(screen.getByRole('button', { name: 'Enviar comentario' })).toBeDisabled()
  })

  it('envía el sticker del gato aplaudiendo', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<CommentComposer onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar sticker: gato aplaudiendo' }))
    expect(onSubmit).toHaveBeenCalledWith({ text: '', sticker: 'gato-aplaudiendo' })
  })

  it('limita a 500 caracteres', () => {
    render(<CommentComposer onSubmit={async () => {}} />)
    expect(screen.getByRole('textbox', { name: 'Escribe un comentario' })).toHaveAttribute('maxlength', '500')
  })
})

describe('Descargar el álbum', () => {
  it('ofrece todo, solo fotos, mis recuerdos y mis likes', () => {
    render(<DownloadSheet open folderUrl="https://drive.google.com/drive/folders/x" onClose={() => {}} stats={{ total: 128, totalBytes: 3.4 * 1024 ** 3, photos: 110, photosBytes: 820 * 1024 ** 2, mine: 12, liked: 30 }} />)
    expect(screen.getByRole('radio', { name: /Todo el álbum.*128 recuerdos · 3,4 GB/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Solo fotos.*110 fotos · 820 MB/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Mis recuerdos.*12 recuerdos/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Mis likes.*30 recuerdos/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir en Google Drive' })).toHaveAttribute('href', 'https://drive.google.com/drive/folders/x')
  })

  it('RF-18 · al visitante solo le ofrece todo el álbum o solo fotos', () => {
    render(<DownloadSheet open readOnly folderUrl="https://drive.google.com/drive/folders/x" onClose={() => {}} stats={{ total: 128, totalBytes: 3.4 * 1024 ** 3, photos: 110, photosBytes: 820 * 1024 ** 2, mine: 0, liked: 0 }} />)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.queryByRole('radio', { name: /Mis recuerdos/ })).toBeNull()
    expect(screen.queryByRole('radio', { name: /Mis likes/ })).toBeNull()
  })
})

describe('Estados vacíos', () => {
  it('Mis likes vacío invita a explorar', () => {
    render(<EmptyState title="Aún no le has dado amor a ningún recuerdo" text="Toca el corazón en las fotos que más te gusten y aparecerán aquí." action={{ label: 'Explorar el álbum', href: '/' }} />)
    expect(screen.getByRole('heading', { name: 'Aún no le has dado amor a ningún recuerdo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explorar el álbum' })).toHaveAttribute('href', '/')
  })
})

describe('Almacenamiento en el admin', () => {
  it('muestra el uso y una barra accesible', () => {
    render(<StorageBar usedBytes={3.4 * 1024 ** 3} limitBytes={15 * 1024 ** 3} />)
    expect(screen.getByText('3,4 GB de 15 GB')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Espacio usado en Drive' })).toHaveAttribute('aria-valuenow', '23')
  })

  it('se pone en alerta desde el 80 %', () => {
    render(<StorageBar usedBytes={13 * 1024 ** 3} limitBytes={15 * 1024 ** 3} />)
    expect(screen.getByRole('progressbar', { name: 'Espacio usado en Drive' })).toHaveAttribute('data-alerta', 'true')
  })
})
