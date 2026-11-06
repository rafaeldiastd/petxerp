<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle, ShieldAlert } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { maskCep, maskCpf, maskPhone, toForm } from '@/lib/format'
import { personSchema } from '@shared/schemas'
import { HOUSING, PERSON_TYPES, UF } from '@shared/constants'
import type { Person } from '@shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ person?: Person | null; initialName?: string; defaultTypes?: string[] }>()
const emit = defineEmits<{ saved: [person: Person] }>()

const blank = () => ({
  name: '', types: [] as string[], cpf: '', rg: '', birthDate: '', email: '', phone: '', whatsapp: '',
  zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
  housingType: '', housingNotes: '', restricted: false, restrictionReason: '', notes: '',
})
const { values, errors, validate, reset, setServerErrors } = useForm(personSchema, blank)

watch(open, (v) => {
  if (!v) return
  if (props.person) reset(toForm(props.person as unknown as Record<string, unknown>, blank()))
  else reset({ ...blank(), name: props.initialName ?? '', types: props.defaultTypes ?? [] })
  if (values.cpf) values.cpf = maskCpf(values.cpf)
})

// CEP → endereço (ViaCEP)
const cepLoading = ref(false)
async function lookupCep() {
  const cep = String(values.zip).replace(/\D/g, '')
  if (cep.length !== 8) return
  cepLoading.value = true
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((x) => x.json())
    if (!r.erro) {
      values.street = r.logradouro || values.street
      values.neighborhood = r.bairro || values.neighborhood
      values.city = r.localidade || values.city
      values.state = r.uf || values.state
    }
  } catch {
    /* sem rede: preenchimento manual */
  } finally {
    cepLoading.value = false
  }
}

const save = useApiMutation(
  (data: Record<string, unknown>) =>
    props.person ? api.patch(`/people/${props.person.id}`, data).then(() => ({ ...props.person, ...data }) as Person) : api.post<Person>('/people', data),
  {
    invalidate: ['people'],
    success: () => (props.person ? 'Cadastro atualizado' : 'Pessoa cadastrada'),
    onSuccess: (p) => {
      emit('saved', p)
      open.value = false
    },
    onError: setServerErrors,
  },
)

function submit() {
  const data = validate()
  if (data) save.mutate(data)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ person ? 'Editar pessoa' : 'Nova pessoa' }}</DialogTitle>
        <DialogDescription>Adotantes, tutores, denunciantes, voluntários e doadores.</DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <FormField label="Nome completo" required :error="errors.name">
          <Input v-model="values.name" autocomplete="name" />
        </FormField>
        <FormField label="Vínculo com a ONG" :error="errors.types">
          <ChipGroup v-model="values.types" :options="PERSON_TYPES" multiple size="sm" />
        </FormField>

        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="CPF" :error="errors.cpf">
            <Input :model-value="values.cpf" inputmode="numeric" placeholder="000.000.000-00" @update:model-value="(v) => (values.cpf = maskCpf(String(v)))" />
          </FormField>
          <FormField label="RG" :error="errors.rg"><Input v-model="values.rg" /></FormField>
          <FormField label="Nascimento" :error="errors.birthDate"><Input v-model="values.birthDate" type="date" /></FormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="Telefone" :error="errors.phone">
            <Input :model-value="values.phone" inputmode="tel" placeholder="(00) 00000-0000" @update:model-value="(v) => (values.phone = maskPhone(String(v)))" />
          </FormField>
          <FormField label="WhatsApp" :error="errors.whatsapp">
            <Input :model-value="values.whatsapp" inputmode="tel" placeholder="(00) 00000-0000" @update:model-value="(v) => (values.whatsapp = maskPhone(String(v)))" />
          </FormField>
          <FormField label="E-mail" :error="errors.email"><Input v-model="values.email" type="email" autocomplete="email" /></FormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-6">
          <FormField label="CEP" class="sm:col-span-2" :error="errors.zip">
            <div class="relative">
              <Input :model-value="values.zip" inputmode="numeric" placeholder="00000-000" @update:model-value="(v) => (values.zip = maskCep(String(v)))" @blur="lookupCep" />
              <LoaderCircle v-if="cepLoading" class="absolute top-2.5 right-2.5 size-4 animate-spin text-muted-foreground" />
            </div>
          </FormField>
          <FormField label="Endereço" class="sm:col-span-3" :error="errors.street"><Input v-model="values.street" autocomplete="street-address" /></FormField>
          <FormField label="Nº" :error="errors.number"><Input v-model="values.number" /></FormField>
          <FormField label="Complemento" class="sm:col-span-2"><Input v-model="values.complement" /></FormField>
          <FormField label="Bairro" class="sm:col-span-2"><Input v-model="values.neighborhood" /></FormField>
          <FormField label="Cidade" class="sm:col-span-1"><Input v-model="values.city" /></FormField>
          <FormField label="UF"><SelectField v-model="values.state" :options="UF.map((u) => ({ value: u, label: u }))" placeholder="UF" /></FormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="Moradia"><SelectField v-model="values.housingType" :options="HOUSING" nullable /></FormField>
          <FormField label="Observações da moradia" class="sm:col-span-2" hint="Ex.: apartamento telado, quintal murado">
            <Input v-model="values.housingNotes" />
          </FormField>
        </div>

        <FormField label="Observações"><Textarea v-model="values.notes" rows="2" /></FormField>

        <div class="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
          <label class="flex items-center justify-between gap-3">
            <span class="flex items-center gap-2 text-sm font-medium text-rose-700">
              <ShieldAlert class="size-4" /> Restrição para adoção
            </span>
            <Switch v-model="values.restricted" />
          </label>
          <FormField v-if="values.restricted" class="mt-3" :error="errors.restrictionReason">
            <Input v-model="values.restrictionReason" placeholder="Motivo (ex.: histórico de abandono)" class="bg-white" />
          </FormField>
        </div>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value">
            <LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
