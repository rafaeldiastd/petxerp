import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

const state = ref<(ConfirmOptions & { open: boolean; resolve?: (v: boolean) => void }) | null>(null)

/** Diálogo de confirmação global: `if (await confirm({...})) ...` */
export function useConfirm() {
  function confirm(opts: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      state.value = { ...opts, open: true, resolve }
    })
  }
  return { confirm }
}

export function useConfirmState() {
  function answer(v: boolean) {
    state.value?.resolve?.(v)
    if (state.value) state.value = { ...state.value, open: false, resolve: undefined }
  }
  return { state, answer }
}
