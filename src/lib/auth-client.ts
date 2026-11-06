import { createAuthClient } from 'better-auth/vue'

/** Cliente do Better Auth (rotas em /api/auth no próprio Worker) */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
})
