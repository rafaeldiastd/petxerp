<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, ArrowRight, Check, ClipboardCheck, FileSignature, HeartHandshake, Link2, LoaderCircle, PawPrint, Pencil, Plus,
  ShieldAlert, TriangleAlert, UserRound, X,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import PageHeader from '@/components/common/PageHeader.vue'
import FormField from '@/components/common/FormField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import FileUpload from '@/components/common/FileUpload.vue'
import Pill from '@/components/common/Pill.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import AnimalPicker from '@/components/animals/AnimalPicker.vue'
import PersonPicker from '@/components/people/PersonPicker.vue'
import PersonFormDialog from '@/components/people/PersonFormDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { api } from '@/lib/api'
import { addDays, addMonths, fmtDate, formatAddress, maskCpf, todayISO } from '@/lib/format'
import { ageLabel, sexLabel, speciesLabel } from '@/lib/animal'
import { cn } from '@/lib/utils'
import { adoptionSchema, fieldErrors } from '@shared/schemas'
import { ADOPTABLE_STATUSES, ADOPTION_LOCATION } from '@shared/constants'
import { fillOrg, lines } from '@shared/defaults'
import type { AnimalDetail, Organization, OrgSettings, Person } from '@shared/types'

const route = useRoute()
const router = useRouter()

const step = ref(0)
const steps = [
  { title: 'Animais', icon: PawPrint },
  { title: 'Adotante', icon: UserRound },
  { title: 'Requisitos', icon: ClipboardCheck },
  { title: 'Termo', icon: FileSignature },
]

const form = ref({
  personId: '',
  date: todayISO(),
  location: 'shelter',
  requirements: {} as Record<string, boolean>,
  documents: [] as { key: string; name: string; type: string; label?: string }[],
  termAccepted: false,
  notes: '',
})
const errors = ref<Record<string, string>>({})

const org = useApiQuery<Organization & { settings: Required<OrgSettings> }>(['org'], '/org')
const settings = computed(() => org.data.value?.settings)

// ---------- animais (um ou vários) ----------
const selected = ref<AnimalDetail[]>([])
const adding = ref(false)
const picker = ref<string | null>(null)
const isAdoptable = (status: string) => (ADOPTABLE_STATUSES as readonly string[]).includes(status)

async function addAnimal(id: string | null | undefined) {
  if (!id || selected.value.some((a) => a.id === id)) return
  adding.value = true
  try {
    const a = await api.get<AnimalDetail>(`/animals/${id}`)
    if (!isAdoptable(a.status)) toast.error(`${a.name} não está disponível para adoção`)
    else selected.value = [...selected.value, a]
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    adding.value = false
    picker.value = null
  }
}
function removeAnimal(id: string) {
  selected.value = selected.value.filter((a) => a.id !== id)
}
onMounted(() => {
  const pre = [route.query.animal, route.query.animals].filter((v): v is string => typeof v === 'string').flatMap((v) => v.split(','))
  pre.forEach(addAnimal)
})

/** Irmãos/inseparáveis (adoção conjunta) que ainda não estão na adoção */
const bondedSuggestions = computed(() => {
  const ids = new Set(selected.value.map((a) => a.id))
  const out = new Map<string, { id: string; name: string; of: string }>()
  for (const a of selected.value) {
    for (const b of a.bonded) if (!ids.has(b.id) && isAdoptable(b.status)) out.set(b.id, { id: b.id, name: b.name, of: a.name })
  }
  return [...out.values()]
})
const names = computed(() => selected.value.map((a) => a.name).join(', ').replace(/, ([^,]*)$/, ' e $1'))

// ---------- adotante ----------
const person = useApiQuery<Person>(['people', computed(() => form.value.personId)], () => `/people/${form.value.personId}`, undefined, {
  enabled: computed(() => !!form.value.personId),
})
const p = computed(() => (form.value.personId ? person.data.value : undefined))
const missing = computed(() => {
  if (!p.value) return []
  const out: string[] = []
  if (!p.value.cpf) out.push('CPF')
  if (!p.value.rg) out.push('RG')
  if (!p.value.street) out.push('endereço')
  if (!p.value.phone && !p.value.whatsapp) out.push('telefone')
  return out
})
const editPerson = ref(false)

