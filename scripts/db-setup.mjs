// Crea las tablas en Neon (idempotente). Uso: npm run db:setup
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { DDL } from '../src/server/db/schema.ts'

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0 && !line.startsWith('#')) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
  }
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
for (const statement of DDL) await sql.query(statement)
const tables = await sql.query(`select table_name from information_schema.tables where table_schema = 'public' order by 1`)
console.log('Tablas listas:', tables.map((t) => t.table_name).join(', '))
