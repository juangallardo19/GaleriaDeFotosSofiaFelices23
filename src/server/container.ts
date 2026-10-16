import { SlidingWindowLimiter } from '@/features/auth/rate-limit'
import { ConsoleMailer, type Mailer } from './mail/types'
import {
  MemoryCommentRepository,
  MemoryGuestRepository,
  MemoryLikeRepository,
  MemoryMediaRepository,
  MemorySettingsRepository,
} from './repositories/memory'
import type { CommentRepository, GuestRepository, LikeRepository, MediaRepository, SettingsRepository } from './repositories/types'
import { createGuestService, type GuestService } from './services/guest-service'
import { createMediaService, type MediaService } from './services/media-service'
import { envValue } from './env'
import { DevStorage } from './storage/dev'
import { BlobThumbStore, MemoryThumbStore, blobAccess, type ThumbStore } from './storage/thumbs'
import type { StorageProvider } from './storage/types'
import type { CardArt } from '@/features/admin/cards-pdf'

export interface AppConfig {
  sessionSecret: string
  adminPassword: string | undefined
  baseUrl: string
  secureCookies: boolean
  alertEmail: string
  driveFolderUrl: string | null
  adminLoginLimit?: number
}

export interface AppContainer {
  config: AppConfig
  guests: GuestService
  media: MediaService
  storage: StorageProvider
  thumbs: ThumbStore
  adminLimiter: SlidingWindowLimiter
  cardArt?: () => Promise<CardArt>
}

export interface Repos {
  guests: GuestRepository
  media: MediaRepository
  likes: LikeRepository
  comments: CommentRepository
  settings: SettingsRepository
}

interface BuildOptions {
  storage: StorageProvider
  thumbs: ThumbStore
  mailer: Mailer
  config: AppConfig
  now?: () => Date
}

export function buildContainer(opts: BuildOptions & { repos: Repos }): AppContainer {
  const { repos, storage, thumbs, mailer, config, now } = opts
  return {
    config,
    storage,
    thumbs,
    guests: createGuestService({ guests: repos.guests, baseUrl: config.baseUrl, now }),
    media: createMediaService({ ...repos, storage, thumbs, mailer, alertEmail: config.alertEmail, now }),
    adminLimiter: new SlidingWindowLimiter({ limit: config.adminLoginLimit ?? 5, windowMs: 60_000 }),
  }
}

export function memoryRepos(): Repos {
  return {
    guests: new MemoryGuestRepository(),
    media: new MemoryMediaRepository(),
    likes: new MemoryLikeRepository(),
    comments: new MemoryCommentRepository(),
    settings: new MemorySettingsRepository(),
  }
}

export function createMemoryContainer(opts: BuildOptions): AppContainer {
  return buildContainer({ ...opts, repos: memoryRepos() })
}

export const E2E_TOKEN = 'E2ETIAMARTA00000000000'

export function configFromEnv(env: Record<string, string | undefined> = process.env): AppConfig {
  const baseUrl = envValue('NEXT_PUBLIC_SITE_URL', env) ?? 'http://localhost:3000'
  const sessionSecret = envValue('SESSION_SECRET', env)
  if (!sessionSecret || sessionSecret.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres')
  return {
    sessionSecret,
    adminPassword: envValue('ADMIN_PASSWORD', env),
    baseUrl,
    secureCookies: baseUrl.startsWith('https://'),
    alertEmail: envValue('ALERT_EMAIL', env) ?? 'sofiacumpleanosgaleriadefotos@gmail.com',
    driveFolderUrl: envValue('NEXT_PUBLIC_DRIVE_FOLDER_URL', env) ?? null,
    adminLoginLimit: Number.parseInt(envValue('ADMIN_LOGIN_LIMIT', env) ?? '', 10) || 5,
  }
}

async function createDefaultContainer(): Promise<AppContainer> {
  const config = configFromEnv()
  if (process.env.DATABASE_URL) {
    const { createProductionContainer } = await import('./production')
    return createProductionContainer(config)
  }
  // Sin base de datos: modo local en memoria (desarrollo y pruebas E2E)
  const repos = memoryRepos()
  if (process.env.E2E_SEED === '1') {
    const marta = await repos.guests.create({ name: 'Tía Marta', token: E2E_TOKEN })
    if (process.env.DEMO_MEDIA === '1') await (await import('./dev-seed')).seedDemo(repos, marta.id)
  }
  const thumbs = process.env.BLOB_READ_WRITE_TOKEN ? new BlobThumbStore({ access: blobAccess(process.env.BLOB_ACCESS) }) : new MemoryThumbStore()
  return buildContainer({ repos, storage: new DevStorage(), thumbs, mailer: new ConsoleMailer(), config })
}

const globalForContainer = globalThis as unknown as { __sofiContainer?: Promise<AppContainer> }

export function setContainer(container: AppContainer) {
  globalForContainer.__sofiContainer = Promise.resolve(container)
}

export function getContainer(): Promise<AppContainer> {
  globalForContainer.__sofiContainer ??= createDefaultContainer()
  return globalForContainer.__sofiContainer
}
