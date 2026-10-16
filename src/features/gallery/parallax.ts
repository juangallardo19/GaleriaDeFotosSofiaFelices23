export interface HeroLayer {
  id: string
  speed: number
  drift?: number
}

// Tres planos: fondo (0.25–0.4), medio (0.55–0.7) y frente (1.0–1.2). Cada asset es su propia capa.
export const HERO_LAYERS: HeroLayer[] = [
  { id: 'banderines', speed: 0.25 },
  { id: 'globo-rosa', speed: 0.4, drift: -0.06 },
  { id: 'globo-naranja', speed: 0.4, drift: 0.06 },
  { id: 'globo-rojo', speed: 0.3, drift: -0.04 },
  { id: 'happy-birthday', speed: 0.55 },
  { id: 'corazon', speed: 0.7 },
  { id: 'estrella', speed: 0.7 },
  { id: 'globo-2', speed: 1.0, drift: -0.05 },
  { id: 'globo-3', speed: 1.0, drift: 0.05 },
  { id: 'sofi', speed: 1.1 },
  { id: 'pastel', speed: 1.2 },
]

export const TEXT_SPEED = 1
export const BACKGROUND_CATS_SPEED = 0.6
export const CARD_OFFSET_CLAMP = 56

export const COLUMN_FACTORS = {
  mobile: [0.05, 0.15],
  desktop: [0.04, 0.13, 0.07, 0.15, 0.05],
} as const

const round = (n: number) => Math.round(n * 100) / 100 + 0

export function layerOffset(scrollY: number, speed: number, reduced = false): number {
  if (reduced) return 0
  return round(scrollY * (1 - speed))
}

export function cardOffset(opts: { centerY: number; viewportH: number; k: number; clamp?: number; reduced?: boolean }): number {
  if (opts.reduced) return 0
  const limit = opts.clamp ?? CARD_OFFSET_CLAMP
  const raw = (opts.centerY - opts.viewportH / 2) * opts.k
  return round(Math.max(-limit, Math.min(limit, raw)))
}

export function columnFactors(columns: number): readonly number[] {
  const base = columns <= 2 ? COLUMN_FACTORS.mobile : COLUMN_FACTORS.desktop
  return Array.from({ length: columns }, (_, i) => base[i % base.length])
}

// Suavizado exponencial independiente de los cuadros por segundo: en un scroll rapidísimo
// la capa recorre el salto en varios cuadros en vez de teletransportarse
export function smoothToward(current: number, target: number, dtMs: number, halfLifeMs: number): number {
  const next = current + (target - current) * (1 - Math.pow(2, -dtMs / halfLifeMs))
  return Math.abs(target - next) < 0.05 ? target : next
}

// Variables para la animación ligada al scroll (CSS animation-timeline): el navegador la mueve
// en el mismo hilo del scroll, así que va sincronizada aunque se deslice muy rápido
export function scrollTimelineVars(layer: HeroLayer, range: number) {
  return {
    '--tx': `${round(range * (layer.drift ?? 0))}px`,
    '--ty': `${layerOffset(range, layer.speed)}px`,
    '--rango': `${range}px`,
  }
}

export function cardAmplitude(k: number, viewportH: number, cardH: number): number {
  return Math.min(CARD_OFFSET_CLAMP, (viewportH / 2 + cardH / 2) * k)
}

export function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: scroll()')
}
