// Capitanes de mesa: quienes reciben la botella para repartir shots y animar su mesa.
// En plural es una sola tarjeta para dos o más personas de la misma mesa
export type CaptainTitle = 'capitan' | 'capitana' | 'capitanes' | 'capitanas'

export const CAPTAIN_TITLES: CaptainTitle[] = ['capitan', 'capitana', 'capitanes', 'capitanas']

export interface Captain {
  id: string
  name: string
  title: CaptainTitle
}

export const MAX_CAPTAINS = 30
export const MAX_CAPTAIN_NAME = 60

const HEADINGS: Record<CaptainTitle, string> = { capitan: 'CAPITÁN', capitana: 'CAPITANA', capitanes: 'CAPITANES', capitanas: 'CAPITANAS' }

export function captainHeading(title: CaptainTitle): string {
  return HEADINGS[title]
}

const isPlural = (title: CaptainTitle) => title === 'capitanes' || title === 'capitanas'

// Textos de la tarjeta según el título: en plural cambian los verbos ("tomen", "repartan", "pongan")
export function captainTexts(title: CaptainTitle) {
  const heading = HEADINGS[title]
  const label = `${heading.charAt(0)}${heading.slice(1).toLowerCase()} de mesa`
  if (!isPlural(title)) {
    return {
      label,
      intro: 'TE HEMOS ELEGIDO COMO',
      heading,
      task: 'TOMA ESTA BOTELLA Y REPARTE',
      mission: 'y pon a toda la mesa a bailar hasta el suelo.',
    }
  }
  return {
    label,
    intro: title === 'capitanas' ? 'LAS HEMOS ELEGIDO COMO' : 'LOS HEMOS ELEGIDO COMO',
    heading,
    task: 'TOMEN ESTA BOTELLA Y REPARTAN',
    mission: 'y pongan a toda la mesa a bailar hasta el suelo.',
  }
}
