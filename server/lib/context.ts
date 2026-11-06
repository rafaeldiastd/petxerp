import { and, eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'
import type { ZodType, z } from 'zod'
import { getAuth } from '../auth'
import { getDb, type DB } from '../db/client'
import { memberships } from '../db/schema'
import { resolvePermissions, type Permission } from '../../shared/permissions'

export type SessionUser = { id: string; name: string; email: string; image?: string | null }

export type AppEnv = {
  Bindings: Env
  Variables: {
    db: DB
    user: SessionUser
    orgId: string
    member: { id: string; role: string; permissions: Permission[] }
  }
}

export type Ctx = Context<AppEnv>

/** Injeta o cliente Drizzle (HTTP) em todas as rotas */
export const withDb = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.env.DATABASE_URL) throw new HTTPException(500, { message: 'DATABASE_URL não configurada' })
  c.set('db', getDb(c.env.DATABASE_URL))
  await next()
})

/** Exige sessão válida do Better Auth */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const res = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  if (!res?.user) throw new HTTPException(401, { message: 'Sessão expirada. Entre novamente.' })
  c.set('user', { id: res.user.id, name: res.user.name, email: res.user.email, image: res.user.image })
  await next()
})

/**
 * Cache curto (por isolate do Worker) do vínculo usuário↔ONG: evita uma ida ao banco em toda
 * requisição (~150 ms com o Neon longe). Alterações na equipe invalidam na hora neste isolate;
 * nos demais, valem em até MEMBER_TTL.
 */
type CachedMember = { id: string; role: string; permissions: Permission[] }
const memberCache = new Map<string, { at: number; value: CachedMember }>()
const MEMBER_TTL = 30_000

export function invalidateMemberCache(orgId: string) {
  for (const k of memberCache.keys()) if (k.startsWith(`${orgId}:`)) memberCache.delete(k)
}

/** Resolve a ONG ativa (header X-Org-Id ou ?org=) e as permissões do membro */
export const requireOrg = createMiddleware<AppEnv>(async (c, next) => {
  const orgId = c.req.header('x-org-id') || c.req.query('org')
  if (!orgId) throw new HTTPException(400, { message: 'Organização não informada' })
  const key = `${orgId}:${c.get('user').id}`
  const hit = memberCache.get(key)
  let member = hit && Date.now() - hit.at < MEMBER_TTL ? hit.value : null

  if (!member) {
    const [m] = await c
      .get('db')
      .select()
      .from(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, c.get('user').id), eq(memberships.active, true)))
      .limit(1)
    if (!m) {
      memberCache.delete(key)
      throw new HTTPException(403, { message: 'Você não tem acesso a esta organização' })
    }
    member = { id: m.id, role: m.role, permissions: resolvePermissions(m.role, m.permissions) }
    memberCache.set(key, { at: Date.now(), value: member })
  }

  c.set('orgId', orgId)
  c.set('member', member)
  await next()
})

/** Exige ao menos uma das permissões informadas */
export const perm = (...required: Permission[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const have = c.get('member').permissions
    if (!required.some((p) => have.includes(p))) {
      throw new HTTPException(403, { message: 'Você não tem permissão para esta ação' })
    }
    await next()
  })

export function can(c: Ctx, p: Permission) {
  return c.get('member').permissions.includes(p)
}

/** Valida com Zod (erros viram 422 no onError) */
export function parse<T extends ZodType>(schema: T, data: unknown): z.output<T> {
  return schema.parse(data)
}

export async function body<T extends ZodType>(c: Ctx, schema: T): Promise<z.output<T>> {
  const json = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'JSON inválido' })
  })
  return schema.parse(json)
}

export function notFound(what = 'Registro'): never {
  throw new HTTPException(404, { message: `${what} não encontrado` })
}

export function badRequest(message: string): never {
  throw new HTTPException(400, { message })
}

export function pagination(c: Ctx, defLimit = 24) {
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || defLimit, 1), 100)
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0)
  return { limit, offset }
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
