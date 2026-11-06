<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { AlarmClock, CircleCheck, Ellipsis, Paperclip, Pencil, Plus, Receipt, RotateCcw, Trash2, Wallet } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'
import ResponsiveTable from '@/components/common/ResponsiveTable.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import PillTabs from '@/components/common/PillTabs.vue'
import SelectField from '@/components/common/SelectField.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pill from '@/components/common/Pill.vue'
import ExpenseDialog from '@/components/finance/ExpenseDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api, fileUrl } from '@/lib/api'
import { daysUntil, fmtDate, fmtMoney } from '@/lib/format'
import { useSession } from '@/stores/session'
import { EXPENSE_CATEGORY, PAYMENT_METHOD } from '@shared/constants'
import type { Expense, Partner } from '@shared/types'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { confirm } = useConfirm()

const status = ref((route.query.status as string) || 'open')
const search = ref('')
const q = refDebounced(search, 200)
const category = ref('')
const partnerId = ref((route.query.partner as string) || '')
const month = ref('')
const limit = ref(40)

const params = computed(() => ({ status: status.value === 'all' ? '' : status.value, q: q.value, category: category.value, partnerId: partnerId.value, month: month.value, limit: limit.value }))
const list = useApiQuery<{ items: Expense[]; total: number; sum: number }>(['expenses', 'list'], '/finance/expenses', params, { placeholder: true })
const summary = useApiQuery<{ open: number; openCount: number; overdue: number; overdueCount: number; paidThisMonth: number; byPartner: { partnerId: string | null; name: string; amount: number; count: number }[] }>(['expenses', 'summary'], '/finance/expenses/summary')
const partners = useApiQuery<Partner[]>(['partners'], '/finance/partners')
const rows = computed(() => list.data.value?.items ?? [])

const statusTabs = [
  { value: 'open', label: 'Em aberto' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'paid', label: 'Pagas' },
  { value: 'all', label: 'Todas' },
]

const dlgOpen = ref(false)
const editing = ref<Expense | null>(null)
const presetAnimal = ref<string | null>(null)
function openNew(animalId: string | null = null) {
  editing.value = null
  presetAnimal.value = animalId
  dlgOpen.value = true
}
function openEdit(e: Expense) {
  editing.value = e
  dlgOpen.value = true
}
watch(
  () => route.query.nova,
  (v) => {
    if (v) {
      openNew((route.query.animal as string) || null)
      router.replace({ query: {} })
    }
  },
  { immediate: true },
)

const pay = useApiMutation(({ id, paid }: { id: string; paid: boolean }) => api.post(`/finance/expenses/${id}/pay`, { paid }), {
  invalidate: ['expenses', 'partners'],
  success: (_, v) => (v.paid ? 'Despesa marcada como paga' : 'Pagamento desfeito'),
})
const remove = useApiMutation((id: string) => api.del(`/finance/expenses/${id}`), { invalidate: ['expenses', 'partners'], success: 'Despesa excluída' })
async function askRemove(e: Expense) {
  if (await confirm({ title: 'Excluir esta despesa?', description: e.description, confirmText: 'Excluir', destructive: true })) remove.mutate(e.id)
}