// ---------- requisitos: por espécie, das configurações da ONG ----------
const requirementGroups = computed(() => {
  if (!settings.value) return []
  const species = new Set(selected.value.map((a) => a.species))
  const groups = []
  if (species.has('dog') || species.has('other')) groups.push({ title: 'Para adotar caninos', items: lines(settings.value.requirementsDog) })
  if (species.has('cat')) groups.push({ title: 'Para adotar felinos', items: lines(settings.value.requirementsCat) })
  return groups
})
watch(requirementGroups, (groups) => {
  const next: Record<string, boolean> = {}
  for (const r of groups.flatMap((g) => g.items)) next[r] = form.value.requirements[r] ?? false
  form.value.requirements = next
})

// ---------- castração: prazo sugerido por animal ----------
const deadlines = ref<Record<string, string>>({})
const edited = new Set<string>()
function suggest(a: AnimalDetail) {
  const s = settings.value
  if (a.castrated || !s) return ''
  if (a.birthDate && a.ageGroup === 'puppy') {
    const d = addMonths(a.birthDate, s.castrationMonths)
    return d > form.value.date ? d : addDays(form.value.date, 15)
  }
  if (a.ageGroup === 'puppy') return addMonths(form.value.date, Math.max(1, s.castrationMonths - 3))
  return addDays(form.value.date, s.castrationDaysAdult)
}
watch(
  [selected, () => form.value.date, settings],
  () => {
    const next: Record<string, string> = {}
    for (const a of selected.value) next[a.id] = edited.has(a.id) ? (deadlines.value[a.id] ?? '') : suggest(a)
    deadlines.value = next
  },
  { immediate: true, deep: true },
)
function setDeadline(id: string, v: string) {
  edited.add(id)
  deadlines.value = { ...deadlines.value, [id]: v }
}

const orgName = computed(() => org.data.value?.name ?? 'ONG')
const termText = computed(() => fillOrg(settings.value?.adoptionTerm ?? '', orgName.value))
const declaration = computed(() => fillOrg(settings.value?.adoptionDeclaration ?? '', orgName.value))
const responsibilities = computed(() => lines(fillOrg(settings.value?.adopterResponsibilities ?? '', orgName.value)))

// ---------- navegação ----------
function check(n: number) {
  errors.value = {}
  if (n === 0 && !selected.value.length) errors.value.animals = 'Selecione ao menos um animal'
  if (n === 1) {
    if (!form.value.personId) errors.value.personId = 'Selecione ou cadastre o adotante'
    else if (p.value?.restricted) errors.value.personId = 'Esta pessoa tem restrição para adoção'
  }
  if (n === 2 && !form.value.date) errors.value.date = 'Informe a data'
  return !Object.keys(errors.value).length
}
function next() {
  if (check(step.value)) step.value++
}
function goTo(i: number) {
  if (i < step.value) step.value = i
  else if (i === step.value + 1) next()
}

