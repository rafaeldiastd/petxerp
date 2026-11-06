import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { api, ApiError } from '@/lib/api'

/**
 * GET tipado com cache. O primeiro item da chave é o "tópico" — o realtime invalida por ele.
 * Ex.: useApiQuery(['animals', id], () => `/animals/${id}`)
 */
export function useApiQuery<T>(
  key: MaybeRefOrGetter<unknown[]>,
  path: MaybeRefOrGetter<string>,
  params?: MaybeRefOrGetter<Record<string, unknown> | undefined>,
  options: { enabled?: MaybeRefOrGetter<boolean>; placeholder?: boolean } = {},
) {
  return useQuery({
    queryKey: computed(() => [...toValue(key), toValue(params) ?? {}]),
    queryFn: () => api.get<T>(toValue(path), toValue(params)),
    enabled: computed(() => (options.enabled === undefined ? true : toValue(options.enabled))),
    // mantém os dados anteriores enquanto troca de filtro (evita "piscar" a lista)
    placeholderData: (options.placeholder ? keepPreviousData : undefined) as never,
  })
}

/** Mutação com toast de sucesso/erro e invalidação dos tópicos afetados */
export function useApiMutation<TVars, TRes = unknown>(
  fn: (vars: TVars) => Promise<TRes>,
  opts: {
    invalidate?: string[]
    success?: string | ((res: TRes, vars: TVars) => string)
    onSuccess?: (res: TRes, vars: TVars) => void
    onError?: (err: ApiError) => void
    silentError?: boolean
  } = {},
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, vars) => {
      for (const k of [...(opts.invalidate ?? []), 'dashboard']) qc.invalidateQueries({ queryKey: [k] })
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(res, vars) : opts.success)
      opts.onSuccess?.(res, vars)
    },
    onError: (err) => {
      const e = err instanceof ApiError ? err : new ApiError(String(err), 0)
      if (!opts.silentError) toast.error(e.message)
      opts.onError?.(e)
    },
  })
}
