import { DurableObject } from 'cloudflare:workers'
import type { Ctx } from './lib/context'

/**
 * Hub de realtime: um Durable Object por ONG mantém os WebSockets dos membros conectados
 * (Hibernation API — não cobra duração enquanto ocioso). Mutações na API chamam
 * `broadcast()` e os clientes invalidam o cache do TanStack Query dos tópicos recebidos.
 */
export class RealtimeHub extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(request: Request) {
    const url = new URL(request.url)

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.text()
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(message)
        } catch {
          /* socket fechado */
        }
      }
      return new Response('ok')
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Esperado WebSocket', { status: 426 })
    }
    const userId = url.searchParams.get('uid') ?? 'anon'
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server, [userId])
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage() {
    /* clientes só escutam; ping/pong é respondido automaticamente */
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    try {
      ws.close(code, reason)
    } catch {
      /* já fechado */
    }
  }
}

export type Topic =
  | 'animals'
  | 'adoptions'
  | 'people'
  | 'stock'
  | 'expenses'
  | 'partners'
  | 'donations'
  | 'team'
  | 'org'
  | 'dashboard'

/** Notifica todos os membros conectados da ONG (não bloqueia a resposta) */
export function broadcast(c: Ctx, topics: Topic[], extra: Record<string, unknown> = {}) {
  const orgId = c.get('orgId')
  const stub = c.env.REALTIME.get(c.env.REALTIME.idFromName(orgId))
  const payload = JSON.stringify({
    topics: [...new Set<Topic>([...topics, 'dashboard'])],
    by: c.get('user').id,
    byName: c.get('user').name,
    at: Date.now(),
    ...extra,
  })
  c.executionCtx.waitUntil(
    stub.fetch('https://realtime/broadcast', { method: 'POST', body: payload }).then(
      () => undefined,
      (e) => console.error('realtime broadcast falhou', e),
    ),
  )
}

/** Variante para webhooks (sem usuário logado) */
export function broadcastOrg(env: Env, ctx: { waitUntil(p: Promise<unknown>): void }, orgId: string, topics: Topic[]) {
  const stub = env.REALTIME.get(env.REALTIME.idFromName(orgId))
  ctx.waitUntil(
    stub
      .fetch('https://realtime/broadcast', {
        method: 'POST',
        body: JSON.stringify({ topics: [...topics, 'dashboard'], by: 'system', at: Date.now() }),
      })
      .then(() => undefined, () => undefined),
  )
}
