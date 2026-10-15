import { describe, expect, it, vi } from 'vitest'
import { inBatches } from '@/lib/batch'

describe('Mandar una selección grande en grupos', () => {
  it('parte en grupos de 100 y suma lo que responde el servidor', async () => {
    const send = vi.fn(async (ids: string[]) => ids.length)
    const ids = Array.from({ length: 230 }, (_, i) => `m${i}`)
    expect(await inBatches(ids, send)).toBe(230)
    expect(send.mock.calls.map(([g]) => g.length)).toEqual([100, 100, 30])
  })

  it('avisa el avance', async () => {
    const progress = vi.fn()
    await inBatches(Array.from({ length: 150 }, (_, i) => `m${i}`), async (g) => g.length, progress)
    expect(progress.mock.calls).toEqual([[100, 150], [150, 150]])
  })

  it('sin nada que mandar no llama al servidor', async () => {
    const send = vi.fn(async () => 0)
    expect(await inBatches([], send)).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })
})
