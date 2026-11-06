<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { HeartHandshake, Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import PillTabs from '@/components/common/PillTabs.vue'
import ResponsiveTable from '@/components/common/ResponsiveTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import Pill from '@/components/common/Pill.vue'
import CastrationBadge from '@/components/adoptions/CastrationBadge.vue'
import { useApiQuery } from '@/composables/useApi'
import { fmtDate } from '@/lib/format'
import { adoptionStatusTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import { ADOPTION_LOCATION, ADOPTION_STATUS } from '@shared/constants'
import type { Adoption, Paginated } from '@shared/types'

const router = useRouter()
const session = useSession()
const search = ref('')
const q = refDebounced(search, 200)
const tab = ref('active')
const limit = ref(30)

const tabs = [
  { value: 'active', label: 'Ativas' },
  { value: 'castration', label: 'Castração pendente' },
  { value: 'overdue', label: 'Castração atrasada' },
  { value: 'returned', label: 'Devolvidas' },
  { value: 'all', label: 'Todas' },
]
const params = computed(() => ({
  q: q.value,
  status: ['active', 'returned'].includes(tab.value) ? tab.value : '',
  castration: tab.value === 'castration' ? 'pending' : tab.value === 'overdue' ? 'overdue' : '',
  limit: limit.value,
}))
const list = useApiQuery<Paginated<Adoption>>(['adoptions', 'list'], '/adoptions', params, { placeholder: true })
const rows = computed(() => list.data.value?.items ?? [])

const columns = [
  { key: 'animal', label: 'Animal' },
  { key: 'person', label: 'Adotante' },
  { key: 'date', label: 'Data' },
  { key: 'location', label: 'Local' },
  { key: 'castration', label: 'Castração' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <div>
    <PageHeader title="Adoções" :description="`${list.data.value?.total ?? 0} registros`">
      <template #actions>
        <Button v-if="session.can('adoptions.create')" as-child>
          <RouterLink :to="{ name: 'adoption-new' }"><Plus /> Nova adoção</RouterLink>
        </Button>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <PillTabs v-model="tab" :items="tabs" />
      <SearchInput v-model="search" placeholder="Animal ou adotante..." class="lg:ml-auto lg:w-72" />
    </div>

    <ResponsiveTable :rows="rows" :columns="columns" :loading="list.isLoading.value" clickable @row-click="(r) => router.push({ name: 'adoption', params: { id: r.id } })">
      <template #cell-animal="{ row }">
        <span class="flex items-center gap-2.5">
          <AnimalAvatar :photo-key="row.animal?.photoKey" :species="row.animal?.species" size="sm" />
          <span class="font-medium">{{ row.animal?.name }}</span>
        </span>
      </template>
      <template #cell-person="{ row }">{{ row.person?.name }}</template>
      <template #cell-date="{ row }">{{ fmtDate(row.date) }}</template>
      <template #cell-location="{ row }">{{ row.location ? ADOPTION_LOCATION[row.location as keyof typeof ADOPTION_LOCATION] : '—' }}</template>
      <template #cell-castration="{ row }">
        <CastrationBadge :done="row.castrationDone" :deadline="row.castrationDeadline" :status="row.status" />
      </template>
      <template #cell-status="{ row }">
        <Pill :tone="adoptionStatusTone[row.status]">{{ ADOPTION_STATUS[row.status as keyof typeof ADOPTION_STATUS] }}</Pill>
      </template>

      <template #mobile="{ row }">
        <div class="flex items-center gap-3">
          <AnimalAvatar :photo-key="row.animal?.photoKey" :species="row.animal?.species" size="lg" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ row.animal?.name }}</p>
            <p class="truncate text-sm text-muted-foreground">{{ row.person?.name }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Pill :tone="adoptionStatusTone[row.status]">{{ ADOPTION_STATUS[row.status as keyof typeof ADOPTION_STATUS] }}</Pill>
              <CastrationBadge :done="row.castrationDone" :deadline="row.castrationDeadline" :status="row.status" />
              <span class="text-xs text-muted-foreground">{{ fmtDate(row.date) }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #empty>
        <EmptyState title="Nenhuma adoção encontrada" :icon="HeartHandshake" description="As adoções realizadas aparecem aqui, com o acompanhamento da castração." />
      </template>
    </ResponsiveTable>

    <div v-if="(list.data.value?.total ?? 0) > rows.length" class="mt-5 flex justify-center">
      <Button variant="outline" @click="limit += 30">Carregar mais</Button>
    </div>
  </div>
</template>
