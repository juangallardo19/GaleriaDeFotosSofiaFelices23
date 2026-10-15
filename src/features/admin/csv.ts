import { normalizeSearch } from '@/lib/format'

function firstCell(line: string): string {
  const trimmed = line.trim()
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1)
    return end > 0 ? trimmed.slice(1, end) : trimmed.slice(1)
  }
  return trimmed.split(/[;,\t]/)[0]
}

export function parseGuestsCsv(text: string): string[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const seen = new Set<string>()
  const names: string[] = []
  lines.forEach((line, i) => {
    const name = firstCell(line).trim().replace(/\s+/g, ' ')
    if (!name) return
    const key = normalizeSearch(name)
    if (i === 0 && (key === 'nombre' || key === 'nombres' || key === 'invitado' || key === 'name')) return
    if (seen.has(key)) return
    seen.add(key)
    names.push(name)
  })
  return names
}
