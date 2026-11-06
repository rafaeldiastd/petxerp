<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity, Cat, ClipboardList, Dog, Heart, LoaderCircle, PawPrint, Stethoscope, X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import PageHeader from '@/components/common/PageHeader.vue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import PersonPicker from '@/components/people/PersonPicker.vue'
import AnimalPicker, { type AnimalOption } from '@/components/animals/AnimalPicker.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { api } from '@/lib/api'
import { ageFrom, animalCode, todayISO, toForm } from '@/lib/format'
import { BREEDS } from '@/lib/animal'
import { animalSchema, EDITABLE_STATUSES } from '@shared/schemas'
import {
  AGE_GROUP, ANIMAL_STATUS, INTAKE_DESTINATION, INTAKE_PROCEDURES, INTAKE_REASONS, INTAKE_SOURCE, SEX, SIZE, TEMPERAMENT, UF,
} from '@shared/constants'
import type { AnimalDetail, Organization } from '@shared/types'

const route = useRoute()
const router = useRouter()
const id = computed(() => (route.params.id as string | undefined) ?? null)
const editing = computed(() => !!id.value)

const blank = () => ({
  name: '', species: '', sex: 'unknown', ageGroup: '', birthDate: '', breed: '', size: '', coatColor: '', weightKg: '',
  microchip: '', photoKey: '', status: 'sheltered', temperament: [] as string[], behavior: '', diseases: '',
  disabilities: '', specialCare: '', castrated: false, castrationDate: '', vaccinated: false, dewormed: false,
  bondedWith: [] as string[], intakeDate: todayISO(), intakeSource: '', occurrenceNumber: '', intakeStreet: '',
  intakeNeighborhood: '', intakeCity: '', intakeState: '', reporterId: '', intakeReasons: [] as string[],
  intakeReasonOther: '', intakeCondition: '', intakeProcedures: [] as string[], intakeProceduresOther: '',
  intakeDestination: 'shelter', motherWithPups: false, litterMales: '', litterFemales: '', notes: '',
})
const { values, errors, validate, reset, setServerErrors } = useForm(animalSchema, blank)

// ---------- edição: carrega a ficha ----------
const detail = useApiQuery<AnimalDetail>(['animals', id], () => `/animals/${id.value}`, undefined, { enabled: editing })
const bonded = ref<AnimalOption[]>([])
watch(
  () => detail.data.value,
  (a) => {
    if (!a) return
    reset(toForm(a as unknown as Record<string, unknown>, blank()))
    bonded.value = a.bonded as unknown as AnimalOption[]
  },
  { immediate: true },
)

// ---------- novo: preenche cidade da ONG ----------
const org = useApiQuery<Organization>(['org'], '/org', undefined, { enabled: computed(() => !editing.value) })
watch(
  () => org.data.value,
  (o) => {
    if (o && !editing.value && !values.intakeCity) {
      values.intakeCity = o.city ?? ''
      values.intakeState = o.state ?? ''
    }
  },
  { immediate: true },
)

const locked = computed(() => ['adopted', 'deceased'].includes(detail.data.value?.status ?? ''))
const statusOptions = computed(() =>
  locked.value
    ? { [values.status]: ANIMAL_STATUS[values.status as keyof typeof ANIMAL_STATUS] }
    : Object.fromEntries(EDITABLE_STATUSES.map((s) => [s, ANIMAL_STATUS[s]])),
)
const speciesOptions = [
  { value: 'dog', label: 'Cão', icon: Dog },
  { value: 'cat', label: 'Gato', icon: Cat },
  { value: 'other', label: 'Outro', icon: PawPrint },
]
const breeds = computed(() => BREEDS[values.species as keyof typeof BREEDS] ?? [])
const age = computed(() => ageFrom(values.birthDate))

// faixa etária sugerida pela data de nascimento
watch(
  () => values.birthDate,
  (d) => {
    if (!d) return
    const months = (Date.now() - new Date(`${d}T12:00:00`).getTime()) / (30.44 * 86400000)
    values.ageGroup = months < 12 ? 'puppy' : months >= 96 ? 'senior' : 'adult'
  },
)

function addBonded(a: AnimalOption | null) {
  if (!a || values.bondedWith.includes(a.id)) return
  values.bondedWith = [...values.bondedWith, a.id]
  bonded.value = [...bonded.value, a]
}
function removeBonded(aid: string) {
  values.bondedWith = values.bondedWith.filter((x: string) => x !== aid)
  bonded.value = bonded.value.filter((x) => x.id !== aid)
}
const bondPicker = ref<string | null>(null)

