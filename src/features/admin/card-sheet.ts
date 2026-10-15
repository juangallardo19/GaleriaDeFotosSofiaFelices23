export const A4_MM = { w: 210, h: 297 } as const
export const CARD_MM = { w: 100, h: 140 } as const
const GAP_MM = 4
const PER_SHEET = 4

export interface CardGuest {
  name: string
  url: string
}

export interface CardSlot {
  x: number
  y: number
  w: number
  h: number
  guest: CardGuest
}

export interface Sheet {
  side: 'qr' | 'frente'
  slots: CardSlot[]
}

// Builder: arma las hojas A4 (2 × 2 tarjetas) y, si se pide, el reverso espejado para doble cara
export class CardSheetBuilder {
  private guests: CardGuest[] = []
  private duplex = false

  addGuests(guests: CardGuest[]): this {
    this.guests.push(...guests)
    return this
  }

  doubleSided(value = true): this {
    this.duplex = value
    return this
  }

  build(): Sheet[] {
    const marginX = (A4_MM.w - 2 * CARD_MM.w - GAP_MM) / 2
    const marginY = (A4_MM.h - 2 * CARD_MM.h - GAP_MM) / 2
    const pos = (i: number, mirror: boolean) => {
      const col = mirror ? 1 - (i % 2) : i % 2
      return { x: marginX + col * (CARD_MM.w + GAP_MM), y: marginY + Math.floor(i / 2) * (CARD_MM.h + GAP_MM), w: CARD_MM.w, h: CARD_MM.h }
    }
    const sheets: Sheet[] = []
    for (let start = 0; start < this.guests.length; start += PER_SHEET) {
      const chunk = this.guests.slice(start, start + PER_SHEET)
      sheets.push({ side: 'qr', slots: chunk.map((guest, i) => ({ ...pos(i, false), guest })) })
      if (this.duplex) sheets.push({ side: 'frente', slots: chunk.map((guest, i) => ({ ...pos(i, true), guest })) })
    }
    return sheets
  }
}
