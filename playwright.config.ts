import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        port: PORT,
        reuseExistingServer: true,
        env: {
          E2E_SEED: '1',
          ADMIN_PASSWORD: 'clave-admin-e2e',
          SESSION_SECRET: 'secreto-e2e-0123456789-abcdefghijklmnop',
          NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        },
      },
})
