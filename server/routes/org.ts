import { and, eq, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { badRequest, body, perm, requireOrg, requireUser, type AppEnv } from '../lib/context'
import { organizations } from '../db/schema'
import { broadcast } from '../realtime'
import { orgSchema, orgSettingsSchema } from '../../shared/schemas'
import { withDefaults } from '../../shared/defaults'

export const orgRoutes = new Hono<AppEnv>()
orgRoutes.use('*', requireUser, requireOrg)

/** Dados da ONG ativa (com configurações já mescladas com os padrões) */
orgRoutes.get('/', async (c) => {
  const [org] = await c.get('db').select().from(organizations).where(eq(organizations.id, c.get('orgId')))
  return c.json({ ...org, settings: withDefaults(org?.settings) })
})

orgRoutes.patch('/', perm('settings.manage'), async (c) => {
  const db = c.get('db')
  const input = await body(c, orgSchema)
  const [dup] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.slug, input.slug), ne(organizations.id, c.get('orgId'))))
  if (dup) badRequest('Este endereço (slug) já está em uso por outra ONG')
  await db.update(organizations).set(input).where(eq(organizations.id, c.get('orgId')))
  broadcast(c, ['org'])
  return c.json({ ok: true })
})

/** Mescla configurações (consumo de ração, prazos e textos do termo) */
orgRoutes.patch('/settings', perm('settings.manage'), async (c) => {
  const input = await body(c, orgSettingsSchema)
  await c
    .get('db')
    .update(organizations)
    .set({ settings: sql`${organizations.settings} || ${JSON.stringify(input)}::jsonb` })
    .where(eq(organizations.id, c.get('orgId')))
  broadcast(c, ['org'])
  return c.json({ ok: true })
})
