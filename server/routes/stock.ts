import { and, asc, desc, eq, ilike, isNull, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { badRequest, body, notFound, pagination, perm, requireOrg, requireUser, type AppEnv, type Ctx } from '../lib/context'
import { rows, type DB } from '../db/client'
import { organizations, stockItems, stockMovements, user } from '../db/schema'
import { broadcast } from '../realtime'
import { foodConsumptionSchema, movementSchema, stockItemSchema } from '../../shared/schemas'
import { withDefaults } from '../../shared/defaults'

export const stockRoutes = new Hono<AppEnv>()
stockRoutes.use('*', requireUser, requireOrg)

async function findItem(c: Ctx, id: string) {
  const [item] = await c
    .get('db')
    .select()
    .from(stockItems)
    .where(and(eq(stockItems.id, id), eq(stockItems.orgId, c.get('orgId')), isNull(stockItems.deletedAt)))
  if (!item) notFound('Item')
  return item
}

/** Ração em kg por espécie + consumo diário configurado => dias até esgotar */
export async function foodSummary(db: DB, orgId: string) {
  const [stock, [org]] = await Promise.all([
    rows<{ species: string | null; kg: number }>(
      db,
      sql`select species, sum(case when unit = 'g' then quantity / 1000 else quantity end)::float as kg
          from stock_items
          where org_id = ${orgId} and kind = 'food' and deleted_at is null and unit in ('kg', 'g')
          group by species`,
    ),
    db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId)),
  ])
  const daily = withDefaults(org?.settings).foodDailyKg
  const dailyKg = { dog: Number(daily.dog ?? 0), cat: Number(daily.cat ?? 0) }
  const by: Record<string, number> = { dog: 0, cat: 0, both: 0 }
  for (const r of stock) by[r.species ?? 'both'] = (by[r.species ?? 'both'] ?? 0) + Number(r.kg)

  // ração "ambos" é rateada proporcionalmente ao consumo de cada espécie
  const totalDaily = dailyKg.dog + dailyKg.cat
  const share = (s: 'dog' | 'cat') => (totalDaily > 0 ? dailyKg[s] / totalDaily : 0.5)
  const available = {
    dog: by.dog! + by.both! * share('dog'),
    cat: by.cat! + by.both! * share('cat'),
  }
  const days = (s: 'dog' | 'cat') => (dailyKg[s] > 0 ? Math.floor(available[s] / dailyKg[s]) : null)
  return {
    bySpecies: { dog: round(by.dog!), cat: round(by.cat!), both: round(by.both!), total: round(by.dog! + by.cat! + by.both!) },
    dailyKg,
    daysLeft: { dog: days('dog'), cat: days('cat') },
  }
}
const round = (n: number) => Math.round(n * 10) / 10

stockRoutes.get('/summary', perm('stock.view'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const [food, [low]] = await Promise.all([
    foodSummary(db, orgId),
    rows<{ low: number; expiring: number }>(
      db,
      sql`select count(*) filter (where min_quantity is not null and quantity <= min_quantity)::int as low,
                 count(*) filter (where expires_at is not null and expires_at <= current_date + 30)::int as expiring
          from stock_items where org_id = ${orgId} and deleted_at is null`,
    ),
  ])
  return c.json({ food, lowCount: low?.low ?? 0, expiringCount: low?.expiring ?? 0 })
})

stockRoutes.put('/consumption', perm('stock.manage'), async (c) => {
  const db = c.get('db')
  const input = await body(c, foodConsumptionSchema)
  await db
    .update(organizations)
    .set({ settings: sql`${organizations.settings} || ${JSON.stringify({ foodDailyKg: input })}::jsonb` })
    .where(eq(organizations.id, c.get('orgId')))
  broadcast(c, ['stock'])
  return c.json({ ok: true })
})

// ---------------------------------------------------------------- itens
stockRoutes.get('/items', perm('stock.view'), async (c) => {
  const conds: SQL[] = [eq(stockItems.orgId, c.get('orgId')), isNull(stockItems.deletedAt)]
  const kind = c.req.query('kind')
  if (kind === 'food') conds.push(eq(stockItems.kind, 'food'))
  else if (kind === 'items') conds.push(sql`${stockItems.kind} <> 'food'`)
  else if (kind) conds.push(eq(stockItems.kind, kind))
  const q = c.req.query('q')?.trim()
  if (q) conds.push(ilike(stockItems.name, `%${q}%`))
  const species = c.req.query('species')
  if (species) conds.push(eq(stockItems.species, species))
  if (c.req.query('low') === 'true') conds.push(sql`${stockItems.minQuantity} is not null and ${stockItems.quantity} <= ${stockItems.minQuantity}`)
  const items = await c
    .get('db')
    .select()
    .from(stockItems)
    .where(and(...conds))
    .orderBy(asc(stockItems.kind), asc(stockItems.name))
  return c.json(items)
})

