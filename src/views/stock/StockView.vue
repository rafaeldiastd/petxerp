<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarClock, Cat, Dog, Ellipsis, LoaderCircle, Minus, Package, PackagePlus, Pencil, Plus, Settings2, Trash2, TriangleAlert,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import ResponsiveTable from '@/components/common/ResponsiveTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FormField from '@/components/common/FormField.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import PillTabs from '@/components/common/PillTabs.vue'
import Pill from '@/components/common/Pill.vue'
import StockItemDialog from '@/components/stock/StockItemDialog.vue'
import MovementDialog from '@/components/stock/MovementDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { daysUntil, fmtDate, fmtNumber } from '@/lib/format'
import { useSession } from '@/stores/session'
import { MOVEMENT_REASON, MOVEMENT_TYPE, STOCK_AGE, STOCK_KIND, STOCK_SPECIES, STOCK_UNIT } from '@shared/constants'
import type { StockItem, StockMovement } from '@shared/types'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { confirm } = useConfirm()

type Summary = {
  food: { bySpecies: Record<string, number>; dailyKg: { dog: number; cat: number }; daysLeft: { dog: number | null; cat: number | null } }
  lowCount: number
  expiringCount: number
}
const summary = useApiQuery<Summary>(['stock', 'summary'], '/stock/summary')
const items = useApiQuery<StockItem[]>(['stock', 'items'], '/stock/items')
const movements = useApiQuery<StockMovement[]>(['stock', 'movements'], '/stock/movements')

const tab = ref('food')
const tabItems = [
  { value: 'food', label: 'Ração' },
  { value: 'items', label: 'Itens e medicamentos' },
  { value: 'movements', label: 'Movimentações' },
]
const search = ref('')
const all = computed(() => items.data.value ?? [])
const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  return all.value.filter((i) => (tab.value === 'food' ? i.kind === 'food' : i.kind !== 'food') && (!s || i.name.toLowerCase().includes(s) || i.brand?.toLowerCase().includes(s)))
})

const unit = (u: string) => STOCK_UNIT[u as keyof typeof STOCK_UNIT] ?? u
const low = (i: StockItem) => i.minQuantity != null && i.quantity <= i.minQuantity
const pct = (i: StockItem) => (i.minQuantity ? Math.min(100, (i.quantity / (i.minQuantity * 3)) * 100) : 100)
const tone = (days: number | null) => (days === null ? 'text-muted-foreground' : days < 7 ? 'text-rose-600' : days < 15 ? 'text-amber-600' : 'text-emerald-600')

// diálogos
const itemOpen = ref(false)
const editingItem = ref<StockItem | null>(null)
const movOpen = ref(false)
const movItem = ref<string | null>(null)
const movType = ref<'in' | 'out' | 'adjust'>('out')
function newItem() {
  editingItem.value = null
  itemOpen.value = true
}
function editItem(i: StockItem) {
  editingItem.value = i
  itemOpen.value = true
}
function move(i: StockItem | null, type: 'in' | 'out' | 'adjust') {
  movItem.value = i?.id ?? null
  movType.value = type
  movOpen.value = true
}
watch(
  () => route.query.mov,
  (v) => {
    if (v) {
      move(null, 'out')
      router.replace({ query: {} })
    }
  },
  { immediate: true },
)

const remove = useApiMutation((id: string) => api.del(`/stock/items/${id}`), { invalidate: ['stock'], success: 'Item removido' })
async function askRemove(i: StockItem) {
  if (await confirm({ title: `Remover ${i.name}?`, description: 'O histórico de movimentações é mantido.', confirmText: 'Remover', destructive: true }))
    remove.mutate(i.id)
}

// consumo diário
const consOpen = ref(false)
const cons = ref({ dog: 0, cat: 0 })
watch(consOpen, (v) => v && summary.data.value && (cons.value = { ...summary.data.value.food.dailyKg }))
const saveCons = useApiMutation(() => api.put('/stock/consumption', cons.value), {
  invalidate: ['stock'],
  success: 'Consumo diário atualizado',
  onSuccess: () => (consOpen.value = false),
})

const itemColumns = [
  { key: 'name', label: 'Item' },
  { key: 'species', label: 'Espécie' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'expiresAt', label: 'Validade' },
  { key: 'quick', label: '', align: 'right' as const },
]
const movColumns = [
  { key: 'date', label: 'Data' },
  { key: 'itemName', label: 'Item' },
  { key: 'type', label: 'Tipo' },
  { key: 'quantity', label: 'Quantidade', align: 'right' as const },
  { key: 'balanceAfter', label: 'Saldo', align: 'right' as const },
  { key: 'reason', label: 'Motivo' },
  { key: 'createdByName', label: 'Por' },
]
</script>

