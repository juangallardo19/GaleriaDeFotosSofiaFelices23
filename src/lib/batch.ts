export const BATCH_SIZE = 100

// El servidor acepta hasta 100 por vez: una selección grande se manda por partes, en orden
export async function inBatches(ids: string[], send: (group: string[]) => Promise<number>, onProgress?: (done: number, total: number) => void): Promise<number> {
  let done = 0
  let result = 0
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const group = ids.slice(i, i + BATCH_SIZE)
    result += await send(group)
    done += group.length
    onProgress?.(done, ids.length)
  }
  return result
}
