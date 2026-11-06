<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { CalendarRange, Check, Clock, Copy, Ellipsis, ExternalLink, HandHeart, Plus, Settings2, Trash2, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'
import ResponsiveTable from '@/components/common/ResponsiveTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pill from '@/components/common/Pill.vue'
import SelectField from '@/components/common/SelectField.vue'
import DonationDialog from '@/components/donations/DonationDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { fmtDateTime, fmtMoney } from '@/lib/format'
import { donationStatusTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import { DONATION_METHOD, DONATION_STATUS } from '@shared/constants'
import type { Donation } from '@shared/types'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { confirm } = useConfirm()
const { copy, copied } = useClipboard({ legacy: true })

const status = ref('')
const method = ref('')
const month = ref('')
const limit = ref(40)
const params = computed(() => ({ status: status.value, method: method.value, month: month.value, limit: limit.value }))
const list = useApiQuery<{ items: Donation[]; total: number; sum: number }>(['donations', 'list'], '/donations', params, { placeholder: true })
const summary = useApiQuery<{ month: number; year: number; donorsMonth: number; pending: number }>(['donations', 'summary'], '/donations/summary')
const rows = computed(() => list.data.value?.items ?? [])
const publicUrl = computed(() => `${window.location.origin}/doar/${session.org?.slug}`)

const dlg = ref(false)
watch(
  () => route.query.nova,
  (v) => {
    if (v) {
      dlg.value = true
      router.replace({ query: {} })
    }
  },
  { immediate: true },
)

const setStatus = useApiMutation(({ id, status }: { id: string; status: string }) => api.patch(`/donations/${id}/status`, { status }), {
  invalidate: ['donations'],
  success: 'Status atualizado',
})
const remove = useApiMutation((id: string) => api.del(`/donations/${id}`), { invalidate: ['donations'], success: 'Doação excluída' })
async function askRemove(d: Donation) {
  if (await confirm({ title: 'Excluir esta doação?', confirmText: 'Excluir', destructive: true })) remove.mutate(d.id)
}

const columns = [
  { key: 'date', label: 'Data' },
  { key: 'donorName', label: 'Doador' },
  { key: 'method', label: 'Forma' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Valor', align: 'right' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Doações">
      <template #actions>
        <Button v-if="session.can('donations.settings')" variant="outline" as-child>
          <RouterLink :to="{ name: 'payments' }"><Settings2 /> Configurar pagamentos</RouterLink>
        </Button>
        <Button v-if="session.can('donations.manage')" @click="dlg = true"><Plus /> Registrar doação</Button>
      </template>
    </PageHeader>

    <div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label="Recebido no mês" :value="fmtMoney(summary.data.value?.month)" :icon="HandHeart" :loading="summary.isLoading.value" />
      <StatCard label="Recebido no ano" :value="fmtMoney(summary.data.value?.year)" :icon="CalendarRange" :loading="summary.isLoading.value" />
      <StatCard label="Doadores no mês" :value="summary.data.value?.donorsMonth ?? 0" :icon="Users" :loading="summary.isLoading.value" />
      <StatCard label="Aguardando confirmação" :value="summary.data.value?.pending ?? 0" :icon="Clock" :loading="summary.isLoading.value" />
    </div>

    <div class="mb-6 flex flex-col gap-3 rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 to-brand-50 p-4 sm:flex-row sm:items-center">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-600 shadow-xs"><HandHeart class="size-5" /></span>
      <div class="min-w-0 flex-1">
        <p class="font-semibold">Página pública de doação</p>
        <p class="truncate text-sm text-muted-foreground">{{ publicUrl }}</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" class="bg-white" @click="copy(publicUrl)"><Check v-if="copied" /><Copy v-else /> {{ copied ? 'Copiado' : 'Copiar link' }}</Button>
        <Button variant="outline" class="bg-white" as-child><a :href="publicUrl" target="_blank"><ExternalLink /> Abrir</a></Button>
      </div>
    </div>

    <div class="mb-4 grid gap-2 sm:grid-cols-3 lg:max-w-2xl">
      <SelectField v-model="status" :options="DONATION_STATUS" nullable null-label="Todos os status" placeholder="Status" class="h-10 rounded-xl" />
      <SelectField v-model="method" :options="DONATION_METHOD" nullable null-label="Todas as formas" placeholder="Forma" class="h-10 rounded-xl" />
      <Input v-model="month" type="month" class="h-10 rounded-xl bg-card" aria-label="Mês" />
    </div>

    <ResponsiveTable :rows="rows" :columns="columns" :loading="list.isLoading.value">
      <template #cell-date="{ row }">{{ fmtDateTime(row.date) }}</template>
      <template #cell-donorName="{ row }">
        <span class="font-medium">{{ row.donorName || 'Anônimo' }}</span>
        <span v-if="row.donorEmail" class="block text-xs text-muted-foreground">{{ row.donorEmail }}</span>
      </template>
      <template #cell-method="{ row }">{{ DONATION_METHOD[row.method as keyof typeof DONATION_METHOD] }}</template>
      <template #cell-status="{ row }"><Pill :tone="donationStatusTone[row.status]">{{ DONATION_STATUS[row.status as keyof typeof DONATION_STATUS] }}</Pill></template>
      <template #cell-amount="{ row }"><span class="font-semibold tabular-nums">{{ fmtMoney(row.amount) }}</span></template>
      <template v-if="session.can('donations.manage')" #actions="{ row }">
        <DropdownMenu>
          <DropdownMenuTrigger as-child><Button variant="ghost" size="icon-sm" aria-label="Ações"><Ellipsis /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-for="(l, s) in DONATION_STATUS" :key="s" :disabled="row.status === s" @click="setStatus.mutate({ id: row.id, status: s })">Marcar: {{ l }}</DropdownMenuItem>
            <template v-if="!row.provider">
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove(row)"><Trash2 class="text-rose-600" /> Excluir</DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
      <template #mobile="{ row }">
        <div class="flex items-center gap-3 pr-8">
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ row.donorName || 'Anônimo' }}</p>
            <p class="text-xs text-muted-foreground">{{ fmtDateTime(row.date) }} · {{ DONATION_METHOD[row.method as keyof typeof DONATION_METHOD] }}</p>
          </div>
          <div class="text-right">
            <p class="font-bold tabular-nums">{{ fmtMoney(row.amount) }}</p>
            <Pill :tone="donationStatusTone[row.status]">{{ DONATION_STATUS[row.status as keyof typeof DONATION_STATUS] }}</Pill>
          </div>
        </div>
      </template>
      <template #empty>
        <EmptyState title="Nenhuma doação no filtro" :icon="HandHeart" description="Compartilhe a página pública de doação ou registre doações recebidas." />
      </template>
    </ResponsiveTable>

    <div v-if="rows.length" class="mt-3 flex justify-between rounded-xl bg-muted/60 px-4 py-2.5 text-sm">
      <span class="text-muted-foreground">{{ list.data.value?.total }} registros</span>
      <span class="font-semibold">Confirmado {{ fmtMoney(list.data.value?.sum) }}</span>
    </div>
    <div v-if="(list.data.value?.total ?? 0) > rows.length" class="mt-4 flex justify-center">
      <Button variant="outline" @click="limit += 40">Carregar mais</Button>
    </div>

    <DonationDialog v-model:open="dlg" />
  </div>
</template>
