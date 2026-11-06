<script setup lang="ts">
import { watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import PersonPicker from '@/components/people/PersonPicker.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { todayISO } from '@/lib/format'
import { donationSchema } from '@shared/schemas'

const open = defineModel<boolean>('open', { default: false })
const { values, errors, validate, reset } = useForm(donationSchema, () => ({
  personId: '', donorName: '', donorEmail: '', amount: '', method: 'pix', status: 'paid', date: todayISO(), notes: '',
}))
watch(open, (v) => v && reset())

const methods = { pix: 'Pix', cash: 'Dinheiro', transfer: 'Transferência' }
const save = useApiMutation((data: unknown) => api.post('/donations', data), {
  invalidate: ['donations', 'people'],
  success: 'Doação registrada. Obrigado! 💜',
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
        <DialogTitle>Registrar doação</DialogTitle>
        <DialogDescription>Pix direto, dinheiro ou transferência recebidos pela ONG.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Valor (R$)" required :error="errors.amount">
            <Input v-model="values.amount" type="number" step="0.01" min="0" inputmode="decimal" class="text-lg font-semibold" placeholder="0,00" />
          </FormField>
          <FormField label="Data" :error="errors.date"><Input v-model="values.date" type="date" :max="todayISO()" /></FormField>
        </div>
        <FormField label="Forma"><ChipGroup v-model="values.method" :options="methods" variant="segmented" /></FormField>
        <FormField label="Doador cadastrado" hint="Opcional — vincula ao histórico da pessoa">
          <PersonPicker v-model="values.personId" :default-types="['donor']" />
        </FormField>
        <FormField v-if="!values.personId" label="Nome do doador (sem cadastro)"><Input v-model="values.donorName" placeholder="Anônimo" /></FormField>
        <FormField label="Observação"><Input v-model="values.notes" placeholder="Ex.: campanha de castração" /></FormField>
        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Registrar</Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
