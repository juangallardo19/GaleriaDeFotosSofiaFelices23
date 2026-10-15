import { beforeEach, describe, expect, it, vi } from 'vitest'

const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }))
vi.mock('@vercel/blob', () => blob)

import { BlobThumbStore, THUMB_ROUTE, blobAccess, isThumbPath } from '@/server/storage/thumbs'

const data = new Uint8Array([1, 2, 3]).buffer

beforeEach(() => {
  blob.put.mockReset()
  blob.get.mockReset()
  blob.del.mockReset()
})

describe('Miniaturas en un almacén privado de Vercel Blob', () => {
  it('guarda con acceso privado y devuelve la ruta del propio sitio', async () => {
    blob.put.mockImplementation(async (pathname: string) => ({ url: `https://abc.private.blob.vercel-storage.com/${pathname}`, pathname }))
    const store = new BlobThumbStore({ access: 'private', token: 'tok' })
    const url = await store.put({ data, contentType: 'image/webp', variant: 'thumb' })
    const [pathname, , options] = blob.put.mock.calls[0]
    expect(pathname).toMatch(/^thumbs\/[0-9a-f-]{36}\.webp$/)
    expect(options).toMatchObject({ access: 'private', contentType: 'image/webp', token: 'tok' })
    expect(url).toBe(`${THUMB_ROUTE}/${pathname}`)
  })

  it('las vistas previas van en previews/ y los jpeg con extensión jpg', async () => {
    blob.put.mockImplementation(async (pathname: string) => ({ url: 'x', pathname }))
    await new BlobThumbStore({ access: 'private' }).put({ data, contentType: 'image/jpeg', variant: 'preview' })
    expect(blob.put.mock.calls[0][0]).toMatch(/^previews\/[0-9a-f-]{36}\.jpg$/)
  })

  it('lee la miniatura con el token del servidor', async () => {
    const stream = new ReadableStream<Uint8Array>()
    blob.get.mockResolvedValue({ statusCode: 200, stream, blob: { contentType: 'image/webp', size: 3 } })
    const file = await new BlobThumbStore({ access: 'private', token: 'tok' }).read('thumbs/abc.webp')
    expect(blob.get).toHaveBeenCalledWith('thumbs/abc.webp', expect.objectContaining({ access: 'private', token: 'tok' }))
    expect(file).toEqual({ body: stream, contentType: 'image/webp', size: 3 })
  })

  it('si la miniatura no existe devuelve null', async () => {
    blob.get.mockResolvedValue(null)
    expect(await new BlobThumbStore({ access: 'private' }).read('thumbs/no-existe.webp')).toBeNull()
  })
})

describe('Borrar miniaturas', () => {
  it('convierte la ruta del sitio en la ruta del almacén', async () => {
    await new BlobThumbStore({ access: 'private', token: 'tok' }).remove(`${THUMB_ROUTE}/thumbs/abc.webp`)
    expect(blob.del).toHaveBeenCalledWith('thumbs/abc.webp', expect.objectContaining({ token: 'tok' }))
  })

  it('en un almacén público borra por la URL del CDN', async () => {
    await new BlobThumbStore({ access: 'public' }).remove('https://abc.public.blob.vercel-storage.com/thumbs/x.webp')
    expect(blob.del).toHaveBeenCalledWith('https://abc.public.blob.vercel-storage.com/thumbs/x.webp', expect.anything())
  })

  it('ignora lo que no es una miniatura guardada', async () => {
    await new BlobThumbStore({ access: 'private' }).remove('/assets/placeholder-foto.webp')
    await new BlobThumbStore({ access: 'private' }).remove('data:image/webp;base64,AAA')
    expect(blob.del).not.toHaveBeenCalled()
  })
})

describe('Miniaturas en un almacén público', () => {
  it('devuelve la URL directa del CDN', async () => {
    blob.put.mockResolvedValue({ url: 'https://abc.public.blob.vercel-storage.com/thumbs/x.webp', pathname: 'thumbs/x.webp' })
    const url = await new BlobThumbStore({ access: 'public' }).put({ data, contentType: 'image/webp', variant: 'thumb' })
    expect(blob.put.mock.calls[0][2]).toMatchObject({ access: 'public' })
    expect(url).toBe('https://abc.public.blob.vercel-storage.com/thumbs/x.webp')
  })
})

describe('Solo se sirven rutas de miniaturas', () => {
  it.each(['thumbs/0b7c1f9e-1d2a-4c55-9a51-3f0e2b1c4d5e.webp', 'previews/abc-123.jpg'])('acepta %s', (path) => {
    expect(isThumbPath(path)).toBe(true)
  })

  it.each(['../secreto', 'thumbs/../../x.webp', 'thumbs/a/b.webp', 'thumbs/a.png', 'otros/a.webp', 'thumbs/.webp', ''])('rechaza %s', (path) => {
    expect(isThumbPath(path)).toBe(false)
  })
})

describe('Tipo de almacén según BLOB_ACCESS', () => {
  it('es privado salvo que se diga public', () => {
    expect(blobAccess('public')).toBe('public')
    expect(blobAccess('private')).toBe('private')
    expect(blobAccess(undefined)).toBe('private')
    expect(blobAccess('otro')).toBe('private')
  })
})
