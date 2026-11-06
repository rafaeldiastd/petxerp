<script setup lang="ts">
import { watch } from 'vue'
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
import { maskPhone, toForm } from '@/lib/format'
import { partnerSchema } from '@shared/schemas'
import { PARTNER_TYPE } from '@shared/constants'
import type { Partner } from '@shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ partner?: Partner | null; initialName?: string }>()
const emit = defineEmits<{ saved: [Partner] }>()

const blank = () => ({ name: '', type: 'clinic', document: '', contactName: '', phone: '', email: '', address: '', notes: '' })
const { values, errors, validate, reset } = useForm(partnerSchema, blank)
watch(open, (v) => v && reset(props.partner ? toForm(props.partner as unknown as Record<string, unknown>, blank()) : { ...blank(), name: props.initialName ?? '' }))

const save = useApiMutation(
  (data: Record<string, unknown>) =>
    props.partner ? api.patch(`/finance/partners/${props.partner.id}`, data).then(() => ({ ...props.partner, ...data }) as Partner) : api.post<Partner>('/finance/partners', data),
  { invalidate: ['partners'], success: 'Parceiro salvo', onSuccess: (p) => { emit('saved', p); open.value = false } },
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
        <DialogTitle>{{ partner ? 'Editar parceiro' : 'Novo parceiro' }}</DialogTitle>
        <DialogDescription>Clínicas veterinárias, fornecedores e empresas.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <FormField label="Tipo"><ChipGroup v-model="values.type" :options="PARTNER_TYPE" size="sm" /></FormField>
        <FormField label="Nome" required :error="errors.name"><Input v-model="values.name" /></FormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="CNPJ/CPF"><Input v-model="values.document" /></FormField>
          <FormField label="Contato"><Input v-model="values.contactName" placeholder="Nome do responsável" /></FormField>
          <FormField label="Telefone"><Input :model-value="values.phone" inputmode="tel" @update:model-value="(v) => (values.phone = maskPhone(String(v)))" /></FormField>
          <FormField label="E-mail" :error="errors.email"><Input v-model="values.email" type="email" /></FormField>
        </div>
        <FormField label="Endereço"><Input v-model="values.address" /></FormField>
        <FormField label="Observações" hint="Ex.: valores combinados, desconto para ONG"><Textarea v-model="values.notes" rows="2" /></FormField>
        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar</Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