const plural = (n = 0) => `${n} ${n === 1 ? 'despesa' : 'despesas'}`
const due = (e: Expense) => (!e.paid ? daysUntil(e.dueDate) : null)
const columns = [
  { key: 'description', label: 'Motivo' },
  { key: 'partnerName', label: 'Empresa' },
  { key: 'dueDate', label: 'Vencimento' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Valor', align: 'right' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Despesas">
      <template #actions>
        <Button variant="outline" as-child><RouterLink :to="{ name: 'partners' }">Clínicas e parceiros</RouterLink></Button>
        <Button v-if="session.can('finance.manage')" @click="openNew()"><Plus /> Nova despesa</Button>
      </template>
    </PageHeader>

    <div class="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <StatCard label="Em aberto" :value="fmtMoney(summary.data.value?.open)" :icon="Wallet" :hint="plural(summary.data.value?.openCount)" :loading="summary.isLoading.value" />
      <StatCard label="Vencidas" :value="fmtMoney(summary.data.value?.overdue)" :icon="AlarmClock" :hint="plural(summary.data.value?.overdueCount)" :hint-tone="summary.data.value?.overdueCount ? 'bad' : 'default'" :loading="summary.isLoading.value" />
      <StatCard label="Pagas no mês" :value="fmtMoney(summary.data.value?.paidThisMonth)" :icon="CircleCheck" :loading="summary.isLoading.value" class="col-span-2 lg:col-span-1" />
    </div>

    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
      <PillTabs v-model="status" :items="statusTabs" />
      <div class="grid flex-1 gap-2 sm:grid-cols-4 xl:ml-auto xl:max-w-3xl">
        <SearchInput v-model="search" placeholder="Buscar motivo..." class="sm:col-span-1" />
        <SelectField v-model="category" :options="EXPENSE_CATEGORY" nullable null-label="Todas as categorias" placeholder="Categoria" class="h-10 rounded-xl" />
        <SelectField v-model="partnerId" :options="(partners.data.value ?? []).map((p) => ({ value: p.id, label: p.name }))" nullable null-label="Todas as empresas" placeholder="Empresa" class="h-10 rounded-xl" />
        <Input v-model="month" type="month" class="h-10 rounded-xl bg-card" aria-label="Mês" />
      </div>
    </div>

    <ResponsiveTable :rows="rows" :columns="columns" :loading="list.isLoading.value">
      <template #cell-description="{ row }">
        <span class="flex items-center gap-1.5 font-medium">{{ row.description }}
          <a v-if="row.attachmentKey" :href="fileUrl(row.attachmentKey)!" target="_blank" class="text-muted-foreground hover:text-brand-600" @click.stop><Paperclip class="size-3.5" /></a>
        </span>
        <span class="block text-xs text-muted-foreground">
          {{ EXPENSE_CATEGORY[row.category as keyof typeof EXPENSE_CATEGORY] }}<template v-if="row.animalName"> · <RouterLink :to="{ name: 'animal', params: { id: row.animalId } }" class="hover:text-brand-600">{{ row.animalName }}</RouterLink></template>
        </span>
      </template>
      <template #cell-partnerName="{ row }">{{ row.partnerName || '—' }}</template>
      <template #cell-dueDate="{ row }">{{ fmtDate(row.dueDate) }}</template>
      <template #cell-status="{ row }">
        <Pill v-if="row.paid" tone="green">Paga {{ fmtDate(row.paidAt, { day: '2-digit', month: '2-digit' }) }}</Pill>
        <Pill v-else-if="(due(row) ?? 1) < 0" tone="red">Vencida</Pill>
        <Pill v-else-if="due(row) !== null && due(row)! <= 3" tone="amber">Vence em {{ due(row) }}d</Pill>
        <Pill v-else tone="gray">Em aberto</Pill>
      </template>
      <template #cell-amount="{ row }">
        <span class="font-semibold tabular-nums">{{ fmtMoney(row.amount) }}</span>
        <span v-if="row.paymentMethod" class="block text-xs text-muted-foreground">{{ PAYMENT_METHOD[row.paymentMethod as keyof typeof PAYMENT_METHOD] }}</span>
      </template>
      <template v-if="session.can('finance.manage')" #actions="{ row }">
        <DropdownMenu>
          <DropdownMenuTrigger as-child><Button variant="ghost" size="icon-sm" aria-label="Ações"><Ellipsis /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="!row.paid" @click="pay.mutate({ id: row.id, paid: true })"><CircleCheck /> Marcar como paga</DropdownMenuItem>
            <DropdownMenuItem v-else @click="pay.mutate({ id: row.id, paid: false })"><RotateCcw /> Desfazer pagamento</DropdownMenuItem>
            <DropdownMenuItem @click="openEdit(row)"><Pencil /> Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove(row)"><Trash2 class="text-rose-600" /> Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
      <template #mobile="{ row }">
        <div class="pr-8">
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold">{{ row.description }}</p>
          </div>
          <p class="text-xs text-muted-foreground">{{ [row.partnerName, row.animalName, `vence ${fmtDate(row.dueDate)}`].filter(Boolean).join(' · ') }}</p>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-lg font-bold tabular-nums">{{ fmtMoney(row.amount) }}</span>
            <Pill v-if="row.paid" tone="green">Paga</Pill>
            <Pill v-else-if="(due(row) ?? 1) < 0" tone="red">Vencida</Pill>
            <Pill v-else tone="gray">Em aberto</Pill>
            <Button v-if="!row.paid && session.can('finance.manage')" size="sm" variant="outline" class="ml-auto" @click.stop="pay.mutate({ id: row.id, paid: true })">
              <CircleCheck /> Pagar
            </Button>
          </div>
        </div>
      </template>
      <template #empty>
        <EmptyState title="Nenhuma despesa aqui" :icon="Receipt" description="Lance as despesas para acompanhar o que está em aberto com as clínicas parceiras.">
          <Button v-if="session.can('finance.manage')" @click="openNew()"><Plus /> Nova despesa</Button>
        </EmptyState>
      </template>
    </ResponsiveTable>

    <div v-if="rows.length" class="mt-3 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5 text-sm">
      <span class="text-muted-foreground">{{ list.data.value?.total }} despesas no filtro</span>
      <span class="font-semibold">Total {{ fmtMoney(list.data.value?.sum) }}</span>
    </div>
    <div v-if="(list.data.value?.total ?? 0) > rows.length" class="mt-4 flex justify-center">
      <Button variant="outline" @click="limit += 40">Carregar mais</Button>
    </div>

    <ExpenseDialog v-model:open="dlgOpen" :expense="editing" :animal-id="presetAnimal" />
  </div>
</template>
