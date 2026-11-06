import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  badRequest, body, notFound, pagination, perm, requireOrg, requireUser, today, type AppEnv, type Ctx,
} from '../lib/context'
import { runBatch, isUniqueViolation } from '../lib/batch'
import { rows, type DB } from '../db/client'
import { adoptions, animalEvents, animals, expenses, people, user } from '../db/schema'
import { broadcast } from '../realtime'
import { animalSchema, deathSchema, eventSchema } from '../../shared/schemas'
import { ACTIVE_STATUSES, DEATH_REASONS, EVENT_TYPE } from '../../shared/constants'

export const animalRoutes = new Hono<AppEnv>()
animalRoutes.use('*', requireUser, requireOrg)

const csv = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])

function baseFilters(c: Ctx, withStatus: boolean) {
  const orgId = c.get('orgId')
  const conds: SQL[] = [eq(animals.orgId, orgId), isNull(animals.deletedAt)]
  const q = c.req.query('q')?.trim()
  if (q) {
    const like = `%${q}%`
    const parts = [ilike(animals.name, like), ilike(animals.breed, like), ilike(animals.microchip, like), ilike(animals.coatColor, like)]
    // código interno (#0042): só números curtos — um microchip (15 dígitos) estourava o integer
    if (/^#?\d{1,6}$/.test(q)) parts.push(eq(animals.code, Number(q.replace('#', ''))))
    // microchip digitado com espaços/pontos: compara só os dígitos
    const digits = q.replace(/\D/g, '')
    if (digits.length >= 4) {
      parts.push(sql`regexp_replace(coalesce(${animals.microchip}, ''), '\\D', '', 'g') like ${`%${digits}%`}`)
    }
    conds.push(or(...parts)!)
  }
  if (withStatus) {
    const status = c.req.query('status')
    if (status === 'active') conds.push(inArray(animals.status, [...ACTIVE_STATUSES]))
    else if (status && status !== 'all') conds.push(inArray(animals.status, csv(status)))
  }
  for (const [param, col] of [
    ['species', animals.species],
    ['sex', animals.sex],
    ['ageGroup', animals.ageGroup],
    ['size', animals.size],
  ] as const) {
    const values = csv(c.req.query(param))
    if (values.length) conds.push(inArray(col, values))
  }
  for (const [param, col] of [
    ['castrated', animals.castrated],
    ['vaccinated', animals.vaccinated],
    ['dewormed', animals.dewormed],
  ] as const) {
    const v = c.req.query(param)
    if (v === 'true' || v === 'false') conds.push(eq(col, v === 'true'))
  }
  if (c.req.query('special') === 'true') {
    conds.push(or(isNotNull(animals.specialCare), isNotNull(animals.diseases), isNotNull(animals.disabilities))!)
  }
  if (c.req.query('bonded') === 'true') conds.push(sql`cardinality(${animals.bondedWith}) > 0`)
  return conds
}

function orderBy(sort?: string) {
  switch (sort) {
    case 'name':
      return [asc(animals.name)]
    case 'oldest':
      return [asc(animals.intakeDate), asc(animals.code)]
    case 'code':
      return [desc(animals.code)]
    default:
      return [desc(animals.intakeDate), desc(animals.code)]
  }
}

/** Mantém a "adoção conjunta" simétrica: se A está ligado a B, B também está ligado a A */
function bondOps(db: DB, orgId: string, id: string, prev: string[], next: string[]) {
  const added = next.filter((x) => !prev.includes(x) && x !== id)
  const removed = prev.filter((x) => !next.includes(x))
  const ops = []
  if (added.length) {
    ops.push(
      db
        .update(animals)
        .set({ bondedWith: sql`array(select distinct unnest(${animals.bondedWith} || array[${id}]::uuid[]))` })
        .where(and(eq(animals.orgId, orgId), inArray(animals.id, added))),
    )
  }
  if (removed.length) {
    ops.push(
      db
        .update(animals)
        .set({ bondedWith: sql`array_remove(${animals.bondedWith}, ${id}::uuid)` })
        .where(and(eq(animals.orgId, orgId), inArray(animals.id, removed))),
    )
  }
  return ops
}

async function findAnimal(c: Ctx, id: string) {
  const [a] = await c
    .get('db')
    .select()
    .from(animals)
    .where(and(eq(animals.id, id), eq(animals.orgId, c.get('orgId')), isNull(animals.deletedAt)))
    .limit(1)
  if (!a) notFound('Animal')
  return a
}

// ---------------------------------------------------------------- listagem
animalRoutes.get('/', perm('animals.view'), async (c) => {
  const db = c.get('db')
  const { limit, offset } = pagination(c)
  const where = and(...baseFilters(c, true))

  const [items, [{ total } = { total: 0 }], counts] = await Promise.all([
    db.select().from(animals).where(where).orderBy(...orderBy(c.req.query('sort'))).limit(limit).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(animals).where(where),
    offset === 0
      ? db
          .select({ status: animals.status, n: sql<number>`count(*)::int` })
          .from(animals)
          .where(and(...baseFilters(c, false)))
          .groupBy(animals.status)
      : Promise.resolve([]),
  ])

  return c.json({
    items,
    total,
    limit,
    offset,
    counts: Object.fromEntries(counts.map((r) => [r.status, r.n])),
  })
})

/** Lista leve para seletores (adoção, despesas, adoção conjunta) */
animalRoutes.get('/options', perm('animals.view', 'adoptions.create', 'finance.manage'), async (c) => {
  const db = c.get('db')
  const conds = baseFilters(c, true)
  const exclude = c.req.query('exclude')
  if (exclude) conds.push(ne(animals.id, exclude))
  const items = await db
    .select({
      id: animals.id, code: animals.code, name: animals.name, species: animals.species, sex: animals.sex,
      status: animals.status, photoKey: animals.photoKey, bondedWith: animals.bondedWith, castrated: animals.castrated,
      ageGroup: animals.ageGroup, birthDate: animals.birthDate,
    })
    .from(animals)
    .where(and(...conds))
    .orderBy(asc(animals.name))
    .limit(30)
  return c.json(items)
})

// ---------------------------------------------------------------- ficha
animalRoutes.get('/:id', perm('animals.view'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  const personIds = [a.reporterId, a.adopterId].filter(Boolean) as string[]

  const [persons, bonded, [cost]] = await Promise.all([
    personIds.length ? db.select().from(people).where(inArray(people.id, personIds)) : Promise.resolve([]),
    a.bondedWith.length
      ? db
          .select({ id: animals.id, name: animals.name, photoKey: animals.photoKey, species: animals.species, status: animals.status, code: animals.code })
          .from(animals)
          .where(and(inArray(animals.id, a.bondedWith), isNull(animals.deletedAt)))
      : Promise.resolve([]),
    rows<{ total: number }>(
      db,
      sql`select (coalesce((select sum(amount) from expenses where animal_id = ${a.id}), 0)
             + coalesce((select sum(cost) from animal_events where animal_id = ${a.id}), 0))::float as total`,
    ),
  ])

  return c.json({
    ...a,
    reporter: persons.find((p) => p.id === a.reporterId) ?? null,
    adopter: persons.find((p) => p.id === a.adopterId) ?? null,
    bonded,
    totalCost: cost?.total ?? 0,
  })
})

// ---------------------------------------------------------------- criar (boletim de entrada)
animalRoutes.post('/', perm('animals.create'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const input = await body(c, animalSchema)
  if (input.status === 'adopted' || input.status === 'deceased') input.status = 'sheltered'

  let created: typeof animals.$inferSelect | undefined
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      ;[created] = await db
        .insert(animals)
        .values({
          ...input,
          orgId,
          createdBy: c.get('user').id,
          code: sql`(select coalesce(max(code), 0) + 1 from animals where org_id = ${orgId})`,
        })
        .returning()
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 2) throw e
    }
  }
  if (!created) throw new HTTPException(500, { message: 'Falha ao cadastrar' })

  await runBatch(db, [
    db.insert(animalEvents).values({
      orgId,
      animalId: created.id,
      type: 'intake',
      date: created.intakeDate,
      title: 'Entrada na ONG',
      description: input.intakeCondition,
      createdBy: c.get('user').id,
    }),
    ...bondOps(db, orgId, created.id, [], input.bondedWith),
  ])

  broadcast(c, ['animals'], { action: 'created', id: created.id })
  return c.json(created, 201)
})

