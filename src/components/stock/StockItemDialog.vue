<script setup lang="ts">
import { watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { toForm } from '@/lib/format'
import { stockItemSchema } from '@shared/schemas'
import { STOCK_AGE, STOCK_KIND, STOCK_SPECIES, STOCK_UNIT } from '@shared/constants'
import type { StockItem } from '@shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: StockItem | null; kind?: string }>()

const blank = () => ({
  name: '', kind: props.kind ?? 'food', species: 'dog', ageGroup: 'adult', unit: props.kind && props.kind !== 'food' ? 'un' : 'kg',
  quantity: '', minQuantity: '', brand: '', expiresAt: '', notes: '',
})
const { values, errors, validate, reset } = useForm(stockItemSchema, blank)
watch(open, (v) => {
  if (!v) return
  reset(props.item ? toForm(props.item as unknown as Record<string, unknown>, blank()) : blank())
})
watch(
  () => values.kind,
  (k, old) => {
    if (props.item || !old) return
    if (k === 'food') values.unit = 'kg'
    else if (old === 'food') values.unit = 'un'
  },
)

const save = useApiMutation(
  (data: unknown) => (props.item ? api.patch(`/stock/items/${props.item.id}`, data) : api.post('/stock/items', data)),
  { invalidate: ['stock'], success: () => (props.item ? 'Item atualizado' : 'Item cadastrado'), onSuccess: () => (open.value = false) },
)
function submit() {
  const data = validate()
  if (data) save.mutate(data)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ item ? 'Editar item' : 'Novo item de estoque' }}</DialogTitle>
        <DialogDescription>Ração, medicamentos, produtos de limpeza e acessórios.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <FormField label="Tipo"><ChipGroup v-model="values.kind" :options="STOCK_KIND" size="sm" /></FormField>
        <div class="grid grid-cols-[1fr_140px] gap-3">
          <FormField label="Descrição" required :error="errors.name">
            <Input v-model="values.name" :placeholder="values.kind === 'food' ? 'Ex.: Ração adulto carne 15kg' : 'Ex.: Vermífugo, sabão...'" />
          </FormField>
          <FormField label="Marca"><Input v-model="values.brand" /></FormField>
        </div>
        <FormField label="Espécie"><ChipGroup v-model="values.species" :options="STOCK_SPECIES" variant="segmented" clearable /></FormField>
        <FormField v-if="values.kind === 'food'" label="Idade"><ChipGroup v-model="values.ageGroup" :options="STOCK_AGE" size="sm" clearable /></FormField>
        <div class="grid grid-cols-3 gap-3">
          <FormField label="Unidade"><SelectField v-model="values.unit" :options="STOCK_UNIT" /></FormField>
          <FormField v-if="!item" label="Qtd. inicial" :error="errors.quantity">
            <Input v-model="values.quantity" type="number" step="0.001" min="0" inputmode="decimal" />
          </FormField>
          <FormField label="Estoque mínimo" hint="Alerta no painel" :error="errors.minQuantity">
            <Input v-model="values.minQuantity" type="number" step="0.001" min="0" inputmode="decimal" />
          </FormField>
        </div>
        <FormField label="Validade" :error="errors.expiresAt"><Input v-model="values.expiresAt" type="date" /></FormField>
        <FormField label="Observações"><Textarea v-model="values.notes" rows="2" /></FormField>
        <p v-if="item" class="text-xs text-muted-foreground">Para alterar a quantidade, registre uma entrada, saída ou ajuste.</p>
        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar</Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
