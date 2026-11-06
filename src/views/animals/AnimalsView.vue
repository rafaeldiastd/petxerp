<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { useInfiniteQuery, keepPreviousData } from '@tanstack/vue-query'
import { Cat, Dog, LoaderCircle, PawPrint, Plus, SlidersHorizontal, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import SelectField from '@/components/common/SelectField.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AnimalCard from '@/components/animals/AnimalCard.vue'
import DeathDialog from '@/components/animals/DeathDialog.vue'
import { useApiMutation } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { useSession } from '@/stores/session'
import { AGE_GROUP, ANIMAL_STATUS, SEX, SIZE } from '@shared/constants'
import type { Animal, Paginated } from '@shared/types'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { confirm } = useConfirm()

/** Status marcado por padrão ao abrir a lista */
const DEFAULT_STATUS = ['sheltered']

// ---------- filtros (sincronizados com a URL) ----------
const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '')
const list = (k: string) => (q(k) ? q(k).split(',') : [])

const filters = reactive({
  q: q('q'),
  // sem parâmetro → padrão; "all" → todos os status
  status: q('status') === 'all' ? [] : q('status') ? list('status') : [...DEFAULT_STATUS],
  species: q('species'),
  sex: list('sex'),
  ageGroup: list('ageGroup'),
  size: list('size'),
  castrated: q('castrated'),
  vaccinated: q('vaccinated'),
  special: q('special') === 'true',
  bonded: q('bonded') === 'true',
  sort: q('sort') || 'recent',
})
const search = refDebounced(computed(() => filters.q), 200)

const isDefaultStatus = computed(
  () => filters.status.length === DEFAULT_STATUS.length && DEFAULT_STATUS.every((s) => filters.status.includes(s)),
)

const params = computed(() => ({
  q: search.value,
  status: filters.status.length ? filters.status.join(',') : 'all',
  species: filters.species,
  sex: filters.sex,
  ageGroup: filters.ageGroup,
  size: filters.size,
  castrated: filters.castrated,
  vaccinated: filters.vaccinated,
  special: filters.special ? 'true' : '',
  bonded: filters.bonded ? 'true' : '',
  sort: filters.sort === 'recent' ? '' : filters.sort,
}))

watch(params, (p) => {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(p)) {
    const s = Array.isArray(v) ? v.join(',') : String(v ?? '')
    if (s) query[k] = s
  }
  if (isDefaultStatus.value) delete query.status
  router.replace({ query })
})

/** Filtros visíveis como chips removíveis */
const chips = computed(() => {
  const out: { key: string; label: string; clear: () => void }[] = []
  for (const s of filters.status) {
    out.push({ key: `st-${s}`, label: ANIMAL_STATUS[s as keyof typeof ANIMAL_STATUS], clear: () => (filters.status = filters.status.filter((x) => x !== s)) })
  }
  if (filters.species) out.push({ key: 'sp', label: filters.species === 'dog' ? 'Cães' : filters.species === 'cat' ? 'Gatos' : 'Outros', clear: () => (filters.species = '') })
  for (const s of filters.sex) out.push({ key: `sx-${s}`, label: SEX[s as keyof typeof SEX], clear: () => (filters.sex = filters.sex.filter((x) => x !== s)) })
  for (const s of filters.ageGroup) out.push({ key: `ag-${s}`, label: AGE_GROUP[s as keyof typeof AGE_GROUP], clear: () => (filters.ageGroup = filters.ageGroup.filter((x) => x !== s)) })
  for (const s of filters.size) out.push({ key: `sz-${s}`, label: `Porte ${SIZE[s as keyof typeof SIZE].toLowerCase()}`, clear: () => (filters.size = filters.size.filter((x) => x !== s)) })
  if (filters.castrated) out.push({ key: 'ca', label: filters.castrated === 'true' ? 'Castrados' : 'Não castrados', clear: () => (filters.castrated = '') })
  if (filters.vaccinated) out.push({ key: 'va', label: filters.vaccinated === 'true' ? 'Vacinados' : 'Não vacinados', clear: () => (filters.vaccinated = '') })
  if (filters.special) out.push({ key: 'spc', label: 'Cuidados especiais', clear: () => (filters.special = false) })
  if (filters.bonded) out.push({ key: 'bo', label: 'Adoção conjunta', clear: () => (filters.bonded = false) })
  return out
})
const filterCount = computed(() => chips.value.length)

