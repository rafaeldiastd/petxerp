import { and, asc, desc, eq, ilike, isNull, lt, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { body, notFound, pagination, perm, requireOrg, requireUser, today, type AppEnv, type Ctx } from '../lib/context'
import { rows } from '../db/client'
import { animals, expenses, partners } from '../db/schema'
import { broadcast } from '../realtime'
import { expenseSchema, partnerSchema } from '../../shared/schemas'

export const financeRoutes = new Hono<AppEnv>()
financeRoutes.use('*', requireUser, requireOrg)

// ================================================================ parceiros (clínicas/empresas)
const openAmount = sql<number>`coalesce((select sum(e.amount) from expenses e where e.partner_id = ${partners.id} and e.paid = false), 0)::float`

financeRoutes.get('/partners', perm('finance.view', 'finance.manage'), async (c) => {
  const conds: SQL[] = [eq(partners.orgId, c.get('orgId')), isNull(partners.deletedAt)]
  const q = c.req.query('q')?.trim()
  if (q) conds.push(ilike(partners.name, `%${q}%`))
  const type = c.req.query('type')
  if (type) conds.push(eq(partners.type, type))
  const items = await c
    .get('db')
    .select({ partner: partners, openAmount })
    .from(partners)
    .where(and(...conds))
    .orderBy(asc(partners.name))
  return c.json(items.map((r) => ({ ...r.partner, openAmount: r.openAmount })))
})

financeRoutes.post('/partners', perm('finance.manage'), async (c) => {
  const input = await body(c, partnerSchema)
  const [p] = await c.get('db').insert(partners).values({ ...input, orgId: c.get('orgId') }).returning()
  broadcast(c, ['partners'])
  return c.json(p, 201)
})

async function findPartner(c: Ctx, id: string) {
  const [p] = await c
    .get('db')
    .select()
    .from(partners)
    .where(and(eq(partners.id, id), eq(partners.orgId, c.get('orgId')), isNull(partners.deletedAt)))
  if (!p) notFound('Parceiro')
  return p
}

financeRoutes.patch('/partners/:id', perm('finance.manage'), async (c) => {
  const p = await findPartner(c, c.req.param('id'))
  const input = await body(c, partnerSchema)
  await c.get('db').update(partners).set(input).where(eq(partners.id, p.id))
  broadcast(c, ['partners'])
  return c.json({ ok: true })
})

financeRoutes.delete('/partners/:id', perm('finance.manage'), async (c) => {
  const p = await findPartner(c, c.req.param('id'))
  await c.get('db').update(partners).set({ deletedAt: new Date() }).where(eq(partners.id, p.id))
  broadcast(c, ['partners'])
  return c.json({ ok: true })
})

// ================================================================ despesas
function expenseFilters(c: Ctx) {
  const conds: SQL[] = [eq(expenses.orgId, c.get('orgId'))]
  const status = c.req.query('status')
  if (status === 'open') conds.push(eq(expenses.paid, false))
  if (status === 'paid') conds.push(eq(expenses.paid, true))
  if (status === 'overdue') conds.push(eq(expenses.paid, false), lt(expenses.dueDate, today()))
  const q = c.req.query('q')?.trim()
  if (q) conds.push(ilike(expenses.description, `%${q}%`))
  for (const [param, col] of [
    ['category', expenses.category],
    ['partnerId', expenses.partnerId],
    ['animalId', expenses.animalId],
  ] as const) {
    const v = c.req.query(param)
    if (v) conds.push(eq(col, v))
  }
  const month = c.req.query('month') // YYYY-MM (por vencimento)
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    conds.push(sql`to_char(coalesce(${expenses.dueDate}, ${expenses.createdAt}::date), 'YYYY-MM') = ${month}`)
  }
  return conds
}

