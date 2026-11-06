import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from './db/client'
import { account, session, user, verification } from './db/schema'
import { hashPassword, verifyPassword } from './lib/crypto'

function createAuth(env: Env) {
  const db = getDb(env.DATABASE_URL)
  return betterAuth({
    appName: 'Petx ERP',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      // PBKDF2 via WebCrypto: o scrypt padrão em JS pode estourar o limite de CPU do Workers
      password: { hash: hashPassword, verify: verifyPassword },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // em dev o Vite pode subir em outra porta se a 5173 estiver ocupada
    trustedOrigins: env.BETTER_AUTH_URL.startsWith('http://localhost')
      ? Array.from({ length: 8 }, (_, i) => `http://localhost:${5173 + i}`)
      : [env.BETTER_AUTH_URL],
    rateLimit: { enabled: true, window: 60, max: 60 },
    advanced: {
      // IP real do cliente atrás da Cloudflare (usado no rate limit e nas sessões)
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

let instance: Auth | null = null
export function getAuth(env: Env): Auth {
  instance ??= createAuth(env)
  return instance
}
