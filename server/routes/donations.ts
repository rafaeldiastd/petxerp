import { and, desc, eq, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { body, notFound, pagination, perm, requireOrg, requireUser, type AppEnv } from '../lib/context'
import { decryptSecret, encryptSecret, hmacSha256Hex } from '../lib/crypto'
import { getDb, rows, type DB } from '../db/client'
import { donations, organizations, paymentSettings, people } from '../db/schema'
import { broadcast, broadcastOrg } from '../realtime'
import { checkoutSchema, donationSchema, paymentSettingsSchema } from '../../shared/schemas'
import type { PaymentSettingsPublic } from '../../shared/types'

const secretKey = (env: Env) => env.ENCRYPTION_KEY || env.BETTER_AUTH_SECRET

async function getSettings(db: DB, orgId: string) {
  const [s] = await db.select().from(paymentSettings).where(eq(paymentSettings.orgId, orgId))
  return s ?? null
}

function toPublic(s: Awaited<ReturnType<typeof getSettings>>): PaymentSettingsPublic {
  return {
    pixEnabled: s?.pixEnabled ?? false,
    pixKey: s?.pixKey ?? null,
    pixKeyType: s?.pixKeyType ?? null,
    pixName: s?.pixName ?? null,
    pixCity: s?.pixCity ?? null,
    stripeEnabled: s?.stripeEnabled ?? false,
    stripePublishableKey: s?.stripePublishableKey ?? null,
    stripeSecretSet: !!s?.stripeSecretKeyEnc,
    stripeWebhookSet: !!s?.stripeWebhookSecretEnc,
    mpEnabled: s?.mpEnabled ?? false,
    mpPublicKey: s?.mpPublicKey ?? null,
    mpAccessTokenSet: !!s?.mpAccessTokenEnc,
    mpWebhookSet: !!s?.mpWebhookSecretEnc,
    suggestedAmounts: s?.suggestedAmounts ?? [20, 50, 100, 200],
    donationMessage: s?.donationMessage ?? null,
  }
}

// ======================================================================= área logada
export const donationRoutes = new Hono<AppEnv>()
donationRoutes.use('*', requireUser, requireOrg)

donationRoutes.get('/', perm('donations.view'), async (c) => {
  const db = c.get('db')
  const { limit, offset } = pagination(c, 40)
  const conds: SQL[] = [eq(donations.orgId, c.get('orgId'))]
  const status = c.req.query('status')
  if (status) conds.push(eq(donations.status, status))
  const method = c.req.query('method')
  if (method) conds.push(eq(donations.method, method))
  const month = c.req.query('month')
  if (month && /^\d{4}-\d{2}$/.test(month)) conds.push(sql`to_char(${donations.date}, 'YYYY-MM') = ${month}`)
  const where = and(...conds)
  const [items, [agg]] = await Promise.all([
    db
      .select({ donation: donations, personName: people.name })
      .from(donations)
      .leftJoin(people, eq(people.id, donations.personId))
      .where(where)
      .orderBy(desc(donations.date))
      .limit(limit)
      .offset(offset),
    db
      .select({
        total: sql<number>`count(*)::int`,
        sum: sql<number>`coalesce(sum(${donations.amount}) filter (where ${donations.status} = 'paid'), 0)::float`,
      })
      .from(donations)
      .where(where),
  ])
  return c.json({
    items: items.map((r) => ({ ...r.donation, donorName: r.donation.donorName ?? r.personName })),
    total: agg?.total ?? 0,
    sum: agg?.sum ?? 0,
    limit,
    offset,
  })
})

donationRoutes.get('/summary', perm('donations.view'), async (c) => {
  const [s] = await rows<{ month: number; year: number; donors_month: number; pending: number }>(
    c.get('db'),
    sql`select
          coalesce(sum(amount) filter (where status = 'paid' and date_trunc('month', date) = date_trunc('month', now())), 0)::float as month,
          coalesce(sum(amount) filter (where status = 'paid' and date_trunc('year', date) = date_trunc('year', now())), 0)::float as year,
          count(distinct coalesce(person_id::text, donor_email, donor_name, id::text)) filter (where status = 'paid' and date_trunc('month', date) = date_trunc('month', now()))::int as donors_month,
          count(*) filter (where status = 'pending')::int as pending
        from donations where org_id = ${c.get('orgId')}`,
  )
  return c.json({ month: s?.month ?? 0, year: s?.year ?? 0, donorsMonth: s?.donors_month ?? 0, pending: s?.pending ?? 0 })
})

donationRoutes.post('/', perm('donations.manage'), async (c) => {
  const input = await body(c, donationSchema)
  const [d] = await c
    .get('db')
    .insert(donations)
    .values({ ...input, date: new Date(`${input.date}T12:00:00-03:00`), orgId: c.get('orgId'), createdBy: c.get('user').id })
    .returning()
  if (input.personId) {
    await c
      .get('db')
      .update(people)
      .set({ types: sql`array(select distinct unnest(${people.types} || array['donor']::text[]))` })
      .where(and(eq(people.id, input.personId), eq(people.orgId, c.get('orgId'))))
  }
  broadcast(c, ['donations'])
  return c.json(d, 201)
})

donationRoutes.patch('/:id/status', perm('donations.manage'), async (c) => {
  const { status } = await body(c, z.object({ status: z.enum(['pending', 'paid', 'failed', 'refunded']) }))
  const res = await c
    .get('db')
    .update(donations)
    .set({ status })
    .where(and(eq(donations.id, c.req.param('id')), eq(donations.orgId, c.get('orgId'))))
    .returning({ id: donations.id })
  if (!res.length) notFound('Doação')
  broadcast(c, ['donations'])
  return c.json({ ok: true })
})

donationRoutes.delete('/:id', perm('donations.manage'), async (c) => {
  const res = await c
    .get('db')
    .delete(donations)
    .where(and(eq(donations.id, c.req.param('id')), eq(donations.orgId, c.get('orgId')), sql`${donations.provider} is null`))
    .returning({ id: donations.id })
  if (!res.length) throw new HTTPException(400, { message: 'Doações de Stripe/Mercado Pago não podem ser excluídas' })
  broadcast(c, ['donations'])
  return c.json({ ok: true })
})

// ---------- configurações de pagamento ----------
donationRoutes.get('/settings', perm('donations.settings'), async (c) => {
  return c.json(toPublic(await getSettings(c.get('db'), c.get('orgId'))))
})

donationRoutes.put('/settings', perm('donations.settings'), async (c) => {
  const db = c.get('db')
  const orgId = c.get('orgId')
  const raw = await c.req.json()
  const input = paymentSettingsSchema.parse(raw)
  const clear = z.array(z.string()).default([]).parse(raw.clear)
  const key = secretKey(c.env)

  // segredos: só atualiza quando um novo valor é enviado (o front nunca recebe o valor salvo)
  const secret = async (value: string | null, field: string) =>
    clear.includes(field) ? null : value ? await encryptSecret(value, key) : undefined

  const values = {
    pixEnabled: input.pixEnabled,
    pixKey: input.pixKey,
    pixKeyType: input.pixKeyType,
    pixName: input.pixName,
    pixCity: input.pixCity,
    stripeEnabled: input.stripeEnabled,
    stripePublishableKey: input.stripePublishableKey,
    mpEnabled: input.mpEnabled,
    mpPublicKey: input.mpPublicKey,
    suggestedAmounts: input.suggestedAmounts,
    donationMessage: input.donationMessage,
  }
  const secrets = Object.fromEntries(
    Object.entries({
      stripeSecretKeyEnc: await secret(input.stripeSecretKey, 'stripeSecretKey'),
      stripeWebhookSecretEnc: await secret(input.stripeWebhookSecret, 'stripeWebhookSecret'),
      mpAccessTokenEnc: await secret(input.mpAccessToken, 'mpAccessToken'),
      mpWebhookSecretEnc: await secret(input.mpWebhookSecret, 'mpWebhookSecret'),
    }).filter(([, v]) => v !== undefined),
  )

  await db
    .insert(paymentSettings)
    .values({ orgId, ...values, ...secrets })
    .onConflictDoUpdate({ target: paymentSettings.orgId, set: { ...values, ...secrets } })
  broadcast(c, ['donations'])
  return c.json(toPublic(await getSettings(db, orgId)))
})

// ======================================================================= página pública de doação
export const publicRoutes = new Hono<AppEnv>()

async function orgBySlug(db: DB, slug: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug))
  if (!org) notFound('ONG')
  return org
}

