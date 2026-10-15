// Crea las tablas en Neon (idempotente). Uso: npm run db:setup
import { readFileSync, existsSync } from 'node:fs'

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0 && !line.startsWith('#')) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim()
  }
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}
const { setupDatabase } = await import('../src/server/repositories/postgres.ts')
await setupDatabase(process.env.DATABASE_URL)
console.log('Tablas listas')
