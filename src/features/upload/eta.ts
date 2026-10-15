import { RingBuffer } from '@/lib/ds/ring-buffer'

export class SpeedMeter {
  private samples: RingBuffer<{ bytes: number; ms: number }>

  constructor(window = 10) {
    this.samples = new RingBuffer(window)
  }

  record(bytes: number, ms: number) {
    if (ms > 0) this.samples.push({ bytes, ms })
  }

  bytesPerSecond(): number {
    const all = this.samples.toArray()
    const ms = all.reduce((s, x) => s + x.ms, 0)
    return ms === 0 ? 0 : (all.reduce((s, x) => s + x.bytes, 0) / ms) * 1000
  }

  etaSeconds(remainingBytes: number): number | null {
    const speed = this.bytesPerSecond()
    return speed > 0 ? Math.ceil(remainingBytes / speed) : null
  }
}

export function formatEta(seconds: number | null): string {
  if (seconds === null) return 'Calculando…'
  if (seconds < 60) return 'Falta menos de un minuto'
  if (seconds >= 3600) return 'Falta más de una hora'
  const min = Math.round(seconds / 60)
  return min === 1 ? 'Falta un minuto' : `Faltan unos ${min} minutos`
}