publicRoutes.get('/donate/:slug', async (c) => {
  const db = c.get('db')
  const org = await orgBySlug(db, c.req.param('slug'))
  const s = await getSettings(db, org.id)
  return c.json({
    org: {
      name: org.name, slug: org.slug, logoKey: org.logoKey, city: org.city, state: org.state,
      instagram: org.instagram, website: org.website, whatsapp: org.whatsapp,
    },
    pix: s?.pixEnabled && s.pixKey ? { key: s.pixKey, keyType: s.pixKeyType, name: s.pixName || org.name, city: s.pixCity || org.city || 'BRASIL' } : null,
    stripe: !!(s?.stripeEnabled && s.stripeSecretKeyEnc),
    mercadopago: !!(s?.mpEnabled && s.mpAccessTokenEnc),
    suggestedAmounts: s?.suggestedAmounts ?? [20, 50, 100, 200],
    message: s?.donationMessage ?? null,
  })
})

publicRoutes.post('/donate/:slug/checkout', async (c) => {
  const db = c.get('db')
  const org = await orgBySlug(db, c.req.param('slug'))
  const s = await getSettings(db, org.id)
  const input = checkoutSchema.parse(await c.req.json())
  const origin = new URL(c.req.url).origin
  const key = secretKey(c.env)

  const [donation] = await db
    .insert(donations)
    .values({
      orgId: org.id,
      donorName: input.name,
      donorEmail: input.email,
      amount: input.amount,
      method: input.provider,
      provider: input.provider,
      status: 'pending',
    })
    .returning()
  if (!donation) throw new HTTPException(500, { message: 'Falha ao iniciar a doação' })

  const success = `${origin}/doar/${org.slug}/obrigado?d=${donation.id}`
  const cancel = `${origin}/doar/${org.slug}`

  if (input.provider === 'stripe') {
    const sk = s?.stripeEnabled ? await decryptSecret(s.stripeSecretKeyEnc, key) : null
    if (!sk) throw new HTTPException(400, { message: 'Doação por cartão indisponível' })
    const form = new URLSearchParams({
      mode: 'payment',
      submit_type: 'donate',
      success_url: success,
      cancel_url: cancel,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'brl',
      'line_items[0][price_data][unit_amount]': String(Math.round(input.amount * 100)),
      'line_items[0][price_data][product_data][name]': `Doação para ${org.name}`,
      'metadata[orgId]': org.id,
      'metadata[donationId]': donation.id,
      client_reference_id: donation.id,
    })
    if (input.email) form.set('customer_email', input.email)
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sk}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const json = (await res.json()) as { id?: string; url?: string; error?: { message: string } }
    if (!res.ok || !json.url) {
      await db.update(donations).set({ status: 'failed', notes: json.error?.message }).where(eq(donations.id, donation.id))
      throw new HTTPException(502, { message: 'Não foi possível abrir o pagamento (Stripe)' })
    }
    await db.update(donations).set({ providerRef: json.id }).where(eq(donations.id, donation.id))
    return c.json({ url: json.url })
  }

  const token = s?.mpEnabled ? await decryptSecret(s.mpAccessTokenEnc, key) : null
  if (!token) throw new HTTPException(400, { message: 'Doação por Mercado Pago indisponível' })
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': donation.id },
    body: JSON.stringify({
      items: [{ id: 'doacao', title: `Doação para ${org.name}`, quantity: 1, unit_price: input.amount, currency_id: 'BRL' }],
      payer: input.email ? { email: input.email, name: input.name ?? undefined } : undefined,
      back_urls: { success, failure: cancel, pending: success },
      auto_return: 'approved',
      external_reference: donation.id,
      notification_url: `${origin}/api/webhooks/mercadopago/${org.id}`,
    }),
  })
  const json = (await res.json()) as { id?: string; init_point?: string; message?: string }
  if (!res.ok || !json.init_point) {
    await db.update(donations).set({ status: 'failed', notes: json.message }).where(eq(donations.id, donation.id))
    throw new HTTPException(502, { message: 'Não foi possível abrir o pagamento (Mercado Pago)' })
  }
  await db.update(donations).set({ providerRef: json.id }).where(eq(donations.id, donation.id))
  return c.json({ url: json.init_point })
})

