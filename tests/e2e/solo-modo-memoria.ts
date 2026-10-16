import { request, type FullConfig } from '@playwright/test'

const TOKEN = 'E2ETIAMARTA00000000000'

// Las pruebas locales crean y borran invitados y recuerdos: solo pueden correr contra el servidor en memoria.
// El QR de prueba de "Tía Marta" solo existe ahí; si no funciona, el servidor está conectado a datos reales
export default async function soloModoMemoria(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const api = await request.newContext({ baseURL })
  const res = await api.get(`/i/${TOKEN}`, { maxRedirects: 0 })
  const destino = res.headers().location ?? ''
  await api.dispose()
  if (!destino.includes('/bienvenida')) {
    throw new Error(`El servidor de ${baseURL} no está en modo memoria (el QR de prueba no funciona). Se detienen las pruebas para no tocar datos reales.`)
  }
}
