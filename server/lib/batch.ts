import type { BatchItem } from 'drizzle-orm/batch'
import type { DB } from '../db/client'

/** db.batch() exige tupla não vazia: executa várias instruções em uma transação HTTP do Neon */
export async function runBatch(db: DB, ops: BatchItem<'pg'>[]) {
  if (!ops.length) return []
  return db.batch(ops as [BatchItem<'pg'>, ...BatchItem<'pg'>[]])
}

export function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } }
  return err?.code === '23505' || err?.cause?.code === '23505'
}
