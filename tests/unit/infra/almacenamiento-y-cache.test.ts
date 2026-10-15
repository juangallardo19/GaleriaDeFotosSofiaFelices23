import { describe, expect, it } from 'vitest'
import { QUOTA_CHECK_EVERY_MS, STORAGE_THRESHOLDS, buildQuotaEmail, crossedThreshold, shouldCheckQuota } from '@/features/storage/quota'
import { cacheStrategyFor } from '@/features/cache/cache-policy'

describe('Alerta por correo cuando el Drive se está llenando', () => {
  it('avisa al 80 % y al 95 %', () => {
    expect(STORAGE_THRESHOLDS).toEqual([0.8, 0.95])
  })

  it('detecta solo el umbral recién cruzado (no repite avisos)', () => {
    expect(crossedThreshold(0.5, 0.79)).toBeNull()
    expect(crossedThreshold(0.79, 0.81)).toBe(0.8)
    expect(crossedThreshold(0.81, 0.9)).toBeNull()
    expect(crossedThreshold(0.9, 0.96)).toBe(0.95)
    expect(crossedThreshold(0.5, 0.97)).toBe(0.95)
  })

  it('arma el correo con el uso actual', () => {
    const email = buildQuotaEmail({ usedBytes: 12.3 * 1024 ** 3, limitBytes: 15 * 1024 ** 3, threshold: 0.8 })
    expect(email.subject).toBe('El álbum de Sofi va en 82 % del almacenamiento')
    expect(email.text).toContain('12,3 GB de 15 GB')
  })

  it('no consulta la cuota en cada subida, máximo cada 10 minutos', () => {
    const now = new Date('2026-10-16T22:00:00Z')
    expect(QUOTA_CHECK_EVERY_MS).toBe(10 * 60_000)
    expect(shouldCheckQuota(null, now)).toBe(true)
    expect(shouldCheckQuota(new Date(now.getTime() - 5 * 60_000), now)).toBe(false)
    expect(shouldCheckQuota(new Date(now.getTime() - 11 * 60_000), now)).toBe(true)
  })
})

describe('Caché para que lo ya visto no vuelva a cargar lento', () => {
  const u = (s: string) => new URL(s, 'https://sofi23.vercel.app')
  it.each([
    ['https://abc.public.blob.vercel-storage.com/thumbs/x.webp', 'GET', 'cache-first'],
    ['/assets/sofi.webp', 'GET', 'cache-first'],
    ['/_next/static/chunks/main.js', 'GET', 'cache-first'],
    ['/api/media?sort=recientes', 'GET', 'stale-while-revalidate'],
    ['/api/media/123/like', 'POST', 'network-only'],
    ['/api/uploads/init', 'POST', 'network-only'],
    ['/i/abcdefghijklmnopqrstuv', 'GET', 'network-only'],
    ['https://www.googleapis.com/drive/v3/files/1?alt=media', 'GET', 'network-only'],
    ['/', 'GET', 'network-first'],
  ])('%s (%s) => %s', (url, method, expected) => {
    expect(cacheStrategyFor(u(url), method)).toBe(expected)
  })
})