publicRoutes.get('/donation/:id', async (c) => {
  const [d] = await c
    .get('db')
    .select({ status: donations.status, amount: donations.amount, method: donations.method })
    .from(donations)
    .where(eq(donations.id, c.req.param('id')))
  if (!d) notFound('Doação')
  return c.json(d)
})

// ======================================================================= webhooks
export const webhookRoutes = new Hono<AppEnv>()

webhookRoutes.post('/stripe/:orgId', async (c) => {
  const orgId = c.req.param('orgId')
  const db = getDb(c.env.DATABASE_URL)
  const s = await getSettings(db, orgId)
  const secret = await decryptSecret(s?.stripeWebhookSecretEnc, secretKey(c.env))
  if (!secret) return c.json({ error: 'webhook não configurado' }, 400)

  const payload = await c.req.text()
  const header = c.req.header('stripe-signature') ?? ''
  const t = header.match(/t=(\d+)/)?.[1]
  const signatures = [...header.matchAll(/v1=([a-f0-9]+)/g)].map((m) => m[1])
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return c.json({ error: 'assinatura expirada' }, 400)
  const expected = await hmacSha256Hex(secret, `${t}.${payload}`)
  if (!signatures.includes(expected)) return c.json({ error: 'assinatura inválida' }, 400)

  const event = JSON.parse(payload) as { type: string; data: { object: { id: string; payment_status?: string } } }
  const session = event.data.object
  const status =
    event.type === 'checkout.session.async_payment_succeeded' ||
    (event.type === 'checkout.session.completed' && session.payment_status === 'paid')
      ? 'paid'
      : event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired'
        ? 'failed'
        : null
  if (status) {
    await db
      .update(donations)
      .set({ status })
      .where(and(eq(donations.orgId, orgId), eq(donations.provider, 'stripe'), eq(donations.providerRef, session.id)))
    broadcastOrg(c.env, c.executionCtx, orgId, ['donations'])
  }
  return c.json({ received: true })
})