financeRoutes.get('/expenses', perm('finance.view'), async (c) => {
  const db = c.get('db')
  const { limit, offset } = pagination(c, 40)
  const where = and(...expenseFilters(c))
  const [items, [agg]] = await Promise.all([
    db
      .select({ expense: expenses, partnerName: partners.name, animalName: animals.name })
      .from(expenses)
      .leftJoin(partners, eq(partners.id, expenses.partnerId))
      .leftJoin(animals, eq(animals.id, expenses.animalId))
      .where(where)
      .orderBy(asc(expenses.paid), sql`${expenses.dueDate} asc nulls last`, desc(expenses.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${expenses.amount}), 0)::float` })
      .from(expenses)
      .where(where),
  ])
  return c.json({
    items: items.map((r) => ({ ...r.expense, partnerName: r.partnerName, animalName: r.animalName })),
    total: agg?.total ?? 0,
    sum: agg?.sum ?? 0,
    limit,
    offset,
  })
})

financeRoutes.get('/expenses/summary', perm('finance.view'), async (c) => {
  const orgId = c.get('orgId')
  const [totals] = await rows<{ open: number; overdue: number; paid_month: number; open_count: number; overdue_count: number }>(
    c.get('db'),
    sql`select
          coalesce(sum(amount) filter (where not paid), 0)::float as open,
          count(*) filter (where not paid)::int as open_count,
          coalesce(sum(amount) filter (where not paid and due_date < current_date), 0)::float as overdue,
          count(*) filter (where not paid and due_date < current_date)::int as overdue_count,
          coalesce(sum(amount) filter (where paid and date_trunc('month', paid_at) = date_trunc('month', current_date)), 0)::float as paid_month
        from expenses where org_id = ${orgId}`,
  )
  const byPartner = await rows<{ partner_id: string | null; name: string; amount: number; count: number }>(
    c.get('db'),
    sql`select e.partner_id, coalesce(p.name, 'Sem empresa') as name, sum(e.amount)::float as amount, count(*)::int as count
        from expenses e left join partners p on p.id = e.partner_id
        where e.org_id = ${orgId} and not e.paid
        group by e.partner_id, p.name order by amount desc limit 8`,
  )
  return c.json({
    open: totals?.open ?? 0,
    openCount: totals?.open_count ?? 0,
    overdue: totals?.overdue ?? 0,
    overdueCount: totals?.overdue_count ?? 0,
    paidThisMonth: totals?.paid_month ?? 0,
    byPartner: byPartner.map((r) => ({ partnerId: r.partner_id, name: r.name, amount: r.amount, count: r.count })),
  })
})

async function findExpense(c: Ctx, id: string) {
  const [e] = await c.get('db').select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.orgId, c.get('orgId'))))
  if (!e) notFound('Despesa')
  return e
}

financeRoutes.post('/expenses', perm('finance.manage'), async (c) => {
  const input = await body(c, expenseSchema)
  if (input.paid && !input.paidAt) input.paidAt = today()
  if (!input.paid) input.paidAt = null
  const [e] = await c
    .get('db')
    .insert(expenses)
    .values({ ...input, orgId: c.get('orgId'), createdBy: c.get('user').id })
    .returning()
  broadcast(c, ['expenses', 'partners', ...(input.animalId ? (['animals'] as const) : [])])
  return c.json(e, 201)
})

financeRoutes.patch('/expenses/:id', perm('finance.manage'), async (c) => {
  const e = await findExpense(c, c.req.param('id'))
  const input = await body(c, expenseSchema)
  if (input.paid && !input.paidAt) input.paidAt = today()
  if (!input.paid) input.paidAt = null
  await c.get('db').update(expenses).set(input).where(eq(expenses.id, e.id))
  broadcast(c, ['expenses', 'partners'])
  return c.json({ ok: true })
})

financeRoutes.post('/expenses/:id/pay', perm('finance.manage'), async (c) => {
  const e = await findExpense(c, c.req.param('id'))
  const input = await body(
    c,
    z.object({ paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), paymentMethod: z.string().max(20).nullish(), paid: z.boolean().default(true) }),
  )
  await c
    .get('db')
    .update(expenses)
    .set(
      input.paid
        ? { paid: true, paidAt: input.paidAt ?? today(), ...(input.paymentMethod && { paymentMethod: input.paymentMethod }) }
        : { paid: false, paidAt: null },
    )
    .where(eq(expenses.id, e.id))
  broadcast(c, ['expenses', 'partners'])
  return c.json({ ok: true })
})

financeRoutes.delete('/expenses/:id', perm('finance.manage'), async (c) => {
  const e = await findExpense(c, c.req.param('id'))
  await c.get('db').delete(expenses).where(eq(expenses.id, e.id))
  broadcast(c, ['expenses', 'partners'])
  return c.json({ ok: true })
})
