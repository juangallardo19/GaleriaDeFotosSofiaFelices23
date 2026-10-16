import type { CardArt } from './cards-pdf'

export const CARD_ART_FILES = {
  script: 'pinyon-script.ttf',
  serif: 'radley.ttf',
  banderines: 'banderines.png',
  corazon: 'corazon.png',
  estrella: 'estrella.png',
  globoRosa: 'globo-rosa.png',
  globoNaranja: 'globo-naranja.png',
} as const satisfies Record<keyof CardArt, string>

// Las fuentes y adornos viven en public/assets/tarjeta; se piden por HTTP porque en Vercel public no está dentro de la función
export async function fetchCardArt(baseUrl: string, fetchFn: typeof fetch = fetch): Promise<CardArt> {
  const entries = await Promise.all(
    Object.entries(CARD_ART_FILES).map(async ([key, file]) => {
      const res = await fetchFn(new URL(`/assets/tarjeta/${file}`, baseUrl))
      return [key, res.ok ? new Uint8Array(await res.arrayBuffer()) : undefined] as const
    }),
  )
  return Object.fromEntries(entries) as CardArt
}
