import { generateGuestToken, isTokenFormatValid } from '@/features/auth/token'
import { parseGuestsCsv } from '@/features/admin/csv'
import { guestUrl } from '@/features/admin/qr'
import { countOnline } from '@/features/presence/presence'
import { normalizeSearch } from '@/lib/format'
import type { Guest } from '../domain'
import { AppError } from '../errors'
import type { GuestRepository } from '../repositories/types'

export const MAX_GUEST_NAME = 60

export interface GuestServiceDeps {
  guests: GuestRepository
  baseUrl: string
  now?: () => Date
  newToken?: () => string
}

export function createGuestService(deps: GuestServiceDeps) {
  const now = deps.now ?? (() => new Date())
  const newToken = deps.newToken ?? generateGuestToken

  function cleanName(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name || name.length > MAX_GUEST_NAME) throw new AppError('invalido', 'Nombre inválido')
    return name
  }

  const service = {
    urlFor: (guest: Guest) => guestUrl(deps.baseUrl, guest.token),

    async create(rawName: string) {
      const guest = await deps.guests.create({ name: cleanName(rawName), token: newToken() })
      return { guest, url: service.urlFor(guest) }
    },

    async importCsv(text: string) {
      const existing = new Set((await deps.guests.list()).map((g) => normalizeSearch(g.name)))
      const created: Guest[] = []
      const skipped: string[] = []
      for (const name of parseGuestsCsv(text)) {
        if (existing.has(normalizeSearch(name))) {
          skipped.push(name)
          continue
        }
        created.push((await service.create(name)).guest)
        existing.add(normalizeSearch(name))
      }
      return { created, skipped }
    },

    async list() {
      return (await deps.guests.list()).sort((a, b) => a.name.localeCompare(b.name, 'es'))
    },

    findById: (id: string) => deps.guests.findById(id),

    async remove(id: string) {
      await deps.guests.remove(id)
    },

    async loginWithToken(token: string): Promise<Guest | null> {
      if (!isTokenFormatValid(token)) return null
      const guest = await deps.guests.findByToken(token)
      if (!guest) return null
      const at = now()
      await deps.guests.touch(guest.id, at)
      return { ...guest, lastSeenAt: at }
    },

    async heartbeat(guestId: string) {
      await deps.guests.touch(guestId, now())
    },

    async onlineCount() {
      return countOnline(await deps.guests.lastSeenAll(), now())
    },
  }
  return service
}

export type GuestService = ReturnType<typeof createGuestService>
