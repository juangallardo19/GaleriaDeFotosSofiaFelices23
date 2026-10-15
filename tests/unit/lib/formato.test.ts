import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration, initials, normalizeSearch, scriptCase, timeAgo } from '@/lib/format'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [2048, '2 KB'],
    [4.2 * 1024 * 1024, '4,2 MB'],
    [640 * 1024 * 1024, '640 MB'],
    [1.2 * 1024 ** 3, '1,2 GB'],
    [15 * 1024 ** 3, '15 GB'],
  ])('%d bytes => %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [42, '0:42'],
    [75, '1:15'],
    [3605, '1:00:05'],
  ])('%d s => %s', (s, expected) => {
    expect(formatDuration(s)).toBe(expected)
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-10-16T22:00:00Z')
  const ago = (ms: number) => new Date(now.getTime() - ms)
  it.each([
    [10_000, 'ahora'],
    [5 * 60_000, 'hace 5 min'],
    [2 * 3_600_000, 'hace 2 h'],
    [26 * 3_600_000, 'hace 1 día'],
    [3 * 86_400_000, 'hace 3 días'],
  ])('%d ms => %s', (ms, expected) => {
    expect(timeAgo(ago(ms), now)).toBe(expected)
  })
})

describe('scriptCase (cursiva siempre con mayúscula inicial)', () => {
  it.each([
    ['angelito', 'Angelito'],
    ['feliz cumple, sofi', 'Feliz Cumple, Sofi'],
    ['¡gracias!', '¡Gracias!'],
    ['tía marta', 'Tía Marta'],
  ])('%s => %s', (input, expected) => {
    expect(scriptCase(input)).toBe(expected)
  })
})

describe('initials', () => {
  it.each([
    ['Tía Marta', 'TM'],
    ['Camilo', 'C'],
    ['Primo Andrés López', 'PA'],
    ['  abuela   rosa ', 'AR'],
  ])('%s => %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('normalizeSearch', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normalizeSearch('  Tía MARTA ')).toBe('tia marta')
    expect(normalizeSearch('Andrés')).toBe(normalizeSearch('andres'))
  })
})
