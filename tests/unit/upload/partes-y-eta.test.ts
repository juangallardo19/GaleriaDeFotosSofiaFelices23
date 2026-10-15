import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE, contentRangeHeader, nextOffsetFromRange, planChunks } from '@/features/upload/chunker'
import { SpeedMeter, formatEta } from '@/features/upload/eta'
import { dedupeFiles, fingerprint } from '@/features/upload/fingerprint'

describe('RNF-06 · subida reanudable por partes', () => {
  it('las partes son de 8 MB y múltiplos de 256 KB (requisito de Drive)', () => {
    expect(CHUNK_SIZE).toBe(8 * 1024 * 1024)
    expect(CHUNK_SIZE % (256 * 1024)).toBe(0)
  })

  it('divide un archivo cubriendo todos los bytes sin huecos', () => {
    const total = 20_000_000
    const chunks = planChunks(total)
    expect(chunks[0]).toEqual({ start: 0, end: CHUNK_SIZE - 1 })
    expect(chunks.at(-1)!.end).toBe(total - 1)
    for (let i = 1; i < chunks.length; i++) expect(chunks[i].start).toBe(chunks[i - 1].end + 1)
  })

  it('reanuda desde el último byte confirmado', () => {
    const chunks = planChunks(20_000_000, CHUNK_SIZE)
    expect(chunks[0].start).toBe(CHUNK_SIZE)
    expect(planChunks(100, 100)).toEqual([])
  })

  it('arma el header Content-Range', () => {
    expect(contentRangeHeader(0, 8388607, 20000000)).toBe('bytes 0-8388607/20000000')
  })

  it('interpreta la respuesta Range de Drive para saber desde dónde seguir', () => {
    expect(nextOffsetFromRange('bytes=0-8388607')).toBe(8388608)
    expect(nextOffsetFromRange(null)).toBe(0)
    expect(nextOffsetFromRange('basura')).toBe(0)
  })
})

describe('Tiempo restante (buffer circular de velocidad)', () => {
  it('promedia las últimas mediciones', () => {
    const m = new SpeedMeter(3)
    m.record(1_000_000, 1000)
    m.record(3_000_000, 1000)
    expect(m.bytesPerSecond()).toBe(2_000_000)
    expect(m.etaSeconds(10_000_000)).toBe(5)
  })

  it('sin mediciones no inventa un tiempo', () => {
    expect(new SpeedMeter().etaSeconds(1000)).toBeNull()
  })

  it.each([
    [null, 'Calculando…'],
    [20, 'Falta menos de un minuto'],
    [95, 'Faltan unos 2 minutos'],
    [4000, 'Falta más de una hora'],
  ])('formatEta(%s) => %s', (s, expected) => {
    expect(formatEta(s)).toBe(expected)
  })
})

describe('No subir duplicados (Set de huellas)', () => {
  const a = { name: 'IMG_1.HEIC', size: 100, lastModified: 1 }
  const b = { name: 'IMG_2.HEIC', size: 200, lastModified: 2 }
  it('identifica un archivo por nombre, tamaño y fecha', () => {
    expect(fingerprint(a)).toBe(fingerprint({ ...a }))
    expect(fingerprint(a)).not.toBe(fingerprint(b))
  })

  it('separa los repetidos', () => {
    const r = dedupeFiles([fingerprint(a)], [a, b, b])
    expect(r.unique).toEqual([b])
    expect(r.duplicates).toEqual([a, b])
  })
})
