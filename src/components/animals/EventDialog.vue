<script setup lang="ts">
import { computed, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FormField from '@/components/common/FormField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { todayISO } from '@/lib/format'
import { EVENT_ICON } from '@/lib/animal'
import { eventSchema } from '@shared/schemas'
import { EVENT_TYPE, MANUAL_EVENT_TYPES } from '@shared/constants'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ animal: { id: string; name: string } | null; type?: string }>()

const { values, errors, validate, reset } = useForm(eventSchema, () => ({
  type: props.type ?? 'vaccine', date: todayISO(), title: '', description: '', nextDate: '', cost: '', weightKg: '',
}))
watch(open, (v) => v && reset())

const typeOptions = MANUAL_EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE[t], icon: EVENT_ICON[t] }))
const hasNext = computed(() => ['vaccine', 'deworming', 'medication', 'vet_visit', 'exam', 'followup'].includes(values.type))
const placeholder = computed(
  () =>
    ({
      vaccine: 'Ex.: V10 — 1ª dose / Antirrábica',
      deworming: 'Ex.: Drontal 1 comprimido',
      castration: 'Ex.: Castração — Clínica Parceira',
      vet_visit: 'Ex.: Consulta de rotina',
      exam: 'Ex.: Hemograma, FIV/FeLV',
      medication: 'Ex.: Antibiótico 7 dias',
      surgery: 'Ex.: Retirada de tumor',
      followup: 'Ex.: Visita ao adotante',
      note: 'Título da anotação',
    })[values.type as string] ?? '',
)

const save = useApiMutation((data: unknown) => api.post(`/animals/${props.animal!.id}/events`, data), {
  invalidate: ['animals', 'adoptions'],
  success: 'Registro adicionado ao histórico',
  onSuccess: () => (open.value = false),
})
function submit() {
  const data = validate()
  if (data) save.mutate(data)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Registrar na ficha de {{ animal?.name }}</DialogTitle>
        <DialogDescription>Vacinas, vermífugos e castração atualizam a ficha automaticamente.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <FormField label="Tipo">
          <ChipGroup v-model="values.type" :options="typeOptions" size="sm" />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Data" required :error="errors.date"><Input v-model="values.date" type="date" /></FormField>
          <FormField v-if="values.type === 'weight'" label="Peso (kg)" required :error="errors.weightKg">
            <Input v-model="values.weightKg" type="number" step="0.01" min="0" inputmode="decimal" />
          </FormField>
          <FormField v-else-if="hasNext" label="Próxima dose / retorno" :error="errors.nextDate" hint="Gera alerta no painel">
            <Input v-model="values.nextDate" type="date" :min="values.date" />
          </FormField>
        </div>
        <FormField v-if="values.type !== 'weight'" label="Descrição curta" :error="errors.title">
          <Input v-model="values.title" :placeholder="placeholder" />
        </FormField>
        <FormField label="Detalhes" :error="errors.description">
          <Textarea v-model="values.description" rows="3" placeholder="Dosagem, veterinário, observações..." />
        </FormField>
        <FormField label="Custo (R$)" hint="Opcional — entra no custo total do animal" :error="errors.cost">
          <Input v-model="values.cost" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0,00" />
        </FormField>
        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar</Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