webhookRoutes.post('/mercadopago/:orgId', async (c) => {
  const orgId = c.req.param('orgId')
  const db = getDb(c.env.DATABASE_URL)
  const s = await getSettings(db, orgId)
  const key = secretKey(c.env)
  const token = await decryptSecret(s?.mpAccessTokenEnc, key)
  if (!token) return c.json({ error: 'não configurado' }, 400)

  const json = (await c.req.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } }
  const type = json.type ?? c.req.query('type') ?? c.req.query('topic')
  const dataId = String(json.data?.id ?? c.req.query('data.id') ?? c.req.query('id') ?? '')
  if (type !== 'payment' || !dataId) return c.json({ ignored: true })

  // validação opcional da assinatura (x-signature) quando o segredo do webhook estiver configurado
  const whSecret = await decryptSecret(s?.mpWebhookSecretEnc, key)
  if (whSecret) {
    const sig = c.req.header('x-signature') ?? ''
    const ts = sig.match(/ts=([^,]+)/)?.[1]
    const v1 = sig.match(/v1=([a-f0-9]+)/)?.[1]
    const manifest = `id:${dataId.toLowerCase()};request-id:${c.req.header('x-request-id') ?? ''};ts:${ts};`
    if (!ts || !v1 || (await hmacSha256Hex(whSecret, manifest)) !== v1) return c.json({ error: 'assinatura inválida' }, 400)
  }

  // a fonte da verdade é a API do Mercado Pago (consulta o pagamento com o token da ONG)
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return c.json({ error: 'pagamento não encontrado' }, 404)
  const payment = (await res.json()) as { status: string; external_reference?: string; payer?: { email?: string } }
  const map: Record<string, string> = {
    approved: 'paid', rejected: 'failed', cancelled: 'failed', refunded: 'refunded', charged_back: 'refunded',
  }
  if (payment.external_reference) {
    await db
      .update(donations)
      .set({ status: map[payment.status] ?? 'pending', notes: `MP pagamento ${dataId}` })
      .where(and(eq(donations.orgId, orgId), eq(donations.id, payment.external_reference)))
    broadcastOrg(c.env, c.executionCtx, orgId, ['donations'])
  }
  return c.json({ received: true })
})
