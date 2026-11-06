// Cliente HTTP da API (/api no mesmo domínio). Envia a ONG ativa no header X-Org-Id.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string>,
    public data?: unknown,
  ) {
    super(message)
  }
}

let currentOrg: string | null = null
let onUnauthorized: (() => void) | null = null

export function setApiOrg(id: string | null) {
  currentOrg = id
}
export function getApiOrg() {
  return currentOrg
}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

type Params = Record<string, unknown> | undefined

function buildUrl(path: string, params?: Params) {
  const url = new URL(`/api${path}`, window.location.origin)
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue
    url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v))
  }
  return url
}

async function request<T>(method: string, path: string, body?: unknown, params?: Params): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (currentOrg) headers['X-Org-Id'] = currentOrg
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, params), { method, headers, body: payload, credentials: 'include' })
  } catch {
    throw new ApiError('Sem conexão com o servidor. Verifique sua internet.', 0)
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (res.status === 401 && !path.startsWith('/public')) onUnauthorized?.()
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Erro ${res.status}`, res.status, data?.fields, data)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: (file: File | Blob, folder: string, name?: string) => {
    const fd = new FormData()
    fd.append('file', file, name ?? (file instanceof File ? file.name : 'arquivo'))
    fd.append('folder', folder)
    return request<{ key: string; name: string; type: string; size: number }>('POST', '/uploads', fd)
  },
}

export function fileUrl(key: string | null | undefined) {
  return key ? `/api/files/${key}` : null
}
