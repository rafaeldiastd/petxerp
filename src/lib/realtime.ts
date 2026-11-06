import { ref } from 'vue'
import type { QueryClient } from '@tanstack/vue-query'

/**
 * Cliente realtime: WebSocket com o Durable Object da ONG. Cada mensagem traz os
 * "tópicos" alterados e o front invalida as queries correspondentes (TanStack Query).
 * Abstração única — pode ser trocada pelo Neon Realtime quando sair do beta.
 */
export const realtimeStatus = ref<'off' | 'connecting' | 'live'>('off')
export const lastEvent = ref<{ topics: string[]; byName?: string; at: number } | null>(null)

let ws: WebSocket | null = null
let orgId: string | null = null
let client: QueryClient | null = null
let retries = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
let pingTimer: ReturnType<typeof setInterval> | undefined

function open() {
  if (!orgId) return
  realtimeStatus.value = 'connecting'
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const socket = new WebSocket(`${proto}://${location.host}/api/realtime?org=${encodeURIComponent(orgId)}`)
  ws = socket

  socket.onopen = () => {
    retries = 0
    realtimeStatus.value = 'live'
    clearInterval(pingTimer)
    pingTimer = setInterval(() => socket.readyState === WebSocket.OPEN && socket.send('ping'), 25_000)
  }
  socket.onmessage = (ev) => {
    if (ev.data === 'pong') return
    try {
      const msg = JSON.parse(ev.data) as { topics: string[]; byName?: string; at: number }
      lastEvent.value = msg
      for (const topic of msg.topics) client?.invalidateQueries({ queryKey: [topic] })
    } catch {
      /* mensagem desconhecida */
    }
  }
  socket.onclose = () => {
    clearInterval(pingTimer)
    if (ws !== socket) return
    ws = null
    realtimeStatus.value = 'off'
    if (!orgId) return
    const delay = Math.min(30_000, 1000 * 2 ** retries++)
    retryTimer = setTimeout(open, delay)
  }
}

export function connectRealtime(id: string, queryClient: QueryClient) {
  if (orgId === id && ws) return
  disconnectRealtime()
  orgId = id
  client = queryClient
  open()
}

export function disconnectRealtime() {
  orgId = null
  clearTimeout(retryTimer)
  clearInterval(pingTimer)
  const s = ws
  ws = null
  s?.close()
  realtimeStatus.value = 'off'
}

// Reconecta ao voltar para a aba/rede (celulares suspendem sockets em segundo plano)
if (typeof window !== 'undefined') {
  const revive = () => {
    if (orgId && !ws && document.visibilityState === 'visible') {
      clearTimeout(retryTimer)
      retries = 0
      open()
      client?.invalidateQueries()
    }
  }
  document.addEventListener('visibilitychange', revive)
  window.addEventListener('online', revive)
}
