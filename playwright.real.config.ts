import { defineConfig, devices } from '@playwright/test'

// E2E contra los servicios reales (Neon, Drive, Blob) con los archivos de MediaTest; borra todo al terminar.
// Correr con: npm run test:e2e:real
const PORT = 3200
export const REAL_ADMIN_PASSWORD = 'clave-e2e-real-0123456789'

export default defineConfig({
  testDir: 'tests/e2e-reales',
  timeout: 15 * 60_000,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', ...devices['Pixel 7'] },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    port: PORT,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      ADMIN_PASSWORD: REAL_ADMIN_PASSWORD,
      SESSION_SECRET: 'secreto-e2e-real-0123456789-abcdefghijklmnop',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
})
