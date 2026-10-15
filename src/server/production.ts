import type { CardArt } from '@/features/admin/cards-pdf'
import { buildContainer, type AppConfig, type AppContainer } from './container'
import { GoogleAuth } from './google/auth'
import { GmailMailer } from './mail/gmail'
import { ConsoleMailer } from './mail/types'
import { createPostgresRepos } from './repositories/postgres'
import { GoogleDriveStorage } from './storage/google-drive'
import { BlobThumbStore, blobAccess } from './storage/thumbs'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

export async function createProductionContainer(config: AppConfig): Promise<AppContainer> {
  const auth = new GoogleAuth({
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    refreshToken: required('GOOGLE_REFRESH_TOKEN'),
  })
  const container = buildContainer({
    repos: await createPostgresRepos(required('DATABASE_URL')),
    storage: new GoogleDriveStorage({ auth, apiKey: required('GOOGLE_API_KEY') }),
    thumbs: new BlobThumbStore({ access: blobAccess(process.env.BLOB_ACCESS) }),
    mailer: process.env.GMAIL_SENDER ? new GmailMailer({ auth, from: process.env.GMAIL_SENDER }) : new ConsoleMailer(),
    config,
  })
  container.cardArt = async (): Promise<CardArt> => {
    const res = await fetch(new URL('/assets/banderines.png', config.baseUrl))
    return res.ok ? { banderines: new Uint8Array(await res.arrayBuffer()) } : {}
  }
  return container
}
