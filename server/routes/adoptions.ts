import { and, desc, eq, ilike, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  badRequest, body, notFound, pagination, perm, requireOrg, requireUser, today, type AppEnv, type Ctx,
} from '../lib/context'
import { runBatch } from '../lib/batch'
import { adoptions, animalEvents, animals, organizations, people } from '../db/schema'
import { broadcast } from '../realtime'
import { adoptionReturnSchema, adoptionSchema, fileSchema } from '../../shared/schemas'
import { ADOPTABLE_STATUSES } from '../../shared/constants'
import { fillOrg, withDefaults } from '../../shared/defaults'

export const adoptionRoutes = new Hono<AppEnv>()
adoptionRoutes.use('*', requireUser, requireOrg)

const listFields = {
  adoption: adoptions,
  animal: {
    id: animals.id, name: animals.name, photoKey: animals.photoKey, species: animals.species, sex: animals.sex,
    code: animals.code, status: animals.status, breed: animals.breed, size: animals.size, coatColor: animals.coatColor,
    ageGroup: animals.ageGroup, microchip: animals.microchip, castrated: animals.castrated,
    vaccinated: animals.vaccinated, dewormed: animals.dewormed, birthDate: animals.birthDate,
  },
  person: {
    id: people.id, name: people.name, phone: people.phone, whatsapp: people.whatsapp, email: people.email,
    cpf: people.cpf, rg: people.rg, street: people.street, number: people.number, neighborhood: people.neighborhood,
    city: people.city, state: people.state, restricted: people.restricted,
  },
}

async function findAdoption(c: Ctx, id: string) {
  const [row] = await c
    .get('db')
    .select(listFields)
    .from(adoptions)
    .innerJoin(animals, eq(animals.id, adoptions.animalId))
    .innerJoin(people, eq(people.id, adoptions.personId))
    .where(and(eq(adoptions.id, id), eq(adoptions.orgId, c.get('orgId'))))
  if (!row) notFound('Adoção')
  return { ...row.adoption, animal: row.animal, person: row.person }
}

