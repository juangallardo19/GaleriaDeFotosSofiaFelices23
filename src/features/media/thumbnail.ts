export const THUMB_MAX = 600
export const FALLBACK_COLOR = '#fce1ea'

export function thumbnailSize(width: number, height: number, max = THUMB_MAX) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export function dominantColor(rgba: Uint8ClampedArray, step = 1): string {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i + 3 < rgba.length; i += 4 * step) {
    if (rgba[i + 3] < 128) continue
    r += rgba[i]
    g += rgba[i + 1]
    b += rgba[i + 2]
    n++
  }
  if (n === 0) return FALLBACK_COLOR
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
