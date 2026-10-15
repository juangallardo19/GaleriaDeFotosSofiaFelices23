import { createMemoryContainer, setContainer, type AppContainer } from '@/server/container'
import { FakeMailer, FakeStorage, FakeThumbStore, clock } from './fakes'

export const TEST_SECRET = 'secreto-de-pruebas-0123456789-abcdefghij'
export const TEST_ADMIN_PASSWORD = 'clave-admin-de-prueba'

export function installTestContainer() {
  const storage = new FakeStorage()
  const mailer = new FakeMailer()
  const thumbs = new FakeThumbStore()
  const c = clock()
  const container = createMemoryContainer({
    storage,
    mailer,
    thumbs,
    now: c.now,
    config: {
      sessionSecret: TEST_SECRET,
      adminPassword: TEST_ADMIN_PASSWORD,
      baseUrl: 'https://sofi23.vercel.app',
      secureCookies: true,
      alertEmail: 'sofiacumpleanosgaleriadefotos@gmail.com',
      driveFolderUrl: 'https://drive.google.com/drive/folders/test',
    },
  })
  setContainer(container)
  return Object.assign(container as AppContainer, { storage, mailer, thumbs, clock: c })
}
