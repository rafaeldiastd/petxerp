import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { body, requireUser, type AppEnv } from '../lib/context'
import { memberships, organizations, paymentSettings } from '../db/schema'
import { onboardingSchema } from '../../shared/schemas'
import { resolvePermissions } from '../../shared/permissions'
import { DEFAULT_SETTINGS } from '../../shared/defaults'
import type { MeResponse } from '../../shared/types'

// Montado em /api: o requireUser fica por rota (um use('*') aqui afetaria /api/public e webhooks)
export const meRoutes = new Hono<AppEnv>()

/** Usuário logado + ONGs em que é membro (com permissões resolvidas) */
meRoutes.get('/me', requireUser, async (c) => {
  const db = c.get('db')
  const u = c.get('user')
  const list = await db
    .select({ m: memberships, org: { id: organizations.id, name: organizations.name, slug: organizations.slug, logoKey: organizations.logoKey } })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(and(eq(memberships.userId, u.id), eq(memberships.active, true)))
    .orderBy(organizations.name)

  const res: MeResponse = {
    user: { id: u.id, name: u.name, email: u.email, image: u.image ?? null },
    memberships: list.map(({ m, org }) => ({
      id: m.id,
      orgId: m.orgId,
      role: m.role,
      permissions: resolvePermissions(m.role, m.permissions),
      org,
    })),
  }
  return c.json(res)
})

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Primeira ONG do usuário: cria a organização e o torna administrador */
meRoutes.post('/onboarding', requireUser, async (c) => {
  const db = c.get('db')
  const u = c.get('user')
  const input = await body(c, onboardingSchema)

  const base = slugify(input.orgName) || 'ong'
  let slug = base
  for (let i = 2; i < 50; i++) {
    const [exists] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1)
    if (!exists) break
    slug = `${base}-${i}`
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: input.orgName, slug, city: input.city, state: input.state, settings: DEFAULT_SETTINGS })
    .returning()
  if (!org) throw new HTTPException(500, { message: 'Não foi possível criar a organização' })

  await db.batch([
    db.insert(memberships).values({ orgId: org.id, userId: u.id, role: 'admin', jobTitle: 'Administrador(a)' }),
    db.insert(paymentSettings).values({ orgId: org.id, pixCity: input.city?.slice(0, 15) ?? null, pixName: input.orgName.slice(0, 25) }),
  ])

  return c.json({ orgId: org.id, slug: org.slug }, 201)
})
