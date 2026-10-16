import { describe, expect, it } from 'vitest'
import {
  CARD_OFFSET_CLAMP,
  HERO_LAYERS,
  cardAmplitude,
  heroScrollY,
  heroTimelineCss,
  layerOffset,
  scrollTimelineReliable,
  smoothToward,
} from '@/features/gallery/parallax'

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

  it('la amplitud de las cards respeta el límite para que nunca se choquen', () => {
    expect(cardAmplitude(0.15, 800, 300)).toBe(CARD_OFFSET_CLAMP)
    expect(cardAmplitude(0.05, 800, 300)).toBeCloseTo(27.5, 5)
    expect(cardAmplitude(0, 800, 300)).toBe(0)
  })
})

describe('Portada con animación ligada al scroll (la variante B elegida en el iPhone)', () => {
  it('cada capa tiene su propia animación con los valores escritos, sin variables de CSS, porque Safari no las resuelve igual al soltar el dedo', () => {
    const css = heroTimelineCss(1200)
    expect(css).not.toContain('var(')
    for (const layer of HERO_LAYERS) {
      const tx = Math.round(1200 * (layer.drift ?? 0) * 100) / 100 + 0
      expect(css).toContain(`@keyframes capa-${layer.id} { from { translate: 0px 0px } to { translate: ${tx}px ${layerOffset(1200, layer.speed)}px } }`)
      expect(css).toContain(
        `.parallax-${layer.id} { animation: capa-${layer.id} linear both; animation-timeline: scroll(root block); animation-range: 0px 1200px; }`,
      )
    }
  })

  it('las reglas solo aplican en navegadores que soportan estas animaciones; los demás usan JavaScript', () => {
    expect(heroTimelineCss(1200)).toMatch(/@supports \(animation-timeline: scroll\(\)\) \{\n\.parallax-banderines/)
  })

  it('con JavaScript, más allá de la portada las capas quedan en su posición final, no congeladas a medio camino', () => {
    expect(heroScrollY(300, 1200)).toBe(300)
    expect(heroScrollY(5000, 1200)).toBe(1200)
    expect(heroScrollY(-40, 1200)).toBe(0)
  })
})

describe('Cards y gatos del fondo en Safari', () => {
  it('usan las animaciones de scroll de CSS donde funcionan bien (Chrome, Android)', () => {
    expect(scrollTimelineReliable({ supported: true, vendor: 'Google Inc.' })).toBe(true)
    expect(scrollTimelineReliable({ supported: false, vendor: 'Google Inc.' })).toBe(false)
  })

  it('en Safari y en los navegadores de iPhone se mueven con JavaScript', () => {
    expect(scrollTimelineReliable({ supported: true, vendor: 'Apple Computer, Inc.' })).toBe(false)
  })
})
