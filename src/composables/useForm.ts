import { nextTick, reactive, ref } from 'vue'
import type { ZodType, z } from 'zod'
import { fieldErrors } from '@shared/schemas'
import { ApiError } from '@/lib/api'

/**
 * Estado de formulário simples: valores reativos + validação Zod (o mesmo schema do Worker).
 * Campos de texto usam '' (o schema converte para null).
 */
export function useForm<S extends ZodType>(schema: S, initial: () => Record<string, any>) {
  const values = reactive<Record<string, any>>(initial())
  const errors = ref<Record<string, string>>({})

  function focusFirstError() {
    nextTick(() => {
      const el = document.querySelector('[data-error="true"]')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ;(el?.querySelector('input,textarea,button') as HTMLElement | null)?.focus({ preventScroll: true })
    })
  }

  function validate(): z.output<S> | null {
    const res = schema.safeParse(values)
    if (!res.success) {
      errors.value = fieldErrors(res.error)
      focusFirstError()
      return null
    }
    errors.value = {}
    return res.data
  }

  function setServerErrors(e: unknown) {
    if (e instanceof ApiError && e.fields) {
      errors.value = e.fields
      focusFirstError()
    }
  }

  function reset(next?: Record<string, any>) {
    for (const k of Object.keys(values)) delete values[k]
    Object.assign(values, next ?? initial())
    errors.value = {}
  }

  return { values, errors, validate, setServerErrors, reset }
}
