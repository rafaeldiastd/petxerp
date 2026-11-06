import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getAuth } from '../auth'
import { badRequest, body, invalidateMemberCache, notFound, perm, requireOrg, requireUser, type AppEnv, type Ctx } from '../lib/context'
import { memberships, user } from '../db/schema'
import { broadcast } from '../realtime'
import { teamCreateSchema, teamUpdateSchema } from '../../shared/schemas'
import { resolvePermissions } from '../../shared/permissions'
import type { TeamMember } from '../../shared/types'

export const teamRoutes = new Hono<AppEnv>()
teamRoutes.use('*', requireUser, requireOrg)

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

async function findMember(c: Ctx, id: string) {
  const [m] = await c
    .get('db')
    .select()
    .from(memberships)
    .where(and(eq(memberships.id, id), eq(memberships.orgId, c.get('orgId'))))
  if (!m) notFound('Membro')
  return m
}

async function adminCount(c: Ctx, exceptId?: string) {
  const [r] = await c
    .get('db')
    .select({ n: sql<number>`count(*)::int` })
    .from(memberships)
    .where(
      and(
        eq(memberships.orgId, c.get('orgId')),
        eq(memberships.role, 'admin'),
        eq(memberships.active, true),
        exceptId ? ne(memberships.id, exceptId) : undefined,
      ),
    )
  return r?.n ?? 0
}

const cleanPerms = (role: string, perms?: string[] | null) =>
  role === 'admin' || !perms ? null : resolvePermissions(role, perms)

teamRoutes.get('/', perm('team.manage'), async (c) => {
  const list = await c
    .get('db')
    .select({ m: memberships, u: { name: user.name, email: user.email } })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(eq(memberships.orgId, c.get('orgId')))
    .orderBy(asc(user.name))
  const out: TeamMember[] = list.map(({ m, u }) => ({
    id: m.id,
    userId: m.userId,
    name: u.name,
    email: u.email,
    role: m.role,
    permissions: m.permissions,
    effectivePermissions: resolvePermissions(m.role, m.permissions),
    jobTitle: m.jobTitle,
    phone: m.phone,
    active: m.active,
    createdAt: m.createdAt.toISOString(),
  }))
  return c.json(out)
})

/**
 * Cadastra um membro. Se o e-mail ainda não tem conta, cria o usuário com senha inicial
 * (informada ou gerada) — o administrador repassa ao colaborador.
 */
teamRoutes.post('/', perm('team.manage'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const input = await body(c, teamCreateSchema)
  const email = input.email.toLowerCase()

  let [existing] = await db.select().from(user).where(eq(user.email, email))
  let generatedPassword: string | null = null

  if (!existing) {
    const password = input.password || (generatedPassword = randomPassword())
    await getAuth(c.env).api.signUpEmail({ body: { name: input.name, email, password } })
    ;[existing] = await db.select().from(user).where(eq(user.email, email))
  }
  if (!existing) badRequest('Não foi possível criar o usuário')

  const [already] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, existing.id)))
  if (already) badRequest('Esta pessoa já faz parte da equipe')

  const [m] = await db
    .insert(memberships)
    .values({
      orgId,
      userId: existing.id,
      role: input.role,
      permissions: cleanPerms(input.role, input.permissions),
      jobTitle: input.jobTitle,
      phone: input.phone,
    })
    .returning()

  invalidateMemberCache(c.get('orgId'))
  broadcast(c, ['team'])
  return c.json({ member: m, generatedPassword, existingAccount: !generatedPassword && !input.password }, 201)
})

teamRoutes.patch('/:id', perm('team.manage'), async (c) => {
  const m = await findMember(c, c.req.param('id'))
  const input = await body(c, teamUpdateSchema)
  if (m.role === 'admin' && (input.role !== 'admin' || !input.active) && (await adminCount(c, m.id)) === 0) {
    badRequest('A ONG precisa de pelo menos um administrador ativo')
  }
  await c
    .get('db')
    .update(memberships)
    .set({
      role: input.role,
      permissions: cleanPerms(input.role, input.permissions),
      jobTitle: input.jobTitle,
      phone: input.phone,
      active: input.active,
    })
    .where(eq(memberships.id, m.id))
  invalidateMemberCache(c.get('orgId'))
  broadcast(c, ['team'])
  return c.json({ ok: true })
})

teamRoutes.delete('/:id', perm('team.manage'), async (c) => {
  const m = await findMember(c, c.req.param('id'))
  if (m.userId === c.get('user').id) badRequest('Você não pode remover a si mesmo')
  if (m.role === 'admin' && (await adminCount(c, m.id)) === 0) badRequest('A ONG precisa de pelo menos um administrador')
  await c.get('db').delete(memberships).where(eq(memberships.id, m.id))
  invalidateMemberCache(c.get('orgId'))
  broadcast(c, ['team'])
  return c.json({ ok: true })
})