stockRoutes.post('/items', perm('stock.manage'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const input = await body(c, stockItemSchema)
  const [item] = await db.insert(stockItems).values({ ...input, orgId }).returning()
  if (item && input.quantity > 0) {
    await db.insert(stockMovements).values({
      orgId, itemId: item.id, type: 'in', quantity: input.quantity, balanceAfter: input.quantity,
      reason: 'inventory', date: new Date().toISOString().slice(0, 10), notes: 'Saldo inicial', createdBy: c.get('user').id,
    })
  }
  broadcast(c, ['stock'])
  return c.json(item, 201)
})

stockRoutes.patch('/items/:id', perm('stock.manage'), async (c) => {
  const item = await findItem(c, c.req.param('id'))
  const { quantity: _ignored, ...input } = await body(c, stockItemSchema)
  void _ignored // quantidade só muda via movimentação (mantém histórico)
  await c.get('db').update(stockItems).set(input).where(eq(stockItems.id, item.id))
  broadcast(c, ['stock'])
  return c.json({ ok: true })
})

stockRoutes.delete('/items/:id', perm('stock.manage'), async (c) => {
  const item = await findItem(c, c.req.param('id'))
  await c.get('db').update(stockItems).set({ deletedAt: new Date() }).where(eq(stockItems.id, item.id))
  broadcast(c, ['stock'])
  return c.json({ ok: true })
})

// ---------------------------------------------------------------- movimentações
stockRoutes.get('/movements', perm('stock.view'), async (c) => {
  const { limit, offset } = pagination(c, 40)
  const conds: SQL[] = [eq(stockMovements.orgId, c.get('orgId'))]
  const itemId = c.req.query('itemId')
  if (itemId) conds.push(eq(stockMovements.itemId, itemId))
  const items = await c
    .get('db')
    .select({
      id: stockMovements.id, itemId: stockMovements.itemId, type: stockMovements.type, quantity: stockMovements.quantity,
      balanceAfter: stockMovements.balanceAfter, reason: stockMovements.reason, date: stockMovements.date,
      notes: stockMovements.notes, createdAt: stockMovements.createdAt, itemName: stockItems.name,
      itemUnit: stockItems.unit, createdByName: user.name,
    })
    .from(stockMovements)
    .innerJoin(stockItems, eq(stockItems.id, stockMovements.itemId))
    .leftJoin(user, eq(user.id, stockMovements.createdBy))
    .where(and(...conds))
    .orderBy(desc(stockMovements.date), desc(stockMovements.createdAt))
    .limit(limit)
    .offset(offset)
  return c.json(items)
})

/** Entrada/saída/ajuste atômico: atualiza o saldo e grava o histórico numa única instrução */
stockRoutes.post('/movements', perm('stock.move'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const input = await body(c, movementSchema)
  if (input.type !== 'adjust' && input.quantity <= 0) badRequest('Informe uma quantidade maior que zero')

  const result = await rows<{ id: string; balance_after: number }>(
    db,
    sql`with upd as (
          update stock_items set
            quantity = case ${input.type}
              when 'in' then quantity + ${input.quantity}
              when 'out' then quantity - ${input.quantity}
              else ${input.quantity}::numeric end,
            updated_at = now()
          where id = ${input.itemId} and org_id = ${orgId} and deleted_at is null
            and (${input.type} <> 'out' or quantity >= ${input.quantity})
          returning id, quantity
        )
        insert into stock_movements (org_id, item_id, type, quantity, balance_after, reason, date, notes, created_by)
        select ${orgId}, id, ${input.type}, ${input.quantity}, quantity, ${input.reason}, ${input.date}, ${input.notes}, ${c.get('user').id}
        from upd
        returning id, balance_after`,
  )
  if (!result.length) {
    await findItem(c, input.itemId)
    badRequest('Estoque insuficiente para esta saída')
  }
  broadcast(c, ['stock'])
  return c.json({ id: result[0]!.id, balanceAfter: Number(result[0]!.balance_after) }, 201)
})
