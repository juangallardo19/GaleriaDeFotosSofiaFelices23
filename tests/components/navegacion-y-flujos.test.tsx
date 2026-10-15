import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SideMenu } from '@/components/layout/SideMenu'
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen'
import { UploadList } from '@/components/upload/UploadList'
import { CommentItem, type CommentView } from '@/components/comments/CommentItem'
import QrInvalidoPage from '@/app/qr-invalido/page'
import type { QueueSnapshot, UploadTask } from '@/features/upload/upload-queue'

describe('RF-13 · menú lateral', () => {
  it('tiene Inicio, Subir recuerdos, Mis recuerdos, Mis likes y Descargar álbum', () => {
    render(<SideMenu open current="/" onClose={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Menú principal' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Inicio', '/'],
      ['Subir recuerdos', '/subir'],
      ['Mis recuerdos', '/mis-recuerdos'],
      ['Mis likes', '/mis-likes'],
      ['Descargar álbum', '/descargar'],
    ])
  })

  it('NO muestra el panel administrador (vive en su propia URL)', () => {
    render(<SideMenu open current="/" onClose={() => {}} />)
    expect(screen.queryByText(/admin/i)).toBeNull()
    expect(document.querySelector('a[href^="/admin"]')).toBeNull()
  })

  it('marca la página actual y se cierra', async () => {
    const onClose = vi.fn()
    render(<SideMenu open current="/mis-likes" onClose={onClose} />)
    expect(screen.getByRole('link', { name: 'Mis likes' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('cerrado no se muestra', () => {
    render(<SideMenu open={false} current="/" onClose={() => {}} />)
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).toBeNull()
  })

  it('RF-18 · al visitante sin QR solo le muestra Inicio y Descargar álbum', () => {
    render(<SideMenu open readOnly current="/" onClose={() => {}} />)
    const links = within(screen.getByRole('navigation', { name: 'Menú principal' })).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/descargar'])
    expect(screen.getByText('Para subir, comentar o dar like, escanea el QR de tu tarjeta')).toBeInTheDocument()
  })
})

describe('RF-01b · bienvenida al escanear el QR', () => {
  it('saluda con el nombre del invitado en la fiesta del siglo', () => {
    render(<WelcomeScreen guestName="tía marta" progress={0.6} />)
    expect(screen.getByText('Te damos la bienvenida a')).toBeInTheDocument()
    expect(screen.getByText('la fiesta del siglo')).toBeInTheDocument()
    expect(screen.getByText('Tía Marta')).toBeInTheDocument()
  })

  it('muestra el progreso de carga accesible', () => {
    render(<WelcomeScreen guestName="Camilo" progress={0.6} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText('Revelando tus recuerdos… 60 %')).toBeInTheDocument()
  })

  it('al terminar avisa que entra al álbum', () => {
    render(<WelcomeScreen guestName="Camilo" progress={1} />)
    expect(screen.getByText('¡Listo! Entrando al álbum…')).toBeInTheDocument()
  })
})

const task = (id: string, status: UploadTask['status'], size: number, uploadedBytes = 0): UploadTask => ({
  id,
  file: { name: `${id}.jpg`, size, type: 'image/jpeg' },
  status,
  uploadedBytes,
  attempts: 0,
})

describe('RNF-08 · progreso de la subida', () => {
  const tasks = [
    task('a', 'listo', 100, 100),
    task('b', 'listo', 100, 100),
    task('c', 'subiendo', 1000, 480),
    task('d', 'error', 100, 20),
    task('e', 'en-cola', 100),
    task('f', 'en-cola', 100),
    task('g', 'en-cola', 100),
    task('h', 'en-cola', 100),
  ]
  const snapshot: QueueSnapshot = {
    tasks,
    totalBytes: 1700,
    uploadedBytes: 700,
    done: 2,
    failed: 1,
    active: 1,
    pending: 4,
    isIdle: false,
  }

  it('muestra el avance general y el estado de cada archivo', () => {
    render(<UploadList snapshot={snapshot} onRetry={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Subiendo 3 de 8')).toBeInTheDocument()
    expect(screen.getByText('41 %')).toBeInTheDocument()
    expect(screen.getAllByText('Listo')).toHaveLength(2)
    expect(screen.getByText('48 %')).toBeInTheDocument()
    expect(screen.getAllByText('En cola')).toHaveLength(4)
  })

  it('pide no bloquear la pantalla mientras sube', () => {
    render(<UploadList snapshot={snapshot} onRetry={() => {}} onCancel={() => {}} />)
    expect(screen.getByText(/No bloquees la pantalla/)).toBeInTheDocument()
  })

  it('permite reintentar lo que falló', async () => {
    const onRetry = vi.fn()
    render(<UploadList snapshot={snapshot} onRetry={onRetry} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar d.jpg' }))
    expect(onRetry).toHaveBeenCalledWith('d')
  })
})

describe('RF-09 · comentario', () => {
  const now = new Date('2026-10-16T22:00:00Z')
  const comment = (p: Partial<CommentView> = {}): CommentView => ({
    id: 'c1',
    guestId: 'autor',
    body: 'Qué linda 😍',
    sticker: null,
    author: { name: 'Abuela Rosa' },
    createdAt: new Date(now.getTime() - 8 * 60_000),
    editedAt: null,
    ...p,
  })

  it('muestra autor, texto y hace cuánto', () => {
    render(<CommentItem comment={comment()} viewer={{ id: 'otro', role: 'guest' }} now={now} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Abuela Rosa')).toBeInTheDocument()
    expect(screen.getByText('Qué linda 😍')).toBeInTheDocument()
    expect(screen.getByText('hace 8 min')).toBeInTheDocument()
  })

  it('un tercero no ve editar ni borrar', () => {
    render(<CommentItem comment={comment()} viewer={{ id: 'otro', role: 'guest' }} now={now} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: /editar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /borrar/i })).toBeNull()
  })

  it('el autor puede editar y borrar; el admin solo borrar', () => {
    const { rerender } = render(<CommentItem comment={comment()} viewer={{ id: 'autor', role: 'guest' }} now={now} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('button', { name: 'Editar comentario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Borrar comentario' })).toBeInTheDocument()
    rerender(<CommentItem comment={comment()} viewer={{ id: 'admin', role: 'admin' }} now={now} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Editar comentario' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Borrar comentario' })).toBeInTheDocument()
  })

  it('muestra el sticker del gato y la marca de editado', () => {
    render(
      <CommentItem
        comment={comment({ body: '', sticker: 'gato-aplaudiendo', editedAt: now })}
        viewer={{ id: 'otro', role: 'guest' }}
        now={now}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByRole('img', { name: 'Sticker: gato aplaudiendo' })).toBeInTheDocument()
    expect(screen.getByText('(editado)')).toBeInTheDocument()
  })
})

describe('RF-02 · pantalla de QR inválido', () => {
  it('explica qué pasó y qué hacer', () => {
    render(<QrInvalidoPage />)
    expect(screen.getByRole('heading', { name: 'Uy, este código no funciona' })).toBeInTheDocument()
    expect(screen.getByText(/Busca a los anfitriones/)).toBeInTheDocument()
  })

  it('RF-18 · igual se puede ver el álbum sin QR', () => {
    render(<QrInvalidoPage />)
    expect(screen.getByRole('link', { name: 'Ver el álbum' })).toHaveAttribute('href', '/')
  })
})
