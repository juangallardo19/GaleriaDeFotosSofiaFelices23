export interface FingerprintSource {
  name: string
  size: number
  lastModified: number
}

export function fingerprint(file: FingerprintSource): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function dedupeFiles<T extends FingerprintSource>(existing: Iterable<string>, incoming: T[]) {
  const seen = new Set(existing)
  const unique: T[] = []
  const duplicates: T[] = []
  for (const file of incoming) {
    const key = fingerprint(file)
    if (seen.has(key)) duplicates.push(file)
    else {
      seen.add(key)
      unique.push(file)
    }
  }
  return { unique, duplicates }
}
