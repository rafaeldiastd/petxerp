<script setup lang="ts">
import { computed, watch } from 'vue'
import { ArrowRight, LoaderCircle, PackageMinus, PackagePlus, Scale } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { fmtNumber, todayISO } from '@/lib/format'
import { movementSchema } from '@shared/schemas'
import { MOVEMENT_REASON, STOCK_UNIT } from '@shared/constants'
import type { StockItem } from '@shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ items: StockItem[]; itemId?: string | null; type?: 'in' | 'out' | 'adjust' }>()

const { values, errors, validate, reset } = useForm(movementSchema, () => ({
  itemId: props.itemId ?? '', type: props.type ?? 'out', quantity: '', reason: props.type === 'in' ? 'donation' : 'consumption', date: todayISO(), notes: '',
}))
watch(open, (v) => v && reset())

const typeOptions = [
  { value: 'in', label: 'Entrada', icon: PackagePlus },
  { value: 'out', label: 'Saída', icon: PackageMinus },
  { value: 'adjust', label: 'Ajuste', icon: Scale },
]
const reasonsByType: Record<string, (keyof typeof MOVEMENT_REASON)[]> = {
  in: ['donation', 'purchase', 'transfer'],
  out: ['consumption', 'loss', 'transfer'],
  adjust: ['inventory'],
}
const reasons = computed(() => Object.fromEntries(reasonsByType[values.type]!.map((r) => [r, MOVEMENT_REASON[r]])))
watch(
  () => values.type,
  (t) => (values.reason = reasonsByType[t]![0]),
)

const item = computed(() => props.items.find((i) => i.id === values.itemId))
const unit = computed(() => (item.value ? STOCK_UNIT[item.value.unit as keyof typeof STOCK_UNIT] : ''))
const result = computed(() => {
  if (!item.value || values.quantity === '') return null
  const n = Number(values.quantity)
  return values.type === 'in' ? item.value.quantity + n : values.type === 'out' ? item.value.quantity - n : n
})
const itemOptions = computed(() => props.items.map((i) => ({ value: i.id, label: `${i.name} (${fmtNumber(i.quantity, 2)} ${STOCK_UNIT[i.unit as keyof typeof STOCK_UNIT]})` })))

const save = useApiMutation((data: unknown) => api.post('/stock/movements', data), {
  invalidate: ['stock'],
  success: 'Movimentação registrada',
  onSuccess: () => (open.value = false),
})
function submit() {
  const data = validate()
  if (data) save.mutate(data)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Movimentar estoque</DialogTitle>
        <DialogDescription>Registre o que entrou (doações, compras) ou saiu (consumo diário, perdas).</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <ChipGroup v-model="values.type" :options="typeOptions" variant="segmented" />
        <FormField label="Item" required :error="errors.itemId">
          <SelectField v-model="values.itemId" :options="itemOptions" placeholder="Selecione o item" />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField :label="values.type === 'adjust' ? `Quantidade contada (${unit})` : `Quantidade (${unit || 'un'})`" required :error="errors.quantity">
            <Input v-model="values.quantity" type="number" step="0.001" min="0" inputmode="decimal" class="text-lg font-semibold" />
          </FormField>
          <FormField label="Data" :error="errors.date"><Input v-model="values.date" type="date" :max="todayISO()" /></FormField>
        </div>
        <div v-if="item && result !== null" class="flex items-center justify-center gap-3 rounded-xl bg-muted/60 py-2.5 text-sm">
          <span>{{ fmtNumber(item.quantity, 3) }} {{ unit }}</span>
          <ArrowRight class="size-4 text-muted-foreground" />
          <span class="font-semibold" :class="result < 0 ? 'text-rose-600' : 'text-foreground'">{{ fmtNumber(result, 3) }} {{ unit }}</span>
        </div>
        <FormField label="Motivo"><ChipGroup v-model="values.reason" :options="reasons" size="sm" /></FormField>
        <FormField label="Observação"><Input v-model="values.notes" placeholder="Ex.: doação da campanha de inverno" /></FormField>
        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value || (result !== null && result < 0)">
            <LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Registrar
          </Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
