import { MAX_CAPTAINS, MAX_CAPTAIN_NAME, type Captain, type CaptainTitle } from '@/features/admin/captains'
import { AppError } from '../errors'
import type { SettingsRepository } from '../repositories/types'

const KEY = 'capitanes-de-mesa'

export interface CaptainInput {
  id?: string
  name: string
  title: CaptainTitle
}

// La lista es corta y la edita solo el admin: se guarda completa en los ajustes, sin tabla propia
export function createCaptainService(deps: { settings: SettingsRepository; newId?: () => string }) {
  const newId = deps.newId ?? (() => crypto.randomUUID())

  function cleanName(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name || name.length > MAX_CAPTAIN_NAME) throw new AppError('invalido', 'Nombre inválido')
    return name
  }

  return {
    async list(): Promise<Captain[]> {
      return (await deps.settings.get<Captain[]>(KEY)) ?? []
    },

    async save(items: CaptainInput[]): Promise<Captain[]> {
      if (items.length > MAX_CAPTAINS) throw new AppError('invalido', `Máximo ${MAX_CAPTAINS} capitanes`)
      const captains = items.map((item) => ({ id: item.id ?? newId(), name: cleanName(item.name), title: item.title }))
      await deps.settings.set(KEY, captains)
      return captains
    },
  }
}

export type CaptainService = ReturnType<typeof createCaptainService>