// ---------------------------------------------------------------- editar
animalRoutes.patch('/:id', perm('animals.edit'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const current = await findAnimal(c, c.req.param('id'))
  const input = await body(c, animalSchema)

  // adotado/óbito só mudam pelos fluxos próprios (adoção, devolução, óbito)
  if (current.status === 'adopted' || current.status === 'deceased') input.status = current.status
  else if (input.status === 'adopted' || input.status === 'deceased') {
    badRequest('Use as ações "Declarar adoção" ou "Declarar óbito" para alterar este status')
  }
  input.bondedWith = input.bondedWith.filter((x) => x !== current.id)

  const [, ...rest] = await runBatch(db, [
    db.update(animals).set(input).where(and(eq(animals.id, current.id), eq(animals.orgId, orgId))),
    ...bondOps(db, orgId, current.id, current.bondedWith, input.bondedWith),
    ...(input.status !== current.status
      ? [
          db.insert(animalEvents).values({
            orgId,
            animalId: current.id,
            type: 'status',
            date: today(),
            title: 'Mudança de status',
            data: { from: current.status, to: input.status },
            createdBy: c.get('user').id,
          }),
        ]
      : []),
  ])
  void rest

  broadcast(c, ['animals'], { action: 'updated', id: current.id })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------- excluir (soft delete)
animalRoutes.delete('/:id', perm('animals.delete'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  await runBatch(db, [
    db.update(animals).set({ deletedAt: new Date(), bondedWith: [] }).where(eq(animals.id, a.id)),
    ...bondOps(db, c.get('orgId'), a.id, a.bondedWith, []),
  ])
  broadcast(c, ['animals'], { action: 'deleted', id: a.id })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------- óbito
animalRoutes.post('/:id/death', perm('animals.death'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  if (a.status === 'deceased') badRequest('O óbito deste animal já foi declarado')
  const input = await body(c, deathSchema)

  await runBatch(db, [
    db
      .update(animals)
      .set({ status: 'deceased', deathDate: input.date, deathReason: input.reason, deathNotes: input.notes })
      .where(eq(animals.id, a.id)),
    db.insert(animalEvents).values({
      orgId: c.get('orgId'),
      animalId: a.id,
      type: 'death',
      date: input.date,
      title: `Óbito — ${DEATH_REASONS[input.reason]}`,
      description: input.notes,
      data: { previousStatus: a.status },
      createdBy: c.get('user').id,
    }),
  ])
  broadcast(c, ['animals'], { action: 'death', id: a.id })
  return c.json({ ok: true })
})

/** Desfaz um óbito registrado por engano */
animalRoutes.post('/:id/death/undo', perm('animals.death'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  if (a.status !== 'deceased') badRequest('Este animal não está com óbito declarado')
  await runBatch(db, [
    db.update(animals).set({ status: 'sheltered', deathDate: null, deathReason: null, deathNotes: null }).where(eq(animals.id, a.id)),
    db.delete(animalEvents).where(and(eq(animalEvents.animalId, a.id), eq(animalEvents.type, 'death'))),
  ])
  broadcast(c, ['animals'], { action: 'updated', id: a.id })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------- histórico / saúde
animalRoutes.get('/:id/events', perm('animals.view'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  const items = await db
    .select({
      id: animalEvents.id, animalId: animalEvents.animalId, type: animalEvents.type, date: animalEvents.date,
      title: animalEvents.title, description: animalEvents.description, nextDate: animalEvents.nextDate,
      cost: animalEvents.cost, data: animalEvents.data, createdAt: animalEvents.createdAt, createdByName: user.name,
    })
    .from(animalEvents)
    .leftJoin(user, eq(user.id, animalEvents.createdBy))
    .where(eq(animalEvents.animalId, a.id))
    .orderBy(desc(animalEvents.date), desc(animalEvents.createdAt))
  return c.json(items)
})

animalRoutes.post('/:id/events', perm('animals.medical'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const a = await findAnimal(c, c.req.param('id'))
  const input = await body(c, eventSchema)

  const flags: Partial<typeof animals.$inferInsert> = {}
  if (input.type === 'vaccine') flags.vaccinated = true
  if (input.type === 'deworming') flags.dewormed = true
  if (input.type === 'castration') Object.assign(flags, { castrated: true, castrationDate: input.date })
  if (input.type === 'weight') {
    if (input.weightKg == null) badRequest('Informe o peso')
    flags.weightKg = input.weightKg
  }

  const [inserted] = await runBatch(db, [
    db
      .insert(animalEvents)
      .values({
        orgId,
        animalId: a.id,
        type: input.type,
        date: input.date,
        title: input.title ?? (input.type === 'weight' ? `${input.weightKg} kg` : EVENT_TYPE[input.type]),
        description: input.description,
        nextDate: input.nextDate,
        cost: input.cost,
        data: input.type === 'weight' ? { weightKg: input.weightKg } : null,
        createdBy: c.get('user').id,
      })
      .returning(),
    ...(Object.keys(flags).length ? [db.update(animals).set(flags).where(eq(animals.id, a.id))] : []),
    // castração registrada na ficha também quita a pendência da adoção ativa
    ...(input.type === 'castration'
      ? [
          db
            .update(adoptions)
            .set({ castrationDone: true, castrationDoneAt: input.date })
            .where(and(eq(adoptions.animalId, a.id), eq(adoptions.status, 'active'), eq(adoptions.castrationDone, false))),
        ]
      : []),
  ])

  broadcast(c, ['animals', 'adoptions'], { action: 'event', id: a.id })
  return c.json(inserted, 201)
})

animalRoutes.delete('/:id/events/:eventId', perm('animals.medical'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  const [ev] = await db
    .select()
    .from(animalEvents)
    .where(and(eq(animalEvents.id, c.req.param('eventId')), eq(animalEvents.animalId, a.id)))
  if (!ev) notFound('Evento')
  if (['intake', 'adoption', 'return', 'death'].includes(ev.type)) {
    badRequest('Eventos automáticos (entrada, adoção, devolução, óbito) não podem ser excluídos')
  }
  await db.delete(animalEvents).where(eq(animalEvents.id, ev.id))
  broadcast(c, ['animals'], { action: 'event', id: a.id })
  return c.json({ ok: true })
})

animalRoutes.get('/:id/adoptions', perm('animals.view'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  const items = await db
    .select({
      id: adoptions.id, date: adoptions.date, status: adoptions.status, returnedAt: adoptions.returnedAt,
      returnReason: adoptions.returnReason, castrationDeadline: adoptions.castrationDeadline,
      castrationDone: adoptions.castrationDone, person: { id: people.id, name: people.name, phone: people.phone },
    })
    .from(adoptions)
    .innerJoin(people, eq(people.id, adoptions.personId))
    .where(eq(adoptions.animalId, a.id))
    .orderBy(desc(adoptions.date))
  return c.json(items)
})

animalRoutes.get('/:id/expenses', perm('finance.view'), async (c) => {
  const db = c.get('db')
  const a = await findAnimal(c, c.req.param('id'))
  const items = await db.select().from(expenses).where(eq(expenses.animalId, a.id)).orderBy(desc(expenses.createdAt))
  return c.json(items)
})
