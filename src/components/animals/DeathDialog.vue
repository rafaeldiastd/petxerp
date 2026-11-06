<script setup lang="ts">
import { watch } from 'vue'
import { Flower2, LoaderCircle } from '@lucide/vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { todayISO } from '@/lib/format'
import { deathSchema } from '@shared/schemas'
import { DEATH_REASONS } from '@shared/constants'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ animal: { id: string; name: string } | null }>()

const { values, errors, validate, reset } = useForm(deathSchema, () => ({ date: todayISO(), reason: '', notes: '' }))
watch(open, (v) => v && reset())

const save = useApiMutation((data: unknown) => api.post(`/animals/${props.animal!.id}/death`, data), {
  invalidate: ['animals'],
  success: () => `Óbito de ${props.animal?.name} registrado`,
  onSuccess: () => (open.value = false),
})

function submit() {
  const data = validate()
  if (data) save.mutate(data)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="mb-1 flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Flower2 class="size-5" /></div>
        <DialogTitle>Declarar óbito de {{ animal?.name }}</DialogTitle>
        <DialogDescription>O animal sai da lista de ativos. O registro e o histórico são mantidos.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Data" required :error="errors.date"><Input v-model="values.date" type="date" :max="todayISO()" /></FormField>
          <FormField label="Causa" required :error="errors.reason"><SelectField v-model="values.reason" :options="DEATH_REASONS" /></FormField>
        </div>
        <FormField label="Observações" :error="errors.notes">
          <Textarea v-model="values.notes" rows="3" placeholder="Detalhes, laudo, veterinário responsável..." />
        </FormField>
        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" variant="destructive" :disabled="save.isPending.value">
            <LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Confirmar óbito
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
