import { readFileSync, existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// Lê DATABASE_URL do .dev.vars (mesmo arquivo usado pelo Worker em dev)
if (!process.env.DATABASE_URL && existsSync('.dev.vars')) {
  for (const line of readFileSync('.dev.vars', 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/)
    if (m) process.env.DATABASE_URL = m[1]
  }
}

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
