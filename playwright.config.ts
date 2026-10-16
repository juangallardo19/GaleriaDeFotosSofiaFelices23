import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] }, testIgnore: /parallax-safari/ },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, testIgnore: /parallax-safari/ },
    // Motor de Safari (requiere: npx playwright install webkit)
    { name: 'iphone-safari', use: { ...devices['iPhone 15'] }, testMatch: /parallax-safari/ },
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
          ADMIN_LOGIN_LIMIT: '500',
          SESSION_SECRET: 'secreto-e2e-0123456789-abcdefghijklmnop',
          NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        },
      },
})
