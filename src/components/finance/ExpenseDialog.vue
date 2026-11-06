<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle, Plus } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import FileUpload from '@/components/common/FileUpload.vue'
import AnimalPicker, { type AnimalOption } from '@/components/animals/AnimalPicker.vue'
import PartnerDialog from './PartnerDialog.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { api } from '@/lib/api'
import { todayISO, toForm } from '@/lib/format'
import { expenseSchema } from '@shared/schemas'
import { EXPENSE_CATEGORY, PAYMENT_METHOD } from '@shared/constants'
import type { AnimalDetail, Expense, Partner, UploadedFile } from '@shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ expense?: Expense | null; animalId?: string | null }>()

const blank = () => ({
  description: '', category: 'veterinary', amount: '', partnerId: '', animalId: props.animalId ?? '', dueDate: todayISO(),
  paymentMethod: 'pix', paid: false, paidAt: '', attachmentKey: '', notes: '',
})
const { values, errors, validate, reset } = useForm(expenseSchema, blank)
const forAnimal = ref(false)
const attachment = ref<UploadedFile[]>([])

const partners = useApiQuery<Partner[]>(['partners'], '/finance/partners')
const partnerOptions = computed(() => (partners.data.value ?? []).map((p) => ({ value: p.id, label: p.name })))

const animalQ = useApiQuery<AnimalDetail>(['animals', computed(() => values.animalId)], () => `/animals/${values.animalId}`, undefined, {
  enabled: computed(() => open.value && !!values.animalId),
})

watch(open, (v) => {
  if (!v) return
  reset(props.expense ? toForm(props.expense as unknown as Record<string, unknown>, blank()) : blank())
  forAnimal.value = !!values.animalId
  attachment.value = values.attachmentKey ? [{ key: values.attachmentKey, name: 'Comprovante', type: values.attachmentKey.endsWith('.pdf') ? 'application/pdf' : 'image/*' }] : []
})
watch(attachment, (a) => (values.attachmentKey = a[0]?.key ?? ''))
watch(forAnimal, (on) => !on && (values.animalId = ''))
watch(
  () => values.paid,
  (p) => p && !values.paidAt && (values.paidAt = todayISO()),
)

const partnerOpen = ref(false)
const save = useApiMutation(
  (data: unknown) => (props.expense ? api.patch(`/finance/expenses/${props.expense.id}`, data) : api.post('/finance/expenses', data)),
  { invalidate: ['expenses', 'partners', 'animals'], success: () => (props.expense ? 'Despesa atualizada' : 'Despesa lançada'), onSuccess: () => (open.value = false) },
)
function submit() {
  const data = validate()
  if (data) save.mutate(data)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ expense ? 'Editar despesa' : 'Nova despesa' }}</DialogTitle>
        <DialogDescription>Consultas, castrações, ração, contas da ONG...</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <FormField label="Motivo" required :error="errors.description">
          <Input v-model="values.description" placeholder="Ex.: Castração da Mel, consulta, 10 sacos de ração" />
        </FormField>
        <FormField label="Categoria"><ChipGroup v-model="values.category" :options="EXPENSE_CATEGORY" size="sm" /></FormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Valor (R$)" required :error="errors.amount">
            <Input v-model="values.amount" type="number" step="0.01" min="0" inputmode="decimal" class="text-lg font-semibold" placeholder="0,00" />
          </FormField>
          <FormField label="Data prevista (vencimento)" :error="errors.dueDate"><Input v-model="values.dueDate" type="date" /></FormField>
        </div>
        <FormField label="Empresa / clínica">
          <div class="flex gap-2">
            <SelectField v-model="values.partnerId" :options="partnerOptions" nullable null-label="Sem empresa" placeholder="Selecione" class="flex-1" />
            <Button type="button" variant="outline" size="icon" aria-label="Novo parceiro" @click="partnerOpen = true"><Plus /></Button>
          </div>
        </FormField>
        <FormField label="Forma de pagamento"><ChipGroup v-model="values.paymentMethod" :options="PAYMENT_METHOD" size="sm" clearable /></FormField>

        <div class="rounded-xl border p-3">
          <label class="flex items-center justify-between text-sm font-medium">Custo de algum animal? <Switch v-model="forAnimal" /></label>
          <div v-if="forAnimal" class="mt-3">
            <AnimalPicker v-model="values.animalId" :initial="animalQ.data.value as unknown as AnimalOption" placeholder="Encontrar animal" />
          </div>
        </div>

        <div class="rounded-xl border p-3" :class="values.paid && 'border-emerald-300 bg-emerald-50/50'">
          <label class="flex items-center justify-between text-sm font-medium">Já foi paga <Switch v-model="values.paid" /></label>
          <FormField v-if="values.paid" label="Data do pagamento" class="mt-3"><Input v-model="values.paidAt" type="date" class="bg-white" /></FormField>
        </div>

        <FormField label="Nota fiscal / comprovante"><FileUpload v-model="attachment" folder="receipts" :max="1" label="Anexar nota ou recibo" /></FormField>
        <FormField label="Observações"><Textarea v-model="values.notes" rows="2" /></FormField>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar</Button>
        </DialogFooter>
      </form>
      <PartnerDialog v-model:open="partnerOpen" @saved="(p) => (values.partnerId = p.id)" />
    </DialogScrollContent>
  </Dialog>
</template>
