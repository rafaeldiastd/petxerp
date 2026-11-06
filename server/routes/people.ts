import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { body, notFound, pagination, perm, requireOrg, requireUser, type AppEnv, type Ctx } from '../lib/context'
import { adoptions, animals, donations, people } from '../db/schema'
import { broadcast } from '../realtime'
import { personSchema, onlyDigits } from '../../shared/schemas'

export const peopleRoutes = new Hono<AppEnv>()
peopleRoutes.use('*', requireUser, requireOrg)

function filters(c: Ctx) {
  const conds: SQL[] = [eq(people.orgId, c.get('orgId')), isNull(people.deletedAt)]
  const q = c.req.query('q')?.trim()
  if (q) {
    const like = `%${q}%`
    const digits = onlyDigits(q)
    const parts = [ilike(people.name, like), ilike(people.email, like), ilike(people.city, like)]
    if (digits.length >= 3) {
      parts.push(ilike(people.cpf, `%${digits}%`))
      parts.push(sql`regexp_replace(coalesce(${people.phone}, '') || coalesce(${people.whatsapp}, ''), '\\D', '', 'g') like ${`%${digits}%`}`)
    }
    conds.push(or(...parts)!)
  }
  const type = c.req.query('type')
  if (type) conds.push(sql`${type} = any(${people.types})`)
  if (c.req.query('restricted') === 'true') conds.push(eq(people.restricted, true))
  return conds
}

async function findPerson(c: Ctx, id: string) {
  const [p] = await c
    .get('db')
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.orgId, c.get('orgId')), isNull(people.deletedAt)))
  if (!p) notFound('Pessoa')
  return p
}

const adoptionsCount = sql<number>`(select count(*)::int from adoptions a where a.person_id = ${people.id})`

peopleRoutes.get('/', perm('people.view'), async (c) => {
  const db = c.get('db')
  const { limit, offset } = pagination(c, 30)
  const where = and(...filters(c))
  const [items, [{ total } = { total: 0 }], counts] = await Promise.all([
    db
      .select({ person: people, adoptionsCount })
      .from(people)
      .where(where)
      .orderBy(asc(people.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(people).where(where),
    db
      .select({ type: sql<string>`unnest(${people.types})`, n: sql<number>`count(*)::int` })
      .from(people)
      .where(and(eq(people.orgId, c.get('orgId')), isNull(people.deletedAt)))
      .groupBy(sql`1`),
  ])
  return c.json({
    items: items.map((r) => ({ ...r.person, adoptionsCount: r.adoptionsCount })),
    total,
    limit,
    offset,
    counts: Object.fromEntries(counts.map((r) => [r.type, r.n])),
  })
})

/** Busca rápida para seletores */
peopleRoutes.get('/options', perm('people.view', 'adoptions.create', 'animals.create', 'donations.manage'), async (c) => {
  const items = await c
    .get('db')
    .select({
      id: people.id, name: people.name, cpf: people.cpf, phone: people.phone, city: people.city,
      types: people.types, restricted: people.restricted, restrictionReason: people.restrictionReason,
    })
    .from(people)
    .where(and(...filters(c)))
    .orderBy(asc(people.name))
    .limit(20)
  return c.json(items)
})

peopleRoutes.get('/:id', perm('people.view', 'adoptions.create'), async (c) => {
  const db = c.get('db')
  const p = await findPerson(c, c.req.param('id'))
  const [adopted, reported, donated] = await Promise.all([
    db
      .select({
        id: adoptions.id, date: adoptions.date, status: adoptions.status, castrationDone: adoptions.castrationDone,
        castrationDeadline: adoptions.castrationDeadline,
        animal: { id: animals.id, name: animals.name, photoKey: animals.photoKey, species: animals.species, code: animals.code },
      })
      .from(adoptions)
      .innerJoin(animals, eq(animals.id, adoptions.animalId))
      .where(eq(adoptions.personId, p.id))
      .orderBy(desc(adoptions.date)),
    db
      .select({ id: animals.id, name: animals.name, photoKey: animals.photoKey, species: animals.species, intakeDate: animals.intakeDate, status: animals.status, code: animals.code })
      .from(animals)
      .where(and(eq(animals.reporterId, p.id), isNull(animals.deletedAt)))
      .orderBy(desc(animals.intakeDate)),
    db.select().from(donations).where(eq(donations.personId, p.id)).orderBy(desc(donations.date)).limit(50),
  ])
  return c.json({ ...p, adoptions: adopted, reported, donations: donated })
})

/** Verifica CPF duplicado antes de salvar */
async function cpfConflict(c: Ctx, cpf: string | null, ignoreId?: string) {
  if (!cpf) return null
  const [dup] = await c
    .get('db')
    .select({ id: people.id, name: people.name })
    .from(people)
    .where(and(eq(people.orgId, c.get('orgId')), eq(people.cpf, cpf), isNull(people.deletedAt)))
    .limit(1)
  return dup && dup.id !== ignoreId ? dup : null
}

peopleRoutes.post('/', perm('people.edit', 'adoptions.create', 'animals.create'), async (c) => {
  const input = await body(c, personSchema)
  const dup = await cpfConflict(c, input.cpf)
  if (dup) return c.json({ error: `CPF já cadastrado para ${dup.name}`, fields: { cpf: 'CPF já cadastrado' }, existingId: dup.id }, 409)
  const [p] = await c.get('db').insert(people).values({ ...input, orgId: c.get('orgId') }).returning()
  broadcast(c, ['people'])
  return c.json(p, 201)
})

peopleRoutes.patch('/:id', perm('people.edit'), async (c) => {
  const p = await findPerson(c, c.req.param('id'))
  const input = await body(c, personSchema)
  const dup = await cpfConflict(c, input.cpf, p.id)
  if (dup) return c.json({ error: `CPF já cadastrado para ${dup.name}`, fields: { cpf: 'CPF já cadastrado' } }, 409)
  await c.get('db').update(people).set(input).where(eq(people.id, p.id))
  broadcast(c, ['people'])
  return c.json({ ok: true })
})

peopleRoutes.delete('/:id', perm('people.delete'), async (c) => {
  const p = await findPerson(c, c.req.param('id'))
  await c.get('db').update(people).set({ deletedAt: new Date() }).where(eq(people.id, p.id))
  broadcast(c, ['people'])
  return c.json({ ok: true })
})