function clearFilters() {
  Object.assign(filters, { status: [], species: '', sex: [], ageGroup: [], size: [], castrated: '', vaccinated: '', special: false, bonded: false })
}
function resetFilters() {
  clearFilters()
  filters.status = [...DEFAULT_STATUS]
}

// ---------- dados ----------
type Page = Paginated<Animal> & { counts: Record<string, number> }
const query = useInfiniteQuery({
  queryKey: computed(() => ['animals', 'list', params.value]),
  queryFn: ({ pageParam }) => api.get<Page>('/animals', { ...params.value, offset: pageParam, limit: 24 }),
  initialPageParam: 0,
  getNextPageParam: (last) => (last.offset + last.limit < last.total ? last.offset + last.limit : undefined),
  placeholderData: keepPreviousData,
})

const animals = computed(() => query.data.value?.pages.flatMap((p) => p.items) ?? [])
const total = computed(() => query.data.value?.pages[0]?.total ?? 0)
const counts = ref<Record<string, number>>({})
watch(
  () => query.data.value?.pages[0]?.counts,
  (c) => c && (counts.value = c),
)
const statusOptions = computed(() =>
  Object.entries(ANIMAL_STATUS).map(([value, label]) => ({ value, label: counts.value[value] ? `${label} · ${counts.value[value]}` : label })),
)

// ---------- ações ----------
const deathTarget = ref<Animal | null>(null)
const deathOpen = ref(false)
function openDeath(a: Animal) {
  deathTarget.value = a
  deathOpen.value = true
}

const remove = useApiMutation((id: string) => api.del(`/animals/${id}`), { invalidate: ['animals'], success: 'Registro excluído' })
async function askRemove(a: Animal) {
  const ok = await confirm({
    title: `Excluir ${a.name}?`,
    description: 'Use apenas para cadastros feitos por engano. Para saídas, use "Declarar adoção" ou "Declarar óbito".',
    confirmText: 'Excluir',
    destructive: true,
  })
  if (ok) remove.mutate(a.id)
}

const speciesOptions = [
  { value: '', label: 'Todos', icon: PawPrint },
  { value: 'dog', label: 'Cães', icon: Dog },
  { value: 'cat', label: 'Gatos', icon: Cat },
]
const sortOptions = { recent: 'Entrada mais recente', oldest: 'Há mais tempo na ONG', name: 'Nome (A–Z)', code: 'Código' }
const triOptions = { '': 'Tanto faz', true: 'Sim', false: 'Não' }
const filtersOpen = ref(false)
</script>

