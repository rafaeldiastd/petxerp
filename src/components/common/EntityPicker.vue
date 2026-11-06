<script setup lang="ts" generic="T extends { id: string }">
import { ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { ChevronsUpDown, LoaderCircle, Plus, Search, X } from '@lucide/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Seletor com busca remota (pessoas, animais...). Mostra o item escolhido no gatilho
 * e permite criar um novo registro pelo slot/evento `create`.
 */
const props = defineProps<{
  selected: T | null
  search: (q: string) => Promise<T[]>
  placeholder?: string
  createLabel?: string
  invalid?: boolean
  disabled?: boolean
  clearable?: boolean
  isDisabled?: (item: T) => string | false
}>()
const emit = defineEmits<{ select: [item: T | null]; create: [query: string] }>()

const open = ref(false)
const q = ref('')
const debounced = refDebounced(q, 200)
const items = ref<T[]>([]) as { value: T[] }
const loading = ref(false)
let seq = 0
// cache curto por termo: reabrir o seletor ou apagar letras mostra o resultado na hora
const cache = new Map<string, { at: number; items: T[] }>()

async function load() {
  const term = debounced.value.trim()
  const hit = cache.get(term)
  if (hit) items.value = hit.items
  if (hit && Date.now() - hit.at < 30_000) return
  const id = ++seq
  loading.value = true
  try {
    const res = await props.search(term)
    cache.set(term, { at: Date.now(), items: res })
    if (id === seq) items.value = res
  } finally {
    if (id === seq) loading.value = false
  }
}

watch(debounced, () => open.value && load())
watch(open, (v) => {
  if (v) load()
  else q.value = ''
})

function choose(item: T) {
  if (props.isDisabled?.(item)) return
  emit('select', item)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child :disabled="disabled">
      <button
        type="button"
        :aria-invalid="invalid || undefined"
        :class="
          cn(
            'flex min-h-10 w-full items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive',
          )
        "
      >
        <span class="min-w-0 flex-1">
          <slot v-if="selected" name="selected" :item="selected" />
          <span v-else class="text-muted-foreground">{{ placeholder ?? 'Selecionar...' }}</span>
        </span>
        <span
          v-if="selected && clearable"
          role="button"
          class="rounded p-0.5 text-muted-foreground hover:bg-muted"
          aria-label="Limpar"
          @click.stop="emit('select', null)"
        >
          <X class="size-4" />
        </span>
        <ChevronsUpDown class="size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-(--reka-popover-trigger-width) min-w-72 p-0" align="start">
      <div class="flex items-center gap-2 border-b px-3">
        <Search class="size-4 text-muted-foreground" />
        <input v-model="q" autofocus class="h-10 flex-1 bg-transparent text-sm outline-none" placeholder="Digite para buscar..." />
        <LoaderCircle v-if="loading" class="size-4 animate-spin text-muted-foreground" />
      </div>
      <div class="max-h-72 overflow-y-auto p-1">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :class="
            cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent',
              selected?.id === item.id && 'bg-accent',
              isDisabled?.(item) && 'cursor-not-allowed opacity-60 hover:bg-transparent',
            )
          "
          @click="choose(item)"
        >
          <slot name="item" :item="item" :disabled-reason="isDisabled?.(item)" />
        </button>
        <p v-if="!loading && !items.length" class="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado</p>
      </div>
      <button
        v-if="createLabel"
        type="button"
        class="flex w-full items-center gap-2 border-t px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
        @click="open = false; emit('create', q)"
      >
        <Plus class="size-4" /> {{ createLabel }}
      </button>
    </PopoverContent>
  </Popover>
</template>