<template>
  <div>
    <PageHeader title="Estoque">
      <template #actions>
        <Button v-if="session.can('stock.move')" variant="outline" @click="move(null, 'out')"><PackagePlus /> Movimentar</Button>
        <Button v-if="session.can('stock.manage')" @click="newItem"><Plus /> Novo item</Button>
      </template>
    </PageHeader>

    <!-- Ração: dias até acabar -->
    <div class="mb-4 grid grid-cols-2 gap-3 sm:gap-4">
      <div v-for="s in (['dog', 'cat'] as const)" :key="s" class="rounded-2xl border bg-card p-4 sm:p-5">
        <div class="flex items-center gap-2 text-sm font-medium">
          <Dog v-if="s === 'dog'" class="size-4 text-brand-600" /><Cat v-else class="size-4 text-amber-600" />
          Ração {{ s === 'dog' ? 'cães' : 'gatos' }}
        </div>
        <div class="mt-2 flex items-end justify-between gap-2">
          <p class="text-xl font-bold sm:text-2xl">{{ fmtNumber(summary.data.value?.food.bySpecies[s]) }} <span class="text-sm font-medium text-muted-foreground">kg</span></p>
          <p class="text-right text-sm">
            <b class="text-lg sm:text-xl" :class="tone(summary.data.value?.food.daysLeft[s] ?? null)">{{ summary.data.value?.food.daysLeft[s] ?? '—' }}</b>
            <span class="text-muted-foreground"> dias</span>
          </p>
        </div>
      </div>
    </div>
    <div class="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <span class="flex items-center gap-1.5"><TriangleAlert class="size-4 text-amber-600" /> {{ summary.data.value?.lowCount ?? 0 }} abaixo do mínimo</span>
      <span class="flex items-center gap-1.5"><CalendarClock class="size-4 text-rose-600" /> {{ summary.data.value?.expiringCount ?? 0 }} vencendo em 30 dias</span>
      <button v-if="session.can('stock.manage')" type="button" class="flex items-center gap-1.5 font-medium text-brand-600 hover:underline" @click="consOpen = true">
        <Settings2 class="size-4" /> Consumo diário: {{ fmtNumber(summary.data.value?.food.dailyKg.dog) }} + {{ fmtNumber(summary.data.value?.food.dailyKg.cat) }} kg
      </button>
    </div>

    <div>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <PillTabs v-model="tab" :items="tabItems" />
        <SearchInput v-if="tab !== 'movements'" v-model="search" placeholder="Buscar item..." class="sm:ml-auto sm:w-72" />
      </div>

      <div v-if="tab !== 'movements'">
        <ResponsiveTable :rows="filtered" :columns="itemColumns" :loading="items.isLoading.value">
          <template #cell-name="{ row }">
            <span class="font-medium">{{ row.name }}</span>
            <span class="block text-xs text-muted-foreground">{{ [row.brand, row.kind !== 'food' && STOCK_KIND[row.kind as keyof typeof STOCK_KIND]].filter(Boolean).join(' · ') }}</span>
          </template>
          <template #cell-species="{ row }">
            {{ row.species ? STOCK_SPECIES[row.species as keyof typeof STOCK_SPECIES] : '—' }}
            <span v-if="row.ageGroup && row.kind === 'food'" class="block text-xs text-muted-foreground">{{ STOCK_AGE[row.ageGroup as keyof typeof STOCK_AGE] }}</span>
          </template>
          <template #cell-quantity="{ row }">
            <div class="min-w-32">
              <div class="flex items-center gap-2">
                <span class="font-semibold tabular-nums" :class="low(row) && 'text-rose-600'">{{ fmtNumber(row.quantity, 3) }} {{ unit(row.unit) }}</span>
                <Pill v-if="low(row)" tone="red">Baixo</Pill>
              </div>
              <div v-if="row.minQuantity" class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div class="h-full rounded-full" :class="low(row) ? 'bg-rose-500' : 'bg-emerald-500'" :style="{ width: `${pct(row)}%` }" />
              </div>
            </div>
          </template>
          <template #cell-expiresAt="{ row }">
            <span :class="(daysUntil(row.expiresAt) ?? 99) < 30 && 'font-medium text-rose-600'">{{ fmtDate(row.expiresAt) }}</span>
          </template>
          <template #cell-quick="{ row }">
            <span v-if="session.can('stock.move')" class="inline-flex gap-1">
              <Button size="icon-sm" variant="outline" aria-label="Saída" @click.stop="move(row, 'out')"><Minus /></Button>
              <Button size="icon-sm" variant="outline" aria-label="Entrada" @click.stop="move(row, 'in')"><Plus /></Button>
            </span>
          </template>
          <template #actions="{ row }">
            <DropdownMenu>
              <DropdownMenuTrigger as-child><Button variant="ghost" size="icon-sm" aria-label="Ações"><Ellipsis /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem v-if="session.can('stock.move')" @click="move(row, 'in')"><Plus /> Entrada</DropdownMenuItem>
                <DropdownMenuItem v-if="session.can('stock.move')" @click="move(row, 'out')"><Minus /> Saída</DropdownMenuItem>
                <DropdownMenuItem v-if="session.can('stock.move')" @click="move(row, 'adjust')"><Package /> Ajustar (inventário)</DropdownMenuItem>
                <template v-if="session.can('stock.manage')">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="editItem(row)"><Pencil /> Editar</DropdownMenuItem>
                  <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove(row)"><Trash2 class="text-rose-600" /> Remover</DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>
          <template #mobile="{ row }">
            <div class="pr-8">
              <p class="font-semibold">{{ row.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ [row.brand, row.species && STOCK_SPECIES[row.species as keyof typeof STOCK_SPECIES], row.expiresAt && `vence ${fmtDate(row.expiresAt)}`].filter(Boolean).join(' · ') }}
              </p>
              <div class="mt-2 flex items-center gap-2">
                <span class="text-lg font-bold tabular-nums" :class="low(row) && 'text-rose-600'">{{ fmtNumber(row.quantity, 3) }} {{ unit(row.unit) }}</span>
                <Pill v-if="low(row)" tone="red">Baixo</Pill>
                <span v-if="session.can('stock.move')" class="ml-auto inline-flex gap-1.5">
                  <Button size="icon" variant="outline" aria-label="Saída" @click.stop="move(row, 'out')"><Minus /></Button>
                  <Button size="icon" variant="outline" aria-label="Entrada" @click.stop="move(row, 'in')"><Plus /></Button>
                </span>
              </div>
            </div>
          </template>
          <template #empty>
            <EmptyState :title="tab === 'food' ? 'Nenhuma ração cadastrada' : 'Nenhum item cadastrado'" :icon="Package" description="Cadastre os itens para acompanhar entradas, saídas e alertas de estoque baixo.">
              <Button v-if="session.can('stock.manage')" @click="newItem"><Plus /> Novo item</Button>
            </EmptyState>
          </template>
        </ResponsiveTable>
      </div>

      <div v-else>
        <ResponsiveTable :rows="movements.data.value ?? []" :columns="movColumns" :loading="movements.isLoading.value">
          <template #cell-date="{ row }">{{ fmtDate(row.date) }}</template>
          <template #cell-type="{ row }">
            <Pill :tone="row.type === 'in' ? 'green' : row.type === 'out' ? 'amber' : 'sky'">{{ MOVEMENT_TYPE[row.type as keyof typeof MOVEMENT_TYPE] }}</Pill>
          </template>
          <template #cell-quantity="{ row }">
            <span class="font-semibold tabular-nums">{{ row.type === 'in' ? '+' : row.type === 'out' ? '−' : '=' }}{{ fmtNumber(row.quantity, 3) }} {{ unit(row.itemUnit ?? '') }}</span>
          </template>
          <template #cell-balanceAfter="{ row }"><span class="tabular-nums">{{ fmtNumber(row.balanceAfter, 3) }}</span></template>
          <template #cell-reason="{ row }">{{ row.reason ? MOVEMENT_REASON[row.reason as keyof typeof MOVEMENT_REASON] : '—' }}<span v-if="row.notes" class="block text-xs text-muted-foreground">{{ row.notes }}</span></template>
          <template #mobile="{ row }">
            <div class="flex items-center gap-3">
              <Pill :tone="row.type === 'in' ? 'green' : row.type === 'out' ? 'amber' : 'sky'">{{ MOVEMENT_TYPE[row.type as keyof typeof MOVEMENT_TYPE] }}</Pill>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ row.itemName }}</p>
                <p class="text-xs text-muted-foreground">{{ fmtDate(row.date) }} · {{ row.createdByName }}</p>
              </div>
              <span class="font-semibold tabular-nums">{{ row.type === 'in' ? '+' : row.type === 'out' ? '−' : '=' }}{{ fmtNumber(row.quantity, 3) }}</span>
            </div>
          </template>
          <template #empty><EmptyState title="Sem movimentações" :icon="Package" /></template>
        </ResponsiveTable>
      </div>
    </div>

    <StockItemDialog v-model:open="itemOpen" :item="editingItem" :kind="tab === 'items' ? 'medicine' : 'food'" />
    <MovementDialog v-model:open="movOpen" :items="all" :item-id="movItem" :type="movType" />

    <Dialog v-model:open="consOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Consumo diário de ração</DialogTitle>
          <DialogDescription>Quanto é distribuído por dia — usado para calcular os dias até acabar.</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Cães (kg/dia)"><Input v-model.number="cons.dog" type="number" step="0.1" min="0" inputmode="decimal" /></FormField>
          <FormField label="Gatos (kg/dia)"><Input v-model.number="cons.cat" type="number" step="0.1" min="0" inputmode="decimal" /></FormField>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="consOpen = false">Cancelar</Button>
          <Button :disabled="saveCons.isPending.value" @click="saveCons.mutate()"><LoaderCircle v-if="saveCons.isPending.value" class="animate-spin" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
