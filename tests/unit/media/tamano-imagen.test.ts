import { describe, expect, it } from 'vitest'
import { imageSize } from '@/features/media/image-size'
import { jpegHeader, pngHeader } from '../../helpers/imagenes'

describe('Tamaño de una imagen a partir de sus bytes', () => {
  it('lee el ancho y el alto de un PNG', () => {
    expect(imageSize(pngHeader(720, 1280))).toEqual({ width: 720, height: 1280 })
  })

  it('lee el ancho y el alto de un JPEG', () => {
    expect(imageSize(jpegHeader(1280, 720))).toEqual({ width: 1280, height: 720 })
  })

  it('si no reconoce el formato devuelve null', () => {
    expect(imageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull()
  })
})