const save = useApiMutation(
  (data: unknown) => (editing.value ? api.patch(`/animals/${id.value}`, data) : api.post<{ id: string; name: string }>('/animals', data)),
  {
    invalidate: ['animals'],
    success: () => (editing.value ? 'Ficha atualizada' : `${values.name} cadastrado(a) com sucesso!`),
    onSuccess: (res) => {
      const target = editing.value ? id.value : (res as { id: string }).id
      router.replace({ name: 'animal', params: { id: target } })
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
  <form class="mx-auto max-w-4xl" novalidate @submit.prevent="submit">
    <PageHeader
      :title="editing ? `Editar ${detail.data.value?.name ?? ''}` : 'Novo animal'"
      :description="editing ? animalCode(detail.data.value?.code) : 'Boletim de entrada — preencha o que souber, dá para completar depois.'"
      :back="editing ? { name: 'animal', params: { id } } : { name: 'animals' }"
    />

    <div v-if="editing && detail.isLoading.value" class="grid gap-4">
      <div v-for="i in 3" :key="i" class="h-48 animate-pulse rounded-2xl border bg-card" />
    </div>

    <div v-else class="grid grid-cols-1 gap-5">
      <!-- Identificação -->
      <FormSection id="identificacao" title="Identificação" :icon="PawPrint">
        <div class="grid gap-5 sm:grid-cols-[200px_1fr]">
          <ImageUpload v-model="values.photoKey" class="mx-auto max-w-[220px] sm:max-w-none" />
          <div class="grid content-start gap-4">
            <FormField label="Nome" required :error="errors.name">
              <Input v-model="values.name" placeholder="Como o animal é chamado" class="h-10" />
            </FormField>
            <FormField label="Espécie" required :error="errors.species">
              <ChipGroup v-model="values.species" :options="speciesOptions" variant="segmented" />
            </FormField>
            <FormField label="Sexo" :error="errors.sex">
              <ChipGroup v-model="values.sex" :options="SEX" variant="segmented" />
            </FormField>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField label="Idade" :error="errors.ageGroup">
            <ChipGroup v-model="values.ageGroup" :options="AGE_GROUP" variant="segmented" clearable />
          </FormField>
          <FormField label="Nascimento (estimado)" :error="errors.birthDate" :hint="age ? `≈ ${age}` : 'Usado para calcular a idade e a castração'">
            <Input v-model="values.birthDate" type="date" :max="todayISO()" />
          </FormField>
          <FormField label="Raça" :error="errors.breed">
            <Input v-model="values.breed" list="breeds" placeholder="SRD" />
            <datalist id="breeds"><option v-for="b in breeds" :key="b" :value="b" /></datalist>
          </FormField>
          <FormField label="Porte" :error="errors.size">
            <ChipGroup v-model="values.size" :options="SIZE" variant="segmented" clearable />
          </FormField>
          <FormField label="Cor / pelagem" :error="errors.coatColor">
            <Input v-model="values.coatColor" placeholder="Ex.: caramelo, tigrado, preto e branco" />
          </FormField>
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Peso (kg)" :error="errors.weightKg">
              <Input v-model="values.weightKg" type="number" step="0.01" min="0" inputmode="decimal" />
            </FormField>
            <FormField label="Microchip" :error="errors.microchip"><Input v-model="values.microchip" inputmode="numeric" /></FormField>
          </div>
        </div>
      </FormSection>

      <!-- Saúde -->
      <FormSection id="saude" title="Saúde" description="Para vacinas e consultas com data, use o histórico na ficha." :icon="Stethoscope">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border p-3">
            <label class="flex items-center justify-between text-sm font-medium">Castrado <Switch v-model="values.castrated" /></label>
            <Input v-if="values.castrated" v-model="values.castrationDate" type="date" class="mt-2 h-8" aria-label="Data da castração" />
          </div>
          <label class="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">Vacinado <Switch v-model="values.vaccinated" /></label>
          <label class="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">Vermifugado <Switch v-model="values.dewormed" /></label>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="Doenças" :error="errors.diseases"><Textarea v-model="values.diseases" rows="3" placeholder="Ex.: FIV+, erliquiose..." /></FormField>
          <FormField label="Deficiências" :error="errors.disabilities"><Textarea v-model="values.disabilities" rows="3" placeholder="Ex.: cego de um olho" /></FormField>
          <FormField label="Cuidados especiais" :error="errors.specialCare"><Textarea v-model="values.specialCare" rows="3" placeholder="Medicação contínua, dieta..." /></FormField>
        </div>
      </FormSection>

      <!-- Comportamento -->
      <FormSection id="comportamento" title="Comportamento" :icon="Heart">
        <FormField label="Temperamento">
          <ChipGroup v-model="values.temperament" :options="TEMPERAMENT" multiple size="sm" />
        </FormField>
        <FormField label="Descrição do comportamento" :error="errors.behavior">
          <Textarea v-model="values.behavior" rows="3" placeholder="Como reage a pessoas, outros animais, passeios..." />
        </FormField>
      </FormSection>

      <!-- Boletim de entrada -->
      <FormSection id="entrada" title="Boletim de entrada" description="Como e onde o animal chegou à ONG." :icon="ClipboardList">
        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="Data do atendimento" required :error="errors.intakeDate">
            <Input v-model="values.intakeDate" type="date" :max="todayISO()" />
          </FormField>
          <FormField label="Nº da ocorrência" :error="errors.occurrenceNumber"><Input v-model="values.occurrenceNumber" /></FormField>
        </div>
        <FormField label="Entrada do animal através de">
          <ChipGroup v-model="values.intakeSource" :options="INTAKE_SOURCE" size="sm" clearable />
        </FormField>

        <div class="grid gap-4 sm:grid-cols-6">
          <FormField label="Onde foi recolhido (rua/avenida)" class="sm:col-span-6"><Input v-model="values.intakeStreet" /></FormField>
          <FormField label="Bairro" class="sm:col-span-2"><Input v-model="values.intakeNeighborhood" /></FormField>
          <FormField label="Município" class="sm:col-span-3"><Input v-model="values.intakeCity" /></FormField>
          <FormField label="UF"><SelectField v-model="values.intakeState" :options="UF.map((u) => ({ value: u, label: u }))" placeholder="UF" /></FormField>
        </div>

        <FormField label="Denunciante ou tutor" hint="Busque ou cadastre na hora (nome, CPF, telefone)">
          <PersonPicker v-model="values.reporterId" :initial="detail.data.value?.reporter" :default-types="['reporter']" />
        </FormField>

        <FormField label="Motivo do recolhimento">
          <ChipGroup v-model="values.intakeReasons" :options="INTAKE_REASONS" multiple size="sm" />
        </FormField>
        <FormField v-if="values.intakeReasons.includes('other')" label="Outro motivo"><Input v-model="values.intakeReasonOther" /></FormField>

        <FormField label="Condição do animal" :error="errors.intakeCondition">
          <Textarea v-model="values.intakeCondition" rows="2" placeholder="Estado geral na chegada" />
        </FormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField label="Procedimentos">
            <ChipGroup v-model="values.intakeProcedures" :options="INTAKE_PROCEDURES" multiple size="sm" />
            <Input v-if="values.intakeProcedures.includes('other')" v-model="values.intakeProceduresOther" class="mt-2" placeholder="Quais?" />
          </FormField>
          <FormField label="Destino do animal">
            <ChipGroup v-model="values.intakeDestination" :options="INTAKE_DESTINATION" size="sm" clearable />
          </FormField>
        </div>

        <div class="rounded-xl border p-3">
          <label class="flex items-center justify-between text-sm font-medium">Mãezinha com filhotes <Switch v-model="values.motherWithPups" /></label>
          <div v-if="values.motherWithPups" class="mt-3 grid grid-cols-2 gap-3">
            <FormField label="Qtd. machos"><Input v-model="values.litterMales" type="number" min="0" inputmode="numeric" /></FormField>
            <FormField label="Qtd. fêmeas"><Input v-model="values.litterFemales" type="number" min="0" inputmode="numeric" /></FormField>
          </div>
        </div>
      </FormSection>

      <!-- Situação -->
      <FormSection id="situacao" title="Situação" :icon="Activity">
        <FormField label="Status" :hint="locked ? 'Adoção e óbito são alterados pelas ações da ficha' : undefined">
          <ChipGroup v-model="values.status" :options="statusOptions" size="sm" />
        </FormField>

        <FormField label="Adoção conjunta" hint="Animais que devem ser adotados juntos (irmãos, inseparáveis...)">
          <div class="grid gap-2">
            <div v-if="bonded.length" class="flex flex-wrap gap-2">
              <span v-for="b in bonded" :key="b.id" class="flex items-center gap-2 rounded-full border bg-violet-50 py-1 pr-1.5 pl-1 text-sm">
                <AnimalAvatar :photo-key="b.photoKey" :species="b.species" size="sm" class="size-6 rounded-full" />
                {{ b.name }}
                <button type="button" class="rounded-full p-0.5 hover:bg-violet-100" @click="removeBonded(b.id)"><X class="size-3.5" /></button>
              </span>
            </div>
            <AnimalPicker v-model="bondPicker" status="active" :exclude="id ?? undefined" placeholder="Adicionar animal..." @change="(a) => { addBonded(a); bondPicker = null }" />
          </div>
        </FormField>

        <FormField label="Observações gerais"><Textarea v-model="values.notes" rows="3" /></FormField>
      </FormSection>
    </div>

    <!-- Ações fixas -->
    <div class="sticky bottom-20 z-20 mt-6 md:bottom-4">
      <div class="flex items-center justify-end gap-2 rounded-2xl border bg-card/95 p-2.5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <p v-if="Object.keys(errors).length" class="mr-auto pl-2 text-sm font-medium text-destructive">Verifique os campos destacados</p>
        <Button type="button" variant="ghost" @click="router.back()">Cancelar</Button>
        <Button type="submit" :disabled="save.isPending.value" class="min-w-32">
          <LoaderCircle v-if="save.isPending.value" class="animate-spin" />
          {{ editing ? 'Salvar alterações' : 'Cadastrar animal' }}
        </Button>
      </div>
    </div>
  </form>
</template>
