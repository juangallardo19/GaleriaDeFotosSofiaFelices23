import { describe, expect, it, vi } from 'vitest'
import { CARD_ART_FILES, fetchCardArt } from '@/features/admin/card-art'

describe('Fuentes y adornos de la tarjeta', () => {
  it('se piden a /assets/tarjeta del mismo sitio (en Vercel la carpeta public no está dentro de la función)', async () => {
    const fetchFn = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
    const art = await fetchCardArt('https://sofi.test', fetchFn as unknown as typeof fetch)
    const urls = fetchFn.mock.calls.map(([url]) => String(url))
    for (const file of Object.values(CARD_ART_FILES)) expect(urls).toContain(`https://sofi.test/assets/tarjeta/${file}`)
    expect(art.script).toEqual(new Uint8Array([1, 2, 3]))
    expect(art.globoNaranja).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('si falta un archivo, la tarjeta se arma igual sin ese adorno', async () => {
    const fetchFn = vi.fn(async (url: URL) => (String(url).endsWith('estrella.png') ? new Response('no', { status: 404 }) : new Response(new Uint8Array([9]))))
    const art = await fetchCardArt('https://sofi.test', fetchFn as unknown as typeof fetch)
    expect(art.estrella).toBeUndefined()
    expect(art.corazon).toEqual(new Uint8Array([9]))
  })
})
