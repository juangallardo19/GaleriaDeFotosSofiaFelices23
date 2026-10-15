export function columnsForWidth(width: number): number {
  if (width < 640) return 2
  if (width < 1024) return 3
  if (width < 1440) return 4
  return 5
}

// Con 2–5 columnas un recorrido lineal para hallar la más baja es suficiente
export function distribute<T extends { height: number }>(items: T[], columns: number, gap = 0): T[][] {
  const cols: T[][] = Array.from({ length: Math.max(1, columns) }, () => [])
  const heights = new Array<number>(cols.length).fill(0)
  for (const item of items) {
    let target = 0
    for (let i = 1; i < heights.length; i++) if (heights[i] < heights[target]) target = i
    cols[target].push(item)
    heights[target] += item.height + gap
  }
  return cols
}
