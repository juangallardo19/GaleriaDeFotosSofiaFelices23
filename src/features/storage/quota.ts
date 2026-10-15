import { formatBytes } from '@/lib/format'

export const STORAGE_THRESHOLDS = [0.8, 0.95] as const
export const QUOTA_CHECK_EVERY_MS = 10 * 60_000

export function crossedThreshold(previousRatio: number, currentRatio: number): number | null {
  let crossed: number | null = null
  for (const t of STORAGE_THRESHOLDS) if (previousRatio < t && currentRatio >= t) crossed = t
  return crossed
}

export function shouldCheckQuota(lastCheckedAt: Date | null, now: Date, everyMs = QUOTA_CHECK_EVERY_MS): boolean {
  return lastCheckedAt === null || now.getTime() - lastCheckedAt.getTime() >= everyMs
}

export function buildQuotaEmail(opts: { usedBytes: number; limitBytes: number; threshold: number }) {
  const pct = Math.round((opts.usedBytes / opts.limitBytes) * 100)
  const subject = `El álbum de Sofi va en ${pct} % del almacenamiento`
  const text = [
    `El Google Drive del álbum ya usa ${formatBytes(opts.usedBytes)} de ${formatBytes(opts.limitBytes)} (${pct} %).`,
    opts.threshold >= 0.95
      ? 'Queda muy poco espacio: conviene ampliar el almacenamiento hoy mismo para que los invitados puedan seguir subiendo.'
      : 'Todavía hay espacio, pero conviene preparar el cambio a un almacenamiento más grande.',
    '',
    'Este aviso lo envía automáticamente el álbum de los 23 de Sofi.',
  ].join('\n')
  return { subject, text }
}