const save = useApiMutation((data: unknown) => api.post<{ ids: string[]; groupId: string | null }>('/adoptions', data), {
  invalidate: ['adoptions', 'animals', 'people'],
  success: () => `Adoção de ${names.value} registrada! 🎉`,
  onSuccess: (res) => router.replace({ name: 'adoption', params: { id: res.ids[0] }, query: { nova: '1' } }),
})
function submit() {
  const payload = {
    ...form.value,
    animals: selected.value.map((a) => ({ animalId: a.id, castrationDeadline: a.castrated ? '' : deadlines.value[a.id] })),
  }
  const res = adoptionSchema.safeParse(payload)
  if (!res.success) {
    errors.value = fieldErrors(res.error)
    return
  }
  save.mutate(res.data)
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader title="Nova adoção" :back="{ name: 'adoptions' }" />

    <!-- Stepper -->
    <ol class="mb-5 grid grid-cols-4 gap-1.5 sm:gap-3">
      <li v-for="(s, i) in steps" :key="s.title">
        <button
          type="button"
          class="flex w-full flex-col items-center gap-1.5 rounded-xl p-2 text-center sm:flex-row sm:text-left"
          :class="i <= step + 1 ? 'cursor-pointer' : 'cursor-default'"
          @click="goTo(i)"
        >
          <span
            :class="
              cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl border-2 transition',
                i < step && 'border-brand-600 bg-brand-600 text-white',
                i === step && 'border-brand-600 bg-brand-50 text-brand-700',
                i > step && 'border-border bg-card text-muted-foreground',
              )
            "
          >
            <Check v-if="i < step" class="size-4" />
            <component :is="s.icon" v-else class="size-4" />
          </span>
          <span class="text-xs font-medium sm:text-sm" :class="i === step ? 'text-foreground' : 'text-muted-foreground'">{{ s.title }}</span>
        </button>
      </li>
    </ol>

    <div class="rounded-2xl border bg-card p-4 sm:p-6">
      <!-- 1. Animais -->
      <section v-if="step === 0" class="grid grid-cols-1 gap-4" :data-error="!!errors.animals || undefined">
        <p class="text-sm font-medium">Quais animais estão sendo adotados?</p>

        <div v-if="selected.length" class="grid gap-2">
          <div v-for="a in selected" :key="a.id" class="flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5">
            <AnimalAvatar :photo-key="a.photoKey" :species="a.species" size="lg" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ a.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ [speciesLabel(a), sexLabel(a), ageLabel(a), a.breed].filter(Boolean).join(' · ') }}</p>
              <div class="mt-1.5 flex flex-wrap gap-1">
                <Pill :tone="a.castrated ? 'green' : 'amber'">{{ a.castrated ? 'Castrado' : 'Não castrado' }}</Pill>
                <Pill v-if="a.vaccinated" tone="teal">Vacinado</Pill>
                <Pill v-if="a.specialCare || a.diseases" tone="red">Cuidados especiais</Pill>
              </div>
            </div>
            <button type="button" class="rounded-lg p-2 text-muted-foreground hover:bg-background hover:text-rose-600" :aria-label="`Remover ${a.name}`" @click="removeAnimal(a.id)">
              <X class="size-4" />
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
          <AnimalPicker
            v-model="picker"
            status="sheltered,available,treatment,foster"
            only-adoptable
            :placeholder="selected.length ? 'Adicionar outro animal...' : 'Buscar animal por nome, raça ou microchip'"
            :invalid="!!errors.animals"
            @change="(a) => addAnimal(a?.id)"
          />
          </div>
          <LoaderCircle v-if="adding" class="size-4 animate-spin text-muted-foreground" />
        </div>
        <p v-if="errors.animals" class="-mt-2 text-xs font-medium text-destructive">{{ errors.animals }}</p>

        <div v-if="bondedSuggestions.length" class="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
          <Link2 class="size-4 shrink-0" />
          <span>Adoção conjunta — adicionar também:</span>
          <Button v-for="b in bondedSuggestions" :key="b.id" size="xs" variant="outline" class="bg-white" @click="addAnimal(b.id)">
            <Plus /> {{ b.name }}
          </Button>
        </div>
        <p v-if="selected.length > 1" class="text-xs text-muted-foreground">Será gerado um termo de adoção para cada animal.</p>
      </section>

      <!-- 2. Adotante -->
      <section v-else-if="step === 1" class="grid grid-cols-1 gap-4">
        <FormField label="Quem está adotando?" :error="errors.personId">
          <PersonPicker v-model="form.personId" :initial="p" :default-types="['adopter']" block-restricted :invalid="!!errors.personId" />
        </FormField>
        <div v-if="p" class="rounded-2xl bg-muted/50 p-4 text-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold">{{ p.name }}</p>
              <p class="text-muted-foreground">{{ [p.cpf && `CPF ${maskCpf(p.cpf)}`, p.rg && `RG ${p.rg}`].filter(Boolean).join(' · ') || 'Sem documentos' }}</p>
              <p class="text-muted-foreground">{{ formatAddress(p) || 'Sem endereço' }}</p>
              <p class="text-muted-foreground">{{ [p.phone, p.whatsapp, p.email].filter(Boolean).join(' · ') }}</p>
            </div>
            <Button size="sm" variant="outline" @click="editPerson = true"><Pencil /> Editar</Button>
          </div>
          <p v-if="p.restricted" class="mt-3 flex items-center gap-2 font-medium text-rose-700"><ShieldAlert class="size-4" /> Restrição: {{ p.restrictionReason }}</p>
          <p v-else-if="missing.length" class="mt-3 flex items-center gap-2 text-amber-700">
            <TriangleAlert class="size-4" /> Faltam dados para o termo: {{ missing.join(', ') }}
          </p>
        </div>
        <PersonFormDialog v-if="p" v-model:open="editPerson" :person="p" />
      </section>

      <!-- 3. Requisitos -->
      <section v-else-if="step === 2" class="grid grid-cols-1 gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField label="Data da adoção" :error="errors.date"><Input v-model="form.date" type="date" :max="todayISO()" /></FormField>
          <FormField label="Local"><ChipGroup v-model="form.location" :options="ADOPTION_LOCATION" size="sm" /></FormField>
        </div>
        <div v-for="g in requirementGroups" :key="g.title">
          <p class="mb-2 text-sm font-medium">{{ g.title }} <span class="text-muted-foreground">({{ g.items.filter((r) => form.requirements[r]).length }}/{{ g.items.length }})</span></p>
          <div class="grid gap-2">
            <label
              v-for="r in g.items"
              :key="r"
              class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition"
              :class="form.requirements[r] ? 'border-emerald-300 bg-emerald-50/60' : 'hover:bg-muted/50'"
            >
              <Checkbox v-model="form.requirements[r]" class="mt-0.5" />
              {{ r }}
            </label>
          </div>
        </div>
        <FormField label="Documentos e fotos" hint="Comprovante de residência, documento com foto, fotos do local...">
          <FileUpload v-model="form.documents" folder="adoptions" />
        </FormField>
      </section>

      <!-- 4. Termo -->
      <section v-else class="grid grid-cols-1 gap-5">
        <div>
          <p class="mb-2 text-sm font-medium">Castrar até <span class="font-normal text-muted-foreground">(por conta do adotante)</span></p>
          <div class="grid gap-2">
            <div v-for="a in selected" :key="a.id" class="flex items-center gap-3 rounded-xl border p-2.5">
              <AnimalAvatar :photo-key="a.photoKey" :species="a.species" size="sm" />
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ a.name }}</span>
              <Pill v-if="a.castrated" tone="green">Já castrado</Pill>
              <Input v-else :model-value="deadlines[a.id]" type="date" class="w-40" @update:model-value="(v) => setDeadline(a.id, String(v))" />
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
          <b>{{ names }}</b> → <b>{{ p?.name }}</b>
          <span class="text-muted-foreground"> · {{ fmtDate(form.date) }} · {{ ADOPTION_LOCATION[form.location as keyof typeof ADOPTION_LOCATION] }}</span>
        </div>

        <div class="max-h-72 overflow-y-auto rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed">
          <p class="mb-2 font-semibold">Termo de adoção</p>
          <p class="whitespace-pre-line">{{ termText }}</p>
          <p class="mt-4 mb-2 font-semibold">Declaração</p>
          <p class="whitespace-pre-line">{{ declaration }}</p>
          <p class="mt-4 mb-2 font-semibold">Responsabilidades do adotante</p>
          <ul class="list-disc space-y-1 pl-5">
            <li v-for="r in responsibilities" :key="r">{{ r }}</li>
          </ul>
        </div>

        <label
          class="flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 text-sm transition"
          :class="form.termAccepted ? 'border-brand-600 bg-brand-50' : errors.termAccepted ? 'border-destructive' : 'border-dashed'"
          :data-error="!!errors.termAccepted || undefined"
        >
          <Checkbox v-model="form.termAccepted" class="mt-0.5" />
          <span>
            <b>{{ p?.name ?? 'O adotante' }}</b> leu, está ciente e de acordo com o termo, a declaração e as responsabilidades acima.
            <span class="block text-xs text-muted-foreground">
              Depois de salvar, imprima {{ selected.length > 1 ? `os ${selected.length} termos` : 'o termo' }} para assinatura.
            </span>
          </span>
        </label>
        <p v-if="errors.termAccepted" class="-mt-3 text-xs font-medium text-destructive">{{ errors.termAccepted }}</p>

        <FormField label="Observações"><Textarea v-model="form.notes" rows="2" /></FormField>
      </section>
    </div>

    <!-- Navegação -->
    <div class="sticky bottom-20 z-20 mt-5 md:bottom-4">
      <div class="flex items-center gap-2 rounded-2xl border bg-card/95 p-2.5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <Button v-if="step > 0" variant="ghost" @click="step--"><ArrowLeft /> Voltar</Button>
        <span class="ml-auto text-xs text-muted-foreground sm:text-sm">Passo {{ step + 1 }} de 4</span>
        <Button v-if="step < 3" class="min-w-32" @click="next">Continuar <ArrowRight /></Button>
        <Button v-else class="min-w-40" :disabled="save.isPending.value" @click="submit">
          <LoaderCircle v-if="save.isPending.value" class="animate-spin" />
          <HeartHandshake v-else /> Concluir adoção{{ selected.length > 1 ? ` (${selected.length})` : '' }}
        </Button>
      </div>
    </div>
  </div>
</template>
