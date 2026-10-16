import { describe, expect, it } from 'vitest'
import { CARD_OFFSET_CLAMP, HERO_LAYERS, cardAmplitude, layerOffset, scrollTimelineVars, smoothToward } from '@/features/gallery/parallax'

describe('Parallax fluido con scroll rápido', () => {
  it('el suavizado avanza hacia el objetivo sin saltar de una', () => {
    const next = smoothToward(0, 300, 16, 70)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(300)
  })

  it('no depende de los cuadros por segundo: dos pasos de 8 ms = un paso de 16 ms', () => {
    const a = smoothToward(smoothToward(0, 300, 8, 70), 300, 8, 70)
    const b = smoothToward(0, 300, 16, 70)
    expect(a).toBeCloseTo(b, 5)
  })

  it('llega y se queda en el objetivo cuando ya casi está', () => {
    expect(smoothToward(299.98, 300, 16, 70)).toBe(300)
    let v = 0
    for (let i = 0; i < 120; i++) v = smoothToward(v, 300, 16, 70)
    expect(v).toBe(300)
  })

  it('las capas de la portada con animación de scroll terminan donde las pone el parallax de siempre', () => {
    const rango = 1200
    for (const layer of HERO_LAYERS) {
      const vars = scrollTimelineVars(layer, rango)
      expect(vars['--rango']).toBe(`${rango}px`)
      expect(Number.parseFloat(vars['--ty'])).toBeCloseTo(layerOffset(rango, layer.speed), 1)
      expect(Number.parseFloat(vars['--tx'])).toBeCloseTo(rango * (layer.drift ?? 0), 1)
    }
  })

  it('la amplitud de las cards respeta el límite para que nunca se choquen', () => {
    expect(cardAmplitude(0.15, 800, 300)).toBe(CARD_OFFSET_CLAMP)
    expect(cardAmplitude(0.05, 800, 300)).toBeCloseTo(27.5, 5)
    expect(cardAmplitude(0, 800, 300)).toBe(0)
  })
})
