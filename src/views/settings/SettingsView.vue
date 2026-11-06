<script setup lang="ts">
import { ref, watch } from 'vue'
import { Building2, FileSignature, LoaderCircle, RotateCcw, Scissors } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import PillTabs from '@/components/common/PillTabs.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { api } from '@/lib/api'
import { maskCep, maskPhone, toForm } from '@/lib/format'
import { useSession } from '@/stores/session'
import { orgSchema } from '@shared/schemas'
import { UF } from '@shared/constants'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { Organization, OrgSettings } from '@shared/types'

const session = useSession()
const tab = ref('org')
const org = useApiQuery<Organization & { settings: Required<OrgSettings> }>(['org'], '/org')

const blank = () => ({
  name: '', slug: '', legalName: '', document: '', email: '', phone: '', whatsapp: '', instagram: '', website: '',
  zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', logoKey: '',
})
const { values, errors, validate, reset, setServerErrors } = useForm(orgSchema, blank)
const settings = ref<Required<OrgSettings>>({ ...DEFAULT_SETTINGS })

watch(
  () => org.data.value,
  (o) => {
    if (!o) return
    reset(toForm(o as unknown as Record<string, unknown>, blank()))
    settings.value = { ...o.settings }
  },
  { immediate: true },
)

const saveOrg = useApiMutation((data: unknown) => api.patch('/org', data), {
  invalidate: ['org'],
  success: 'Dados da ONG salvos',
  onSuccess: () => session.load(true),
  onError: setServerErrors,
})
const saveSettings = useApiMutation(() => api.patch('/org/settings', settings.value), { invalidate: ['org'], success: 'Configurações de adoção salvas' })

function submitOrg() {
  const data = validate()
  if (data) saveOrg.mutate(data)
}
function restore(key: keyof OrgSettings) {
  ;(settings.value as Record<string, unknown>)[key] = DEFAULT_SETTINGS[key]
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <PageHeader title="Configurações" />

    <PillTabs v-model="tab" :items="[{ value: 'org', label: 'Dados da ONG' }, { value: 'adoption', label: 'Adoção e termos' }]" class="mb-5" />

      <div v-if="tab === 'org'">
        <form class="grid grid-cols-1 gap-5" @submit.prevent="submitOrg">
          <FormSection title="Identificação" :icon="Building2">
            <div class="grid gap-5 sm:grid-cols-[140px_1fr]">
              <ImageUpload v-model="values.logoKey" folder="logo" label="Logo" class="max-w-[140px]" />
              <div class="grid content-start gap-4 sm:grid-cols-2">
                <FormField label="Nome" required :error="errors.name"><Input v-model="values.name" /></FormField>
                <FormField label="Razão social"><Input v-model="values.legalName" placeholder="Associação ..." /></FormField>
                <FormField label="CNPJ"><Input v-model="values.document" /></FormField>
                <FormField label="Endereço da página de doação" :error="errors.slug" :hint="`/doar/${values.slug}`"><Input v-model="values.slug" /></FormField>
              </div>
            </div>
          </FormSection>
          <FormSection title="Contato e endereço" description="Aparece no rodapé do termo de adoção.">
            <div class="grid gap-4 sm:grid-cols-3">
              <FormField label="Telefone"><Input :model-value="values.phone" @update:model-value="(v) => (values.phone = maskPhone(String(v)))" /></FormField>
              <FormField label="WhatsApp"><Input :model-value="values.whatsapp" @update:model-value="(v) => (values.whatsapp = maskPhone(String(v)))" /></FormField>
              <FormField label="E-mail" :error="errors.email"><Input v-model="values.email" type="email" /></FormField>
              <FormField label="Instagram"><Input v-model="values.instagram" placeholder="@suaong" /></FormField>
              <FormField label="Site" class="sm:col-span-2"><Input v-model="values.website" /></FormField>
            </div>
            <div class="grid gap-4 sm:grid-cols-6">
              <FormField label="CEP" class="sm:col-span-2"><Input :model-value="values.zip" @update:model-value="(v) => (values.zip = maskCep(String(v)))" /></FormField>
              <FormField label="Rua" class="sm:col-span-3"><Input v-model="values.street" /></FormField>
              <FormField label="Nº"><Input v-model="values.number" /></FormField>
              <FormField label="Bairro" class="sm:col-span-2"><Input v-model="values.neighborhood" /></FormField>
              <FormField label="Cidade" class="sm:col-span-3"><Input v-model="values.city" /></FormField>
              <FormField label="UF"><SelectField v-model="values.state" :options="UF.map((u) => ({ value: u, label: u }))" placeholder="UF" /></FormField>
            </div>
          </FormSection>
          <div class="flex justify-end">
            <Button type="submit" :disabled="saveOrg.isPending.value"><LoaderCircle v-if="saveOrg.isPending.value" class="animate-spin" /> Salvar dados</Button>
          </div>
        </form>
      </div>

      <div v-else>
        <form class="grid grid-cols-1 gap-5" @submit.prevent="saveSettings.mutate()">
          <FormSection title="Castração" description="Usado para sugerir o prazo no termo de adoção." :icon="Scissors">
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField label="Filhotes: castrar com (meses de idade)"><Input v-model.number="settings.castrationMonths" type="number" min="1" max="24" /></FormField>
              <FormField label="Adultos não castrados: prazo (dias após a adoção)"><Input v-model.number="settings.castrationDaysAdult" type="number" min="1" max="365" /></FormField>
            </div>
          </FormSection>

          <FormSection title="Textos do termo" description="Use {{ong}} para inserir o nome da ONG. Cada adoção guarda uma cópia do texto aceito." :icon="FileSignature">
            <FormField label="Termo de adoção">
              <Textarea v-model="settings.adoptionTerm" rows="5" />
              <button type="button" class="justify-self-start text-xs text-muted-foreground hover:text-foreground" @click="restore('adoptionTerm')"><RotateCcw class="mr-1 inline size-3" />Restaurar padrão</button>
            </FormField>
            <FormField label="Declaração (assinada pelo adotante)">
              <Textarea v-model="settings.adoptionDeclaration" rows="4" />
              <button type="button" class="justify-self-start text-xs text-muted-foreground hover:text-foreground" @click="restore('adoptionDeclaration')"><RotateCcw class="mr-1 inline size-3" />Restaurar padrão</button>
            </FormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField label="Requisitos para adotar cães" hint="Um por linha — vira checklist na adoção"><Textarea v-model="settings.requirementsDog" rows="5" /></FormField>
              <FormField label="Requisitos para adotar gatos" hint="Um por linha"><Textarea v-model="settings.requirementsCat" rows="5" /></FormField>
            </div>
            <FormField label="Responsabilidades do adotante" hint="Um item por linha">
              <Textarea v-model="settings.adopterResponsibilities" rows="10" />
              <button type="button" class="justify-self-start text-xs text-muted-foreground hover:text-foreground" @click="restore('adopterResponsibilities')"><RotateCcw class="mr-1 inline size-3" />Restaurar padrão</button>
            </FormField>
          </FormSection>
          <div class="flex justify-end">
            <Button type="submit" :disabled="saveSettings.isPending.value"><LoaderCircle v-if="saveSettings.isPending.value" class="animate-spin" /> Salvar</Button>
          </div>
        </form>
      </div>
  </div>
</template>