<template>
  <div>
    <PageHeader title="Animais">
      <template #description>
        <span v-if="query.isLoading.value">Carregando...</span>
        <span v-else>{{ total }} {{ total === 1 ? 'animal' : 'animais' }}</span>
      </template>
      <template #actions>
        <Button v-if="session.can('animals.create')" as-child>
          <RouterLink :to="{ name: 'animal-new' }"><Plus /> Novo animal</RouterLink>
        </Button>
      </template>
    </PageHeader>

    <!-- Busca e filtros -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <SearchInput v-model="filters.q" placeholder="Nome, raça, microchip..." class="min-w-0 flex-1 basis-56" />
      <ChipGroup v-model="filters.species" :options="speciesOptions" variant="segmented" class="hidden sm:grid" />
      <Button variant="outline" class="h-10 rounded-xl" @click="filtersOpen = true">
        <SlidersHorizontal /> Filtros
        <span v-if="filterCount" class="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] text-white">{{ filterCount }}</span>
      </Button>
    </div>

    <div v-if="chips.length || !isDefaultStatus" class="mb-4 flex flex-wrap items-center gap-1.5">
      <button
        v-for="c in chips"
        :key="c.key"
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
        @click="c.clear"
      >
        {{ c.label }} <X class="size-3" />
      </button>
      <span v-if="!filters.status.length" class="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Todos os status</span>
      <button v-if="!isDefaultStatus || chips.length > 1" type="button" class="ml-1 text-xs font-medium text-muted-foreground hover:text-foreground" @click="resetFilters">
        Restaurar padrão
      </button>
    </div>

    <!-- Grade de cards -->
    <div v-if="query.isLoading.value" class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <div v-for="i in 8" :key="i" class="overflow-hidden rounded-2xl border bg-card">
        <div class="aspect-[4/3] animate-pulse bg-muted" />
        <div class="space-y-2 p-3.5">
          <div class="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!animals.length"
      title="Nenhum animal encontrado"
      :description="filters.q || filterCount ? 'Ajuste a busca ou os filtros.' : 'Cadastre o primeiro animal pelo boletim de entrada.'"
    >
      <Button v-if="filters.q || filterCount" variant="outline" @click="filters.q = ''; clearFilters()">Ver todos</Button>
      <Button v-if="session.can('animals.create')" as-child><RouterLink :to="{ name: 'animal-new' }"><Plus /> Novo animal</RouterLink></Button>
    </EmptyState>

    <div v-else class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" :class="query.isPlaceholderData.value && 'opacity-60 transition'">
      <AnimalCard v-for="a in animals" :key="a.id" :animal="a" @death="openDeath" @remove="askRemove" />
    </div>

    <div v-if="query.hasNextPage.value" class="mt-6 flex justify-center">
      <Button variant="outline" :disabled="query.isFetchingNextPage.value" @click="query.fetchNextPage()">
        <LoaderCircle v-if="query.isFetchingNextPage.value" class="animate-spin" /> Carregar mais
      </Button>
    </div>

    <!-- Painel de filtros -->
    <Sheet v-model:open="filtersOpen">
      <SheetContent class="w-full gap-0 sm:max-w-md">
        <SheetHeader class="border-b">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>{{ total }} {{ total === 1 ? 'animal' : 'animais' }} com os filtros atuais</SheetDescription>
        </SheetHeader>
        <div class="grid flex-1 content-start gap-6 overflow-y-auto p-4">
          <div class="grid gap-2">
            <p class="text-sm font-medium">Situação</p>
            <ChipGroup v-model="filters.status" :options="statusOptions" multiple size="sm" />
          </div>
          <div class="grid gap-2 sm:hidden">
            <p class="text-sm font-medium">Espécie</p>
            <ChipGroup v-model="filters.species" :options="speciesOptions" variant="segmented" />
          </div>
          <div class="grid gap-2">
            <p class="text-sm font-medium">Sexo</p>
            <ChipGroup v-model="filters.sex" :options="SEX" multiple size="sm" />
          </div>
          <div class="grid gap-2">
            <p class="text-sm font-medium">Idade</p>
            <ChipGroup v-model="filters.ageGroup" :options="AGE_GROUP" multiple size="sm" />
          </div>
          <div class="grid gap-2">
            <p class="text-sm font-medium">Porte</p>
            <ChipGroup v-model="filters.size" :options="SIZE" multiple size="sm" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <p class="text-sm font-medium">Castrado</p>
              <ChipGroup v-model="filters.castrated" :options="triOptions" size="sm" />
            </div>
            <div class="grid gap-2">
              <p class="text-sm font-medium">Vacinado</p>
              <ChipGroup v-model="filters.vaccinated" :options="triOptions" size="sm" />
            </div>
          </div>
          <label class="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
            Cuidados especiais <Switch v-model="filters.special" />
          </label>
          <label class="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">
            Adoção conjunta <Switch v-model="filters.bonded" />
          </label>
          <div class="grid gap-2">
            <p class="text-sm font-medium">Ordenar por</p>
            <SelectField v-model="filters.sort" :options="sortOptions" />
          </div>
        </div>
        <SheetFooter class="flex-row border-t">
          <Button variant="outline" class="flex-1" @click="resetFilters">Restaurar padrão</Button>
          <Button class="flex-1" @click="filtersOpen = false">Ver {{ total }}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <DeathDialog v-model:open="deathOpen" :animal="deathTarget" />
  </div>
</template>
