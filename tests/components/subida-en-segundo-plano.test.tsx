import { describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { UploadDock } from '@/components/upload/UploadDock'
import { UploadProvider, useUploads } from '@/components/upload/UploadProvider'
import { UploadQueue, type QueueSnapshot, type UploadTask } from '@/features/upload/upload-queue'
import { useUploadQueue } from '@/hooks/useUploadQueue'

const task = (id: string, status: UploadTask['status'], size: number, uploadedBytes = 0): UploadTask => ({
  id,
  file: { name: `${id}.jpg`, size, type: 'image/jpeg' },
  status,
  uploadedBytes,
  attempts: 0,
})

const snap = (tasks: UploadTask[], extra: Partial<QueueSnapshot> = {}): QueueSnapshot => ({
  tasks,
  totalBytes: tasks.reduce((s, t) => s + t.file.size, 0),
  uploadedBytes: tasks.reduce((s, t) => s + (t.status === 'listo' ? t.file.size : t.uploadedBytes), 0),
  done: tasks.filter((t) => t.status === 'listo').length,
  failed: tasks.filter((t) => t.status === 'error').length,
  active: tasks.filter((t) => t.status === 'subiendo').length,
  pending: tasks.filter((t) => t.status === 'en-cola').length,
  isIdle: !tasks.some((t) => t.status === 'subiendo' || t.status === 'en-cola'),
  ...extra,
})

describe('Mini barra de subida (como el video pequeño de YouTube)', () => {
  it('sin subidas no aparece', () => {
    const { container } = render(<UploadDock snapshot={snap([])} onDismiss={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el avance y deja seguir viendo el álbum', () => {
    render(<UploadDock snapshot={snap([task('a', 'listo', 100), task('b', 'subiendo', 100, 50), task('c', 'en-cola', 100)])} onDismiss={() => {}} />)
    const dock = screen.getByRole('region', { name: 'Subida en curso' })
    expect(dock).toHaveTextContent('Subiendo 2 de 3')
    expect(dock).toHaveTextContent('50 %')
    expect(screen.getByRole('progressbar', { name: 'Avance de la subida' })).toHaveAttribute('aria-valuenow', '50')
    expect(dock).toHaveTextContent('Puedes seguir viendo el álbum')
    expect(dock).toHaveTextContent('Si cierras o sales de la página, la subida se detiene.')
  })

  it('se despliega para ver cada archivo', async () => {
    render(<UploadDock snapshot={snap([task('a', 'listo', 100), task('b', 'subiendo', 100, 30)])} onDismiss={() => {}} />)
    expect(screen.queryByText('b.jpg')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Ver archivos en subida' }))
    expect(screen.getByText('a.jpg')).toBeInTheDocument()
    expect(screen.getByText('b.jpg')).toBeInTheDocument()
    expect(screen.getByText('30 %')).toBeInTheDocument()
  })

  it('al terminar avisa y se puede cerrar', async () => {
    const onDismiss = vi.fn()
    render(<UploadDock snapshot={snap([task('a', 'listo', 100), task('b', 'listo', 100)])} onDismiss={onDismiss} />)
    expect(screen.getByText('¡Listo! Tus 2 recuerdos ya están en el álbum.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso de subida' }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('si algo falló, lleva a reintentar', () => {
    render(<UploadDock snapshot={snap([task('a', 'listo', 100), task('b', 'error', 100)])} onDismiss={() => {}} />)
    expect(screen.getByText('1 no se pudo subir')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reintentar' })).toHaveAttribute('href', '/subir')
  })
})

describe('La subida sigue al cambiar de página', () => {
  function SubirFalso({ files }: { files: File[] }) {
    const { add } = useUploads()
    useEffect(() => {
      add(files)
    }, [add, files])
    return <p>página subir</p>
  }

  function DockReal() {
    const { snapshot, dismiss, dismissed } = useUploads()
    return dismissed ? null : <UploadDock snapshot={snapshot} onDismiss={dismiss} />
  }

  it('el invitado sale de "Subir", la cola sigue y la mini barra muestra el avance hasta terminar', async () => {
    let finish!: () => void
    const queue = new UploadQueue<File>({ uploader: () => new Promise<void>((r) => (finish = r)) })
    const files = [new File([new Uint8Array(100)], 'foto.jpg', { type: 'image/jpeg' })]
    const { rerender } = render(
      <UploadProvider createQueue={() => queue}>
        <SubirFalso files={files} />
        <DockReal />
      </UploadProvider>,
    )
    expect(await screen.findByText(/Subiendo 1 de 1/)).toBeInTheDocument()

    rerender(
      <UploadProvider createQueue={() => queue}>
        <p>página del álbum</p>
        <DockReal />
      </UploadProvider>,
    )
    expect(screen.getByText('página del álbum')).toBeInTheDocument()
    expect(screen.getByText(/Subiendo 1 de 1/)).toBeInTheDocument()

    await act(async () => {
      finish()
      await queue.onIdle()
    })
    expect(screen.getByText('¡Listo! Tu recuerdo ya está en el álbum.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso de subida' }))
    expect(screen.queryByRole('region', { name: 'Subida en curso' })).toBeNull()
  })

  it('no repite un archivo que ya está en la cola', async () => {
    const queue = new UploadQueue<File>({ uploader: () => new Promise<void>(() => {}) })
    const file = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg', lastModified: 1 })
    let api!: ReturnType<typeof useUploads>
    function Captura() {
      api = useUploads()
      return null
    }
    render(
      <UploadProvider createQueue={() => queue}>
        <Captura />
      </UploadProvider>,
    )
    act(() => api.add([file]))
    let skipped = 0
    act(() => {
      skipped = api.add([file])
    })
    expect(skipped).toBe(1)
    expect(queue.getSnapshot().tasks).toHaveLength(1)
  })
})

describe('El título de la pestaña', () => {
  it('si no se está subiendo nada, no toca el título de la página', () => {
    document.title = 'Mis likes · Álbum de Sofi'
    const queue = new UploadQueue({ uploader: async () => {} })
    renderHook(() => useUploadQueue(queue, () => document.title))
    expect(document.title).toBe('Mis likes · Álbum de Sofi')
  })
})
