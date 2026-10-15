// Drive exige partes múltiplos de 256 KB en las subidas reanudables
export const CHUNK_SIZE = 8 * 1024 * 1024

export interface Chunk {
  start: number
  end: number
}

export function planChunks(total: number, from = 0, size = CHUNK_SIZE): Chunk[] {
  const chunks: Chunk[] = []
  for (let start = from; start < total; start += size) {
    chunks.push({ start, end: Math.min(start + size, total) - 1 })
  }
  return chunks
}

export function contentRangeHeader(start: number, end: number, total: number): string {
  return `bytes ${start}-${end}/${total}`
}

export function nextOffsetFromRange(range: string | null): number {
  const match = range?.match(/bytes=0-(\d+)/)
  return match ? Number(match[1]) + 1 : 0
}
