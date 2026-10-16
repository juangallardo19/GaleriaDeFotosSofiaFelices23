import { fetchCardArt } from '@/features/admin/card-art'
import { buildContainer, type AppConfig, type AppContainer } from './container'
import { envValue } from './env'
import { GoogleAuth } from './google/auth'
import { GmailMailer } from './mail/gmail'
import { ConsoleMailer } from './mail/types'
import { createPostgresRepos } from './repositories/postgres'
import { GoogleDriveStorage } from './storage/google-drive'
import { BlobThumbStore, blobAccess } from './storage/thumbs'

function required(name: string): string {
  const value = envValue(name)
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
    thumbs: new BlobThumbStore({ access: blobAccess(envValue('BLOB_ACCESS')), token: envValue('BLOB_READ_WRITE_TOKEN') }),
    mailer: envValue('GMAIL_SENDER') ? new GmailMailer({ auth, from: envValue('GMAIL_SENDER')! }) : new ConsoleMailer(),
    config,
  })
  container.cardArt = () => fetchCardArt(config.baseUrl)
  return container
}
