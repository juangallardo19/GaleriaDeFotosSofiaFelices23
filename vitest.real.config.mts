import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// Pruebas contra los servicios reales (Neon, Drive, Blob, Gmail) con las credenciales de .env.local
export default defineConfig(({ mode }) => ({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/reales/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
