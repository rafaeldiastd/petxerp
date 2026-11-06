import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getAuth } from '../auth'
import { requireOrg, requireUser, type AppEnv } from '../lib/context'
import { memberships } from '../db/schema'

/**
 * Arquivos no R2. Chave: {orgId}/{public|private}/{pasta}/{uuid}.{ext}
 * - public: fotos de animais e logo (podem aparecer em páginas públicas)
 * - private: documentos de adotantes, notas fiscais — exigem membro da ONG
 */
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}
const FOLDERS = ['animals', 'logo', 'documents', 'receipts', 'adoptions'] as const

export const uploadRoutes = new Hono<AppEnv>()
uploadRoutes.use('*', requireUser, requireOrg)

uploadRoutes.post('/', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HTTPException(400, { message: 'Arquivo não enviado' })
  if (file.size > MAX_BYTES) throw new HTTPException(413, { message: 'Arquivo maior que 10 MB' })
  const ext = ALLOWED[file.type]
  if (!ext) throw new HTTPException(415, { message: 'Formato não suportado (use imagem ou PDF)' })

  const folder = String(form.get('folder') ?? 'documents')
  if (!(FOLDERS as readonly string[]).includes(folder)) throw new HTTPException(400, { message: 'Pasta inválida' })
  const visibility = folder === 'animals' || folder === 'logo' ? 'public' : 'private'

  const key = `${c.get('orgId')}/${visibility}/${folder}/${crypto.randomUUID()}.${ext}`
  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { name: encodeURIComponent(file.name).slice(0, 200), by: c.get('user').id },
  })
  return c.json({ key, name: file.name, type: file.type, size: file.size }, 201)
})

uploadRoutes.delete('/:key{.+}', async (c) => {
  const key = c.req.param('key')
  if (!key.startsWith(`${c.get('orgId')}/`)) throw new HTTPException(403, { message: 'Sem acesso' })
  await c.env.BUCKET.delete(key)
  return c.json({ ok: true })
})

export const fileRoutes = new Hono<AppEnv>()

fileRoutes.get('/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const [orgId, visibility] = key.split('/')
  if (!orgId || (visibility !== 'public' && visibility !== 'private')) return c.notFound()

  if (visibility === 'private') {
    const session = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers })
    if (!session?.user) throw new HTTPException(401, { message: 'Não autenticado' })
    const [m] = await c
      .get('db')
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, session.user.id), eq(memberships.active, true)))
    if (!m) throw new HTTPException(403, { message: 'Sem acesso' })
  }

  const obj = await c.env.BUCKET.get(key, { onlyIf: c.req.raw.headers })
  if (!obj) return c.notFound()
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', visibility === 'public' ? 'public, max-age=31536000, immutable' : 'private, max-age=3600')
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers })
  return new Response(obj.body, { headers })
})
