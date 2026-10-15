import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// Prueba contra el sitio publicado en Vercel. Usa las credenciales de .env.local solo para crear y borrar
// el invitado y los archivos de prueba. Correr con: npm run test:e2e:prod
loadEnvConfig(process.cwd())

export default defineConfig({
  testDir: 'tests/e2e-prod',
  timeout: 15 * 60_000,
  workers: 1,
  use: { baseURL: process.env.E2E_PROD_URL ?? 'https://sofia-felices-23.vercel.app', trace: 'retain-on-failure', ...devices['Pixel 7'] },
})
