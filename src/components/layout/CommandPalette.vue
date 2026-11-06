<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced, useEventListener } from '@vueuse/core'
import { CornerDownLeft, LoaderCircle, Search, UserRound } from '@lucide/vue'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import { api } from '@/lib/api'
import { animalCode } from '@/lib/format'
import { NAV } from '@/lib/nav'
import { QUICK_ACTIONS } from '@/lib/quick-actions'
import { useSession } from '@/stores/session'
import { ANIMAL_STATUS } from '@shared/constants'

const open = defineModel<boolean>('open', { default: false })
const router = useRouter()
const session = useSession()

// Ctrl+Shift+K (⌘+Shift+K no Mac) — Ctrl+K sozinho abre a busca do próprio navegador
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key.toLowerCase() === 'k' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    open.value = true
  }
})

const q = ref('')
const debounced = refDebounced(q, 200)
const loading = ref(false)
const results = ref<{ animals: any[]; people: any[] }>({ animals: [], people: [] })
const active = ref(0)

watch(debounced, async (v) => {
  if (v.trim().length < 2) {
    results.value = { animals: [], people: [] }
    return
  }
  loading.value = true
  try {
    results.value = await api.get('/dashboard/search', { q: v })
  } finally {
    loading.value = false
  }
})
watch(open, (v) => {
  if (!v) q.value = ''
  active.value = 0
})

type Entry = { key: string; group: string; label: string; sub?: string; run: () => void; animal?: any; person?: boolean; icon?: any }

const entries = computed<Entry[]>(() => {
  const term = q.value.trim().toLowerCase()
  const out: Entry[] = []
  for (const a of results.value.animals) {
    out.push({ key: `a${a.id}`, group: 'Animais', label: a.name, sub: `${animalCode(a.code)} · ${ANIMAL_STATUS[a.status as keyof typeof ANIMAL_STATUS]}`, animal: a, run: () => router.push({ name: 'animal', params: { id: a.id } }) })
  }
  for (const p of results.value.people) {
    out.push({ key: `p${p.id}`, group: 'Pessoas', label: p.name, sub: p.phone ?? '', person: true, run: () => router.push({ name: 'person', params: { id: p.id } }) })
  }
  for (const a of QUICK_ACTIONS.filter((x) => session.can(...x.perm))) {
    if (!term || a.title.toLowerCase().includes(term)) out.push({ key: `q${a.title}`, group: 'Ações', label: a.title, sub: a.description, icon: a.icon, run: () => router.push(a.to) })
  }
  for (const g of NAV) {
    for (const i of g.items) {
      for (const leaf of i.children ?? [i]) {
        if ((leaf.perm ?? i.perm) && !session.can(...(leaf.perm ?? i.perm)!)) continue
        if (!term || leaf.title.toLowerCase().includes(term)) out.push({ key: `n${leaf.title}`, group: 'Ir para', label: leaf.title, icon: i.icon, run: () => router.push(leaf.to!) })
      }
    }
  }
  return out
})

const grouped = computed(() => {
  const map = new Map<string, (Entry & { index: number })[]>()
  entries.value.forEach((e, index) => {
    if (!map.has(e.group)) map.set(e.group, [])
    map.get(e.group)!.push({ ...e, index })
  })
  return [...map.entries()]
})

function run(e?: Entry) {
  if (!e) return
  open.value = false
  e.run()
}
function onKey(ev: KeyboardEvent) {
  if (ev.key === 'ArrowDown') active.value = Math.min(active.value + 1, entries.value.length - 1)
  else if (ev.key === 'ArrowUp') active.value = Math.max(active.value - 1, 0)
  else if (ev.key === 'Enter') run(entries.value[active.value])
  else return
  ev.preventDefault()
}
watch(entries, () => (active.value = 0))
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" :show-close-button="false">
      <DialogTitle class="sr-only">Buscar</DialogTitle>
      <div class="flex items-center gap-2 border-b px-4">
        <Search class="size-4 text-muted-foreground" />
        <input
          v-model="q"
          autofocus
          class="h-12 flex-1 bg-transparent text-sm outline-none"
          placeholder="Buscar animais, pessoas ou ações..."
          @keydown="onKey"
        />
        <LoaderCircle v-if="loading" class="size-4 animate-spin text-muted-foreground" />
      </div>
      <div class="max-h-[60vh] overflow-y-auto p-2">
        <div v-for="[group, items] in grouped" :key="group" class="mb-1">
          <p class="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{{ group }}</p>
          <button
            v-for="e in items"
            :key="e.key"
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm"
            :class="active === e.index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
            @mouseenter="active = e.index"
            @click="run(e)"
          >
            <AnimalAvatar v-if="e.animal" :photo-key="e.animal.photoKey" :species="e.animal.species" size="sm" />
            <span v-else class="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground">
              <UserRound v-if="e.person" class="size-4" />
              <component :is="e.icon" v-else class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ e.label }}</span>
              <span v-if="e.sub" class="block truncate text-xs text-muted-foreground">{{ e.sub }}</span>
            </span>
            <CornerDownLeft v-if="active === e.index" class="size-3.5 text-muted-foreground" />
          </button>
        </div>
        <p v-if="!entries.length" class="py-10 text-center text-sm text-muted-foreground">Nada encontrado para “{{ q }}”</p>
      </div>
    </DialogContent>
  </Dialog>
</template>