adoptionRoutes.get('/', perm('adoptions.view'), async (c) => {
  const db = c.get('db')
  const { limit, offset } = pagination(c, 30)
  const conds: SQL[] = [eq(adoptions.orgId, c.get('orgId'))]
  const q = c.req.query('q')?.trim()
  if (q) conds.push(or(ilike(animals.name, `%${q}%`), ilike(people.name, `%${q}%`))!)
  const status = c.req.query('status')
  if (status) conds.push(eq(adoptions.status, status))
  const castration = c.req.query('castration')
  if (castration === 'pending' || castration === 'overdue') {
    conds.push(eq(adoptions.status, 'active'), eq(adoptions.castrationDone, false), sql`${adoptions.castrationDeadline} is not null`)
    if (castration === 'overdue') conds.push(lt(adoptions.castrationDeadline, today()))
  }
  const where = and(...conds)
  const [items, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select(listFields)
      .from(adoptions)
      .innerJoin(animals, eq(animals.id, adoptions.animalId))
      .innerJoin(people, eq(people.id, adoptions.personId))
      .where(where)
      .orderBy(desc(adoptions.date), desc(adoptions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(adoptions)
      .innerJoin(animals, eq(animals.id, adoptions.animalId))
      .innerJoin(people, eq(people.id, adoptions.personId))
      .where(where),
  ])
  return c.json({ items: items.map((r) => ({ ...r.adoption, animal: r.animal, person: r.person })), total, limit, offset })
})

/** Ficha da adoção + dados da ONG (para impressão do termo) */
adoptionRoutes.get('/:id', perm('adoptions.view'), async (c) => {
  const db = c.get('db')
  const a = await findAdoption(c, c.req.param('id'))
  const [org] = await db.select().from(organizations).where(eq(organizations.id, c.get('orgId')))
  const [personFull] = await db.select().from(people).where(eq(people.id, a.personId))
  const [vaccines, group] = await Promise.all([
    db
      .select({ date: animalEvents.date, title: animalEvents.title, type: animalEvents.type })
      .from(animalEvents)
      .where(and(eq(animalEvents.animalId, a.animalId), inArray(animalEvents.type, ['vaccine', 'deworming'])))
      .orderBy(animalEvents.date),
    // outras adoções feitas junto (mesmo adotante, mesmo momento)
    a.groupId
      ? db
          .select({ id: adoptions.id, status: adoptions.status, animal: { id: animals.id, name: animals.name, photoKey: animals.photoKey, species: animals.species } })
          .from(adoptions)
          .innerJoin(animals, eq(animals.id, adoptions.animalId))
          .where(and(eq(adoptions.groupId, a.groupId), eq(adoptions.orgId, c.get('orgId'))))
          .orderBy(animals.name)
      : Promise.resolve([]),
  ])
  return c.json({ ...a, personFull, vaccines, group, org: org ? { ...org, settings: withDefaults(org.settings) } : null })
})

adoptionRoutes.post('/', perm('adoptions.create'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const input = await body(c, adoptionSchema)
  const ids = [...new Set(input.animals.map((x) => x.animalId))]

  const [list, [person], [org], vaccineRows] = await Promise.all([
    db.select().from(animals).where(and(inArray(animals.id, ids), eq(animals.orgId, orgId), isNull(animals.deletedAt))),
    db.select().from(people).where(and(eq(people.id, input.personId), eq(people.orgId, orgId), isNull(people.deletedAt))),
    db.select().from(organizations).where(eq(organizations.id, orgId)),
    db
      .select({ animalId: animalEvents.animalId, date: animalEvents.date, title: animalEvents.title, type: animalEvents.type })
      .from(animalEvents)
      .where(and(inArray(animalEvents.animalId, ids), inArray(animalEvents.type, ['vaccine', 'deworming'])))
      .orderBy(animalEvents.date),
  ])
  if (list.length !== ids.length) notFound('Animal')
  if (!person) notFound('Adotante')
  const unavailable = list.filter((a) => !(ADOPTABLE_STATUSES as readonly string[]).includes(a.status))
  if (unavailable.length) badRequest(`${unavailable.map((a) => a.name).join(', ')} não está(ão) disponível(is) para adoção`)
  if (person.restricted) badRequest(`${person.name} possui restrição para adoção: ${person.restrictionReason ?? 'consulte o cadastro'}`)

  const settings = withDefaults(org?.settings)
  const orgName = org?.name ?? 'ONG'
  const termSnapshot = {
    term: fillOrg(settings.adoptionTerm, orgName),
    declaration: fillOrg(settings.adoptionDeclaration, orgName),
    responsibilities: fillOrg(settings.adopterResponsibilities, orgName),
  }
  const groupId = ids.length > 1 ? crypto.randomUUID() : null
  const userId = c.get('user').id
  const created: { id: string; animalId: string }[] = []

  // tudo numa única transação HTTP: ou todas as adoções entram, ou nenhuma
  const ops = list.flatMap((animal) => {
    const id = crypto.randomUUID()
    created.push({ id, animalId: animal.id })
    const deadline = input.animals.find((x) => x.animalId === animal.id)?.castrationDeadline ?? null
    return [
      db.insert(adoptions).values({
        id,
        orgId,
        groupId,
        animalId: animal.id,
        personId: person.id,
        date: input.date,
        location: input.location,
        castrationDeadline: animal.castrated ? null : deadline,
        castrationDone: animal.castrated,
        castrationDoneAt: animal.castrated ? animal.castrationDate : null,
        requirements: input.requirements,
        documents: input.documents,
        notes: input.notes,
        termAcceptedAt: new Date(),
        termSnapshot,
        animalSnapshot: {
          name: animal.name, species: animal.species, sex: animal.sex, breed: animal.breed, size: animal.size,
          coatColor: animal.coatColor, ageGroup: animal.ageGroup, birthDate: animal.birthDate,
          microchip: animal.microchip, castrated: animal.castrated, castrationDate: animal.castrationDate,
          vaccinated: animal.vaccinated, dewormed: animal.dewormed,
          vaccines: vaccineRows.filter((v) => v.animalId === animal.id).map(({ animalId: _a, ...v }) => v),
        },
        createdBy: userId,
      }),
      db.update(animals).set({ status: 'adopted', adoptedAt: input.date, adopterId: person.id }).where(eq(animals.id, animal.id)),
      db.insert(animalEvents).values({
        orgId,
        animalId: animal.id,
        type: 'adoption',
        date: input.date,
        title: `Adotado por ${person.name}`,
        data: { personId: person.id, previousStatus: animal.status, groupId },
        createdBy: userId,
      }),
    ]
  })

  await runBatch(db, [
    ...ops,
    db
      .update(people)
      .set({ types: sql`array(select distinct unnest(${people.types} || array['adopter']::text[]))` })
      .where(eq(people.id, person.id)),
  ])

  broadcast(c, ['adoptions', 'animals', 'people'], { action: 'adopted' })
  return c.json({ ids: created.map((x) => x.id), groupId, adoptions: created }, 201)
})

const patchSchema = z.object({
  location: z.string().nullish(),
  castrationDeadline: z.string().nullish(),
  notes: z.string().max(4000).nullish(),
  documents: z.array(fileSchema).max(20).optional(),
})

adoptionRoutes.patch('/:id', perm('adoptions.create', 'adoptions.manage'), async (c) => {
  const a = await findAdoption(c, c.req.param('id'))
  const input = await body(c, patchSchema)
  await c
    .get('db')
    .update(adoptions)
    .set({
      ...(input.location !== undefined && { location: input.location || null }),
      ...(input.castrationDeadline !== undefined && { castrationDeadline: input.castrationDeadline || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.documents && { documents: input.documents }),
    })
    .where(eq(adoptions.id, a.id))
  broadcast(c, ['adoptions'])
  return c.json({ ok: true })
})

/** Castração realizada pelo adotante */
adoptionRoutes.post('/:id/castration', perm('adoptions.create', 'adoptions.manage', 'animals.medical'), async (c) => {
  const db = c.get('db')
  const a = await findAdoption(c, c.req.param('id'))
  const { date } = await body(c, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  await runBatch(db, [
    db.update(adoptions).set({ castrationDone: true, castrationDoneAt: date }).where(eq(adoptions.id, a.id)),
    db.update(animals).set({ castrated: true, castrationDate: date }).where(eq(animals.id, a.animalId)),
    db.insert(animalEvents).values({
      orgId: c.get('orgId'),
      animalId: a.animalId,
      type: 'castration',
      date,
      title: 'Castração (realizada pelo adotante)',
      createdBy: c.get('user').id,
    }),
  ])
  broadcast(c, ['adoptions', 'animals'])
  return c.json({ ok: true })
})

/** Devolução: o animal volta para a ONG */
adoptionRoutes.post('/:id/return', perm('adoptions.manage'), async (c) => {
  const db = c.get('db')
  const a = await findAdoption(c, c.req.param('id'))
  if (a.status !== 'active') badRequest('Esta adoção não está ativa')
  const input = await body(c, adoptionReturnSchema)
  await runBatch(db, [
    db
      .update(adoptions)
      .set({ status: 'returned', returnedAt: input.date, returnReason: input.reason })
      .where(eq(adoptions.id, a.id)),
    db
      .update(animals)
      .set({ status: input.newStatus, adoptedAt: null, adopterId: null })
      .where(and(eq(animals.id, a.animalId), eq(animals.status, 'adopted'))),
    db.insert(animalEvents).values({
      orgId: c.get('orgId'),
      animalId: a.animalId,
      type: 'return',
      date: input.date,
      title: `Devolvido por ${a.person.name}`,
      description: input.reason,
      createdBy: c.get('user').id,
    }),
  ])
  broadcast(c, ['adoptions', 'animals'])
  return c.json({ ok: true })
})

/** Cancelamento (registro feito por engano) */
adoptionRoutes.post('/:id/cancel', perm('adoptions.manage'), async (c) => {
  const db = c.get('db')
  const a = await findAdoption(c, c.req.param('id'))
  if (a.status !== 'active') badRequest('Esta adoção não está ativa')
  await runBatch(db, [
    db.update(adoptions).set({ status: 'cancelled' }).where(eq(adoptions.id, a.id)),
    db
      .update(animals)
      .set({ status: 'available', adoptedAt: null, adopterId: null })
      .where(and(eq(animals.id, a.animalId), eq(animals.status, 'adopted'))),
    db
      .delete(animalEvents)
      .where(and(eq(animalEvents.animalId, a.animalId), eq(animalEvents.type, 'adoption'), eq(animalEvents.date, a.date))),
  ])
  broadcast(c, ['adoptions', 'animals'])
  return c.json({ ok: true })
})
