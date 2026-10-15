import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { DDL, schema } from '@/server/db/schema'
import { createRepos, type Db } from '@/server/repositories/postgres'

// Postgres real en memoria para probar el SQL sin depender de Neon
export async function createPgliteRepos() {
  const client = new PGlite()
  await client.exec(DDL.join(';\n'))
  return createRepos(drizzle({ client, schema }) as unknown as Db)
}
