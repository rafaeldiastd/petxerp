import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { perm, requireOrg, requireUser, type AppEnv } from '../lib/context'
import { rows } from '../db/client'
import { animals, people } from '../db/schema'
import { foodSummary } from './stock'
import type { DashboardData } from '../../shared/types'

export const dashboardRoutes = new Hono<AppEnv>()
dashboardRoutes.use('*', requireUser, requireOrg)

dashboardRoutes.get('/', perm('animals.view', 'stock.view', 'finance.view'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')

  const [
    statusRows, speciesRows, monthTotals, food, finance, byPartner, donationsMonth, monthly,
    castrations, upcoming, lowStock, recentAnimals, activity,
  ] = await Promise.all([
    rows<{ status: string; n: number }>(
      db,
      sql`select status, count(*)::int as n from animals where org_id = ${orgId} and deleted_at is null group by status`,
    ),
    rows<{ species: string; n: number }>(
      db,
      sql`select species, count(*)::int as n from animals
          where org_id = ${orgId} and deleted_at is null and status in ('sheltered','available','treatment','foster')
          group by species`,
    ),
    rows<{ intakes: number; adoptions: number }>(
      db,
      sql`select
            (select count(*)::int from animals where org_id = ${orgId} and deleted_at is null
               and date_trunc('month', intake_date) = date_trunc('month', current_date)) as intakes,
            (select count(*)::int from adoptions where org_id = ${orgId} and status = 'active'
               and date_trunc('month', date) = date_trunc('month', current_date)) as adoptions`,
    ),
    foodSummary(db, orgId),
    rows<{ open: number; overdue: number }>(
      db,
      sql`select coalesce(sum(amount) filter (where not paid), 0)::float as open,
                 coalesce(sum(amount) filter (where not paid and due_date < current_date), 0)::float as overdue
          from expenses where org_id = ${orgId}`,
    ),
    rows<{ partner_id: string | null; name: string; amount: number; count: number }>(
      db,
      sql`select e.partner_id, coalesce(p.name, 'Sem empresa vinculada') as name, sum(e.amount)::float as amount, count(*)::int as count
          from expenses e left join partners p on p.id = e.partner_id
          where e.org_id = ${orgId} and not e.paid
          group by e.partner_id, p.name order by amount desc limit 5`,
    ),
    rows<{ total: number }>(
      db,
      sql`select coalesce(sum(amount), 0)::float as total from donations
          where org_id = ${orgId} and status = 'paid' and date_trunc('month', date) = date_trunc('month', now())`,
    ),
    rows<{ month: string; intakes: number; adoptions: number }>(
      db,
      sql`with months as (
            select to_char(d, 'YYYY-MM') as month
            from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') d
          )
          select m.month,
            (select count(*)::int from animals a where a.org_id = ${orgId} and a.deleted_at is null and to_char(a.intake_date, 'YYYY-MM') = m.month) as intakes,
            (select count(*)::int from adoptions ad where ad.org_id = ${orgId} and ad.status <> 'cancelled' and to_char(ad.date, 'YYYY-MM') = m.month) as adoptions
          from months m order by m.month`,
    ),
    rows<{ adoption_id: string; animal_name: string; person_name: string; deadline: string }>(
      db,
      sql`select ad.id as adoption_id, a.name as animal_name, p.name as person_name, ad.castration_deadline::text as deadline
          from adoptions ad join animals a on a.id = ad.animal_id join people p on p.id = ad.person_id
          where ad.org_id = ${orgId} and ad.status = 'active' and not ad.castration_done
            and ad.castration_deadline is not null and ad.castration_deadline <= current_date + 15
          order by ad.castration_deadline limit 6`,
    ),
    rows<{ animal_id: string; animal_name: string; type: string; title: string | null; next_date: string }>(
      db,
      sql`select distinct on (e.animal_id, e.type) e.animal_id, a.name as animal_name, e.type, e.title, e.next_date::text
          from animal_events e join animals a on a.id = e.animal_id
          where e.org_id = ${orgId} and e.next_date is not null and e.next_date <= current_date + 15
            and a.deleted_at is null and a.status in ('sheltered','available','treatment','foster')
            and not exists (select 1 from animal_events e2 where e2.animal_id = e.animal_id and e2.type = e.type and e2.date > e.date)
          order by e.animal_id, e.type, e.next_date limit 8`,
    ),
    rows<{ id: string; name: string; quantity: number; min_quantity: number; unit: string }>(
      db,
      sql`select id, name, quantity::float, min_quantity::float, unit from stock_items
          where org_id = ${orgId} and deleted_at is null and min_quantity is not null and quantity <= min_quantity
          order by (quantity / nullif(min_quantity, 0)) nulls first limit 6`,
    ),
    db
      .select({
        id: animals.id, name: animals.name, photoKey: animals.photoKey, species: animals.species, sex: animals.sex,
        status: animals.status, intakeDate: animals.intakeDate, code: animals.code,
      })
      .from(animals)
      .where(and(eq(animals.orgId, orgId), isNull(animals.deletedAt), inArray(animals.status, ['sheltered', 'available', 'treatment', 'foster'])))
      .orderBy(desc(animals.intakeDate), desc(animals.code))
      .limit(6),
    rows<{ id: string; type: string; date: string; title: string | null; animal_id: string; animal_name: string; created_at: string }>(
      db,
      sql`select e.id, e.type, e.date::text, e.title, e.animal_id, a.name as animal_name, e.created_at
          from animal_events e join animals a on a.id = e.animal_id
          where e.org_id = ${orgId} and a.deleted_at is null
          order by e.created_at desc limit 8`,
    ),
  ])

  // valores financeiros só para quem tem acesso ao financeiro
  const canFinance = c.get('member').permissions.includes('finance.view')
  if (!canFinance) {
    finance.splice(0, finance.length, { open: 0, overdue: 0 })
    byPartner.length = 0
    donationsMonth.length = 0
  }

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n]))
  const active = ['sheltered', 'available', 'treatment', 'foster'].reduce((s, k) => s + (byStatus[k] ?? 0), 0)

  const data: DashboardData = {
    animals: {
      active,
      available: byStatus.available ?? 0,
      treatment: byStatus.treatment ?? 0,
      bySpecies: Object.fromEntries(speciesRows.map((r) => [r.species, r.n])),
      intakesThisMonth: monthTotals[0]?.intakes ?? 0,
      adoptedThisMonth: monthTotals[0]?.adoptions ?? 0,
    },
    food,
    finance: {
      openTotal: finance[0]?.open ?? 0,
      overdueTotal: finance[0]?.overdue ?? 0,
      openByPartner: byPartner.map((r) => ({ partnerId: r.partner_id, name: r.name, amount: r.amount, count: r.count })),
      donationsThisMonth: donationsMonth[0]?.total ?? 0,
    },
    monthly,
    alerts: {
      castrations: castrations.map((r) => ({ adoptionId: r.adoption_id, animalName: r.animal_name, personName: r.person_name, deadline: r.deadline })),
      upcoming: upcoming.map((r) => ({ animalId: r.animal_id, animalName: r.animal_name, type: r.type, title: r.title, nextDate: r.next_date })),
      lowStock: lowStock.map((r) => ({ id: r.id, name: r.name, quantity: r.quantity, minQuantity: r.min_quantity, unit: r.unit })),
    },
    recentAnimals,
    activity: activity.map((r) => ({
      id: r.id, type: r.type, date: r.date, title: r.title, animalId: r.animal_id, animalName: r.animal_name,
      createdAt: String(r.created_at),
    })),
  }
  return c.json(data)
})

/** Busca global (paleta de comandos ⌘K): animais e pessoas */
dashboardRoutes.get('/search', async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const q = c.req.query('q')?.trim()
  if (!q || q.length < 2) return c.json({ animals: [], people: [] })
  const like = `%${q}%`
  const can = c.get('member').permissions
  const [a, p] = await Promise.all([
    can.includes('animals.view')
      ? db
          .select({ id: animals.id, name: animals.name, code: animals.code, species: animals.species, status: animals.status, photoKey: animals.photoKey })
          .from(animals)
          .where(and(eq(animals.orgId, orgId), isNull(animals.deletedAt), sql`(${animals.name} ilike ${like} or ${animals.microchip} ilike ${like} or ${animals.code}::text = ${q.replace('#', '')})`))
          .limit(6)
      : Promise.resolve([]),
    can.includes('people.view')
      ? db
          .select({ id: people.id, name: people.name, phone: people.phone, types: people.types })
          .from(people)
          .where(and(eq(people.orgId, orgId), isNull(people.deletedAt), sql`(${people.name} ilike ${like} or ${people.cpf} ilike ${like})`))
          .limit(6)
      : Promise.resolve([]),
  ])
  return c.json({ animals: a, people: p })
})
