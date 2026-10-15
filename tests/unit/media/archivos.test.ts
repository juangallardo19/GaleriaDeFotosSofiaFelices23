import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES, MAX_FILES_PER_BATCH, classifyFile, validateBatch } from '@/features/media/media-kind'
import { dominantColor, thumbnailSize } from '@/features/media/thumbnail'

const f = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('RF-06 · tipos de archivo aceptados (Factory de medios)', () => {
  it.each([
    ['IMG_2041.HEIC', 'image/heic', 'photo'],
    ['foto.jpg', 'image/jpeg', 'photo'],
    ['captura.png', 'image/png', 'photo'],
    ['sticker.webp', 'image/webp', 'photo'],
    ['VID_0193.MOV', 'video/quicktime', 'video'],
    ['video.mp4', 'video/mp4', 'video'],
    ['IMG_2042.HEIC', '', 'photo'],
    ['VID_0201.mov', '', 'video'],
  ])('%s (%s) es %s', (name, type, kind) => {
    expect(classifyFile(f(name, type))).toEqual({ ok: true, kind })
  })

  it('rechaza tipos no soportados', () => {
    expect(classifyFile(f('documento.pdf', 'application/pdf'))).toEqual({ ok: false, reason: 'tipo-no-soportado' })
    expect(classifyFile(f('audio.mp3', 'audio/mpeg'))).toEqual({ ok: false, reason: 'tipo-no-soportado' })
  })

  it('RNF-10 · máximo 1 GB por archivo y nada vacío', () => {
    expect(MAX_FILE_BYTES).toBe(1024 ** 3)
    expect(classifyFile(f('largo.mp4', 'video/mp4', MAX_FILE_BYTES))).toEqual({ ok: true, kind: 'video' })
    expect(classifyFile(f('enorme.mp4', 'video/mp4', MAX_FILE_BYTES + 1))).toEqual({ ok: false, reason: 'muy-grande' })
    expect(classifyFile(f('vacio.jpg', 'image/jpeg', 0))).toEqual({ ok: false, reason: 'vacio' })
  })

  it('hasta 30 archivos por tanda; el resto se informa', () => {
    expect(MAX_FILES_PER_BATCH).toBe(30)
    const files = Array.from({ length: 33 }, (_, i) => f(`f${i}.jpg`, 'image/jpeg'))
    files.push(f('malo.pdf', 'application/pdf'))
    const r = validateBatch(files)
    expect(r.accepted).toHaveLength(30)
    expect(r.overflow).toBe(3)
    expect(r.rejected).toEqual([{ file: files[33], reason: 'tipo-no-soportado' }])
  })
})

describe('RNF-03 · miniaturas livianas', () => {
  it('limita el lado mayor a 600 px manteniendo la proporción', () => {
    expect(thumbnailSize(4032, 3024)).toEqual({ width: 600, height: 450 })
    expect(thumbnailSize(1080, 1920)).toEqual({ width: 338, height: 600 })
  })

  it('nunca agranda una imagen pequeña', () => {
    expect(thumbnailSize(320, 240)).toEqual({ width: 320, height: 240 })
  })
})

describe('RNF-02 · color dominante para el placeholder', () => {
  it('promedia los píxeles opacos', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0])
    expect(dominantColor(px)).toBe('#800080')
  })

  it('usa el rosa de la marca si no hay píxeles opacos', () => {
    expect(dominantColor(new Uint8ClampedArray([1, 2, 3, 0]))).toBe('#fce1ea')
  })
})
