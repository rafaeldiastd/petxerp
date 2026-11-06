import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { SQL } from 'drizzle-orm'
import * as schema from './schema'

export function createDb(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl), schema, casing: 'snake_case' })
}

export type DB = ReturnType<typeof createDb>

let cached: { url: string; db: DB } | null = null

/** Reaproveita o cliente HTTP dentro do mesmo isolate do Worker */
export function getDb(databaseUrl: string): DB {
  if (!cached || cached.url !== databaseUrl) cached = { url: databaseUrl, db: createDb(databaseUrl) }
  return cached.db
}

/** Executa SQL bruto e devolve as linhas tipadas */
export async function rows<T = Record<string, unknown>>(db: DB, query: SQL): Promise<T[]> {
  const res = await db.execute(query)
  return res.rows as T[]
}

export { schema }
