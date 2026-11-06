import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import { ZodError } from 'zod'
import { getAuth } from './auth'
import { requireOrg, requireUser, withDb, type AppEnv } from './lib/context'
import { fieldErrors } from '../shared/schemas'
import { meRoutes } from './routes/me'
import { animalRoutes } from './routes/animals'
import { peopleRoutes } from './routes/people'
import { adoptionRoutes } from './routes/adoptions'
import { stockRoutes } from './routes/stock'
import { financeRoutes } from './routes/finance'
import { donationRoutes, publicRoutes, webhookRoutes } from './routes/donations'
import { teamRoutes } from './routes/team'
import { orgRoutes } from './routes/org'
import { fileRoutes, uploadRoutes } from './routes/files'
import { dashboardRoutes } from './routes/dashboard'

export { RealtimeHub } from './realtime'

const app = new Hono<AppEnv>().basePath('/api')

// a resposta 101 do WebSocket tem headers imutáveis — não passa pelo secureHeaders
const security = secureHeaders({ crossOriginResourcePolicy: 'same-site' })
app.use('*', (c, next) => (c.req.header('upgrade')?.toLowerCase() === 'websocket' ? next() : security(c, next)))
app.use('*', withDb)

app.get('/health', (c) => c.json({ ok: true, at: new Date().toISOString() }))

// Better Auth: /api/auth/sign-in/email, /sign-up/email, /sign-out, /get-session ...
app.on(['GET', 'POST'], '/auth/*', (c) => getAuth(c.env).handler(c.req.raw))

// Realtime: WebSocket por ONG (Durable Object)
app.get('/realtime', requireUser, requireOrg, async (c) => {
  if (c.req.header('upgrade') !== 'websocket') return c.text('Esperado WebSocket', 426)
  const stub = c.env.REALTIME.get(c.env.REALTIME.idFromName(c.get('orgId')))
  const url = new URL(c.req.url)
  url.pathname = '/ws'
  url.searchParams.set('uid', c.get('user').id)
  return stub.fetch(new Request(url.toString(), c.req.raw))
})

app.route('/', meRoutes)
app.route('/dashboard', dashboardRoutes)
app.route('/animals', animalRoutes)
app.route('/people', peopleRoutes)
app.route('/adoptions', adoptionRoutes)
app.route('/stock', stockRoutes)
app.route('/finance', financeRoutes)
app.route('/donations', donationRoutes)
app.route('/team', teamRoutes)
app.route('/org', orgRoutes)
app.route('/uploads', uploadRoutes)
app.route('/files', fileRoutes)
app.route('/public', publicRoutes)
app.route('/webhooks', webhookRoutes)

app.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404))

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: 'Verifique os campos destacados', fields: fieldErrors(err) }, 422)
  }
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  // erros do Better Auth chamados via auth.api.*
  const e = err as { status?: number | string; body?: { message?: string }; statusCode?: number }
  if (e?.body?.message && typeof e.statusCode === 'number') {
    return c.json({ error: e.body.message }, e.statusCode as 400)
  }
  console.error(err)
  return c.json({ error: 'Erro interno. Tente novamente.' }, 500)
})

export default app
