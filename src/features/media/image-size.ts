// Ancho y alto de un PNG o JPEG leyendo solo su cabecera (sin decodificar la imagen)
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const isPng = bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (isPng) return { width: view.getUint32(16), height: view.getUint32(20) }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  // JPEG: se recorren los segmentos hasta el que describe el cuadro (SOF), que trae alto y ancho
  let i = 2
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++
      continue
    }
    const marker = bytes[i + 1]
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) }
    i += 2 + view.getUint16(i + 2)
  }
  return null
}
