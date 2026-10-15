import { expect, request as playwrightRequest, test } from '@playwright/test'
import { generateGuestToken } from '@/features/auth/token'
import { envValue } from '@/server/env'
import type { Repos } from '@/server/container'
import { createPostgresRepos } from '@/server/repositories/postgres'

// El momento crítico: "¡escaneen el QR!" y 40 personas entran casi al mismo tiempo
const PERSONAS = 40
let repos: Repos
const guests: { id: string; token: string }[] = []

test.beforeAll(async () => {
  repos = await createPostgresRepos(envValue('DATABASE_URL')!)
  for (let i = 0; i < PERSONAS; i++) guests.push(await repos.guests.create({ name: `Carga ${Date.now()}-${i}`, token: generateGuestToken() }))
})

test.afterAll(async () => {
  for (const g of guests) await repos.guests.remove(g.id)
})

const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))]

test(`${PERSONAS} invitados escanean el QR al mismo tiempo y navegan el álbum`, async ({ baseURL }) => {
  const tiempos: Record<string, number[]> = { qr: [], galeria: [], presencia: [], yo: [] }
  const medir = async <T>(tipo: string, fn: () => Promise<T>) => {
    const t0 = performance.now()
    const r = await fn()
    tiempos[tipo].push(performance.now() - t0)
    return r
  }

  const fallos: string[] = []
  await Promise.all(
    guests.map(async (g, i) => {
      const ctx = await playwrightRequest.newContext({ baseURL })
      try {
        const qr = await medir('qr', () => ctx.get(`/i/${g.token}`, { maxRedirects: 0 }))
        if (qr.status() !== 307 || !qr.headers().location?.includes('/bienvenida')) fallos.push(`QR ${i}: ${qr.status()}`)
        const yo = await medir('yo', () => ctx.get('/api/me'))
        if ((await yo.json()).role !== 'guest') fallos.push(`sesión ${i}`)
        for (let vuelta = 0; vuelta < 3; vuelta++) {
          const galeria = await medir('galeria', () => ctx.get('/api/media?sort=recientes&limit=24'))
          if (galeria.status() !== 200) fallos.push(`galería ${i}: ${galeria.status()}`)
          const presencia = await medir('presencia', () => ctx.post('/api/presence'))
          if (presencia.status() !== 200) fallos.push(`presencia ${i}: ${presencia.status()}`)
        }
      } finally {
        await ctx.dispose()
      }
    }),
  )

  const resumen = Object.fromEntries(
    Object.entries(tiempos).map(([tipo, t]) => [tipo, { peticiones: t.length, p50: `${Math.round(percentile(t, 0.5))} ms`, p95: `${Math.round(percentile(t, 0.95))} ms`, max: `${Math.round(Math.max(...t))} ms` }]),
  )
  console.table(resumen)
  expect(fallos).toEqual([])
  for (const t of Object.values(tiempos)) expect(percentile(t, 0.95)).toBeLessThan(3000)
})
