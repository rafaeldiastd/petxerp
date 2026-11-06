<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { Ellipsis, MessageCircle, Pencil, ShieldAlert, Trash2, UserPlus, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import PillTabs from '@/components/common/PillTabs.vue'
import ResponsiveTable from '@/components/common/ResponsiveTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pill from '@/components/common/Pill.vue'
import PersonFormDialog from '@/components/people/PersonFormDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { initials, maskCpf, whatsappLink } from '@/lib/format'
import { personTypeTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import { PERSON_TYPES } from '@shared/constants'
import type { Paginated, Person } from '@shared/types'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { confirm } = useConfirm()

const search = ref('')
const q = refDebounced(search, 200)
const type = ref('')
const limit = ref(30)
const params = computed(() => ({ q: q.value, type: type.value === 'restricted' ? '' : type.value, restricted: type.value === 'restricted' ? 'true' : '', limit: limit.value }))
const list = useApiQuery<Paginated<Person> & { counts: Record<string, number> }>(['people', 'list'], '/people', params, { placeholder: true })
const rows = computed(() => list.data.value?.items ?? [])
const counts = computed(() => list.data.value?.counts ?? {})

const PLURAL: Record<string, string> = {
  adopter: 'Adotantes/tutores', reporter: 'Denunciantes', volunteer: 'Voluntários', donor: 'Doadores', foster: 'Lares temporários',
}
const tabs = computed(() => [
  { value: '', label: 'Todos' },
  ...Object.keys(PERSON_TYPES).map((value) => ({ value, label: PLURAL[value]!, count: counts.value[value] || null })),
  { value: 'restricted', label: 'Com restrição' },
])

// dialogo
const formOpen = ref(false)
const editing = ref<Person | null>(null)
function openNew() {
  editing.value = null
  formOpen.value = true
}
function openEdit(p: Person) {
  editing.value = p
  formOpen.value = true
}
watch(
  () => route.query.novo,
  (v) => {
    if (v) {
      openNew()
      router.replace({ query: {} })
    }
  },
  { immediate: true },
)

const remove = useApiMutation((id: string) => api.del(`/people/${id}`), { invalidate: ['people'], success: 'Cadastro excluído' })
async function askRemove(p: Person) {
  if (await confirm({ title: `Excluir ${p.name}?`, description: 'O histórico de adoções é mantido.', confirmText: 'Excluir', destructive: true }))
    remove.mutate(p.id)
}

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'types', label: 'Vínculo' },
  { key: 'contact', label: 'Contato' },
  { key: 'city', label: 'Cidade' },
  { key: 'adoptionsCount', label: 'Adoções', align: 'center' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Pessoas" :description="`${list.data.value?.total ?? 0} cadastros`">
      <template #actions>
        <Button v-if="session.can('people.edit')" @click="openNew"><UserPlus /> Nova pessoa</Button>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <PillTabs v-model="type" :items="tabs" />
      <SearchInput v-model="search" placeholder="Nome, CPF, telefone, cidade..." class="lg:ml-auto lg:w-80" />
    </div>

    <ResponsiveTable :rows="rows" :columns="columns" :loading="list.isLoading.value" clickable @row-click="(r) => router.push({ name: 'person', params: { id: r.id } })">
      <template #cell-name="{ row }">
        <span class="flex items-center gap-2.5">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{{ initials(row.name) }}</span>
          <span>
            <span class="flex items-center gap-1.5 font-medium">{{ row.name }} <ShieldAlert v-if="row.restricted" class="size-3.5 text-rose-600" /></span>
            <span v-if="row.cpf" class="text-xs text-muted-foreground">{{ maskCpf(row.cpf) }}</span>
          </span>
        </span>
      </template>
      <template #cell-types="{ row }">
        <span class="flex flex-wrap gap-1">
          <Pill v-for="t in row.types" :key="t" :tone="personTypeTone[t]">{{ PERSON_TYPES[t as keyof typeof PERSON_TYPES] }}</Pill>
          <span v-if="!row.types.length" class="text-muted-foreground">—</span>
        </span>
      </template>
      <template #cell-contact="{ row }">
        <span class="flex items-center gap-2">
          {{ row.whatsapp || row.phone || row.email || '—' }}
          <a v-if="whatsappLink(row.whatsapp || row.phone)" :href="whatsappLink(row.whatsapp || row.phone)!" target="_blank" rel="noopener" class="text-emerald-600" @click.stop>
            <MessageCircle class="size-4" />
          </a>
        </span>
      </template>
      <template #cell-city="{ row }">{{ [row.city, row.state].filter(Boolean).join('/') || '—' }}</template>
      <template #cell-adoptionsCount="{ row }">{{ row.adoptionsCount || '—' }}</template>

      <template #actions="{ row }">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" aria-label="Ações"><Ellipsis /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="session.can('people.edit')" @click="openEdit(row)"><Pencil /> Editar</DropdownMenuItem>
            <template v-if="session.can('people.delete')">
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove(row)"><Trash2 class="text-rose-600" /> Excluir</DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>

      <template #mobile="{ row }">
        <div class="flex items-center gap-3 pr-8">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{{ initials(row.name) }}</span>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-1.5 truncate font-semibold">{{ row.name }} <ShieldAlert v-if="row.restricted" class="size-3.5 text-rose-600" /></p>
            <p class="truncate text-xs text-muted-foreground">{{ [row.whatsapp || row.phone, row.city].filter(Boolean).join(' · ') || 'Sem contato' }}</p>
            <div v-if="row.types.length" class="mt-1.5 flex flex-wrap gap-1">
              <Pill v-for="t in row.types" :key="t" :tone="personTypeTone[t]">{{ PERSON_TYPES[t as keyof typeof PERSON_TYPES] }}</Pill>
            </div>
          </div>
        </div>
      </template>

      <template #empty>
        <EmptyState title="Ninguém encontrado" :icon="Users" description="Cadastre aqui ou direto durante uma adoção.">
          <Button v-if="session.can('people.edit')" @click="openNew"><UserPlus /> Nova pessoa</Button>
        </EmptyState>
      </template>
    </ResponsiveTable>

    <div v-if="(list.data.value?.total ?? 0) > rows.length" class="mt-5 flex justify-center">
      <Button variant="outline" @click="limit += 30">Carregar mais</Button>
    </div>

    <PersonFormDialog v-model:open="formOpen" :person="editing" />
  </div>
</template>
