<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeCheck, CalendarClock, Ellipsis, Flower2, HeartHandshake, Link2, Mars, Pencil, Plus, Printer, Receipt, ShieldPlus,
  Stethoscope, Trash2, Undo2, Venus,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import PillTabs from '@/components/common/PillTabs.vue'
import Pill from '@/components/common/Pill.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DeathDialog from '@/components/animals/DeathDialog.vue'
import EventDialog from '@/components/animals/EventDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api, fileUrl } from '@/lib/api'
import { animalCode, daysUntil, fmtDate, fmtMoney, formatAddress, sinceDays } from '@/lib/format'
import { ageLabel, EVENT_ICON, EVENT_TONE, sexLabel, sizeLabel, speciesLabel } from '@/lib/animal'
import { adoptionStatusTone, animalStatusTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import {
  ADOPTABLE_STATUSES, ADOPTION_STATUS, ANIMAL_STATUS, DEATH_REASONS, EVENT_TYPE, EXPENSE_CATEGORY, INTAKE_DESTINATION,
  INTAKE_PROCEDURES, INTAKE_REASONS, INTAKE_SOURCE, TEMPERAMENT,
} from '@shared/constants'
import type { AnimalDetail, AnimalEvent, Expense } from '@shared/types'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { confirm } = useConfirm()
const id = computed(() => route.params.id as string)

const q = useApiQuery<AnimalDetail>(['animals', id], () => `/animals/${id.value}`)
const a = computed(() => q.data.value)
const events = useApiQuery<AnimalEvent[]>(['animals', id, 'events'], () => `/animals/${id.value}/events`)
const adoptions = useApiQuery<any[]>(['adoptions', 'animal', id], () => `/animals/${id.value}/adoptions`)
const expenses = useApiQuery<Expense[]>(['expenses', 'animal', id], () => `/animals/${id.value}/expenses`, undefined, {
  enabled: computed(() => session.can('finance.view')),
})

const tab = ref('overview')
const tabs = computed(() => [
  { value: 'overview', label: 'Visão geral' },
  { value: 'history', label: 'Saúde e histórico', count: events.data.value?.length ?? null },
  { value: 'adoptions', label: 'Adoções', count: adoptions.data.value?.length || null },
  { value: 'costs', label: 'Custos' },
])

const adoptable = computed(() => !!a.value && (ADOPTABLE_STATUSES as readonly string[]).includes(a.value.status))
const special = computed(() => !!(a.value?.specialCare || a.value?.diseases || a.value?.disabilities))
const subtitle = computed(() => (a.value ? [speciesLabel(a.value), a.value.breed, ageLabel(a.value), sizeLabel(a.value)].filter(Boolean).join(' · ') : ''))

const deathOpen = ref(false)
const eventOpen = ref(false)
const eventType = ref<string>('vaccine')
function newEvent(type = 'vaccine') {
  eventType.value = type
  eventOpen.value = true
}

const undoDeath = useApiMutation(() => api.post(`/animals/${id.value}/death/undo`), { invalidate: ['animals'], success: 'Óbito desfeito' })
const remove = useApiMutation(() => api.del(`/animals/${id.value}`), {
  invalidate: ['animals'],
  success: 'Registro excluído',
  onSuccess: () => router.replace({ name: 'animals' }),
})
const removeEvent = useApiMutation((eid: string) => api.del(`/animals/${id.value}/events/${eid}`), { invalidate: ['animals'], success: 'Registro removido' })

async function askRemove() {
  if (await confirm({ title: `Excluir ${a.value?.name}?`, description: 'Use apenas para cadastros feitos por engano.', confirmText: 'Excluir', destructive: true }))
    remove.mutate()
}
async function askUndoDeath() {
  if (await confirm({ title: 'Desfazer óbito?', description: 'O animal volta ao status "No abrigo".' })) undoDeath.mutate()
}
async function askRemoveEvent(e: AnimalEvent) {
  if (await confirm({ title: 'Remover este registro do histórico?', confirmText: 'Remover', destructive: true })) removeEvent.mutate(e.id)
}

const printPage = () => window.print()
const label = <T extends Record<string, string>>(dict: T, keys: string[]) => keys.map((k) => dict[k as keyof T] ?? k)
const expensesTotal = computed(() => (expenses.data.value ?? []).reduce((s, e) => s + e.amount, 0))
const dash = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
</script>

<template>
  <div>
    <PageHeader :title="a?.name ?? 'Carregando...'" :back="{ name: 'animals' }">
      <template #actions>
        <template v-if="a">
          <Button v-if="adoptable && session.can('adoptions.create')" as-child>
            <RouterLink :to="{ name: 'adoption-new', query: { animal: a.id } }"><HeartHandshake /> Declarar adoção</RouterLink>
          </Button>
          <Button v-if="session.can('animals.edit')" variant="outline" as-child>
            <RouterLink :to="{ name: 'animal-edit', params: { id: a.id } }"><Pencil /> Editar</RouterLink>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="icon" aria-label="Mais ações"><Ellipsis /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-52">
              <DropdownMenuItem v-if="session.can('animals.medical') && a.status !== 'deceased'" @click="newEvent()"><Stethoscope /> Registrar saúde</DropdownMenuItem>
              <DropdownMenuItem @click="printPage"><Printer /> Imprimir ficha</DropdownMenuItem>
              <DropdownMenuItem v-if="a.status !== 'deceased' && session.can('animals.death')" @click="deathOpen = true"><Flower2 /> Declarar óbito</DropdownMenuItem>
              <DropdownMenuItem v-if="a.status === 'deceased' && session.can('animals.death')" @click="askUndoDeath"><Undo2 /> Desfazer óbito</DropdownMenuItem>
              <template v-if="session.can('animals.delete')">
                <DropdownMenuSeparator />
                <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove"><Trash2 class="text-rose-600" /> Excluir registro</DropdownMenuItem>
              </template>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </template>
    </PageHeader>

    <div v-if="q.isLoading.value" class="grid gap-4 sm:grid-cols-[200px_1fr]">
      <div class="aspect-square animate-pulse rounded-2xl bg-muted" />
      <div class="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>

    <template v-else-if="a">
      <!-- Resumo -->
      <section class="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:p-5">
        <div class="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-muted sm:w-48">
          <img v-if="a.photoKey" :src="fileUrl(a.photoKey)!" :alt="a.name" class="size-full object-cover" :class="a.status === 'deceased' && 'grayscale'" />
          <AnimalAvatar v-else :species="a.species" class="size-full rounded-2xl" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-xl font-bold tracking-tight">{{ a.name }}</h2>
            <Mars v-if="a.sex === 'male'" class="size-5 text-sky-500" :aria-label="sexLabel(a)" />
            <Venus v-else-if="a.sex === 'female'" class="size-5 text-pink-500" :aria-label="sexLabel(a)" />
            <Pill :tone="animalStatusTone[a.status]" size="md">{{ ANIMAL_STATUS[a.status as keyof typeof ANIMAL_STATUS] }}</Pill>
          </div>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ subtitle }}</p>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <Pill v-if="a.castrated" tone="green" size="md"><BadgeCheck />Castrado</Pill>
            <Pill v-else tone="amber" size="md">Não castrado</Pill>
            <Pill v-if="a.vaccinated" tone="teal" size="md">Vacinado</Pill>
            <Pill v-if="a.dewormed" tone="teal" size="md">Vermifugado</Pill>
            <Pill v-if="special" tone="red" size="md"><ShieldPlus />Cuidados especiais</Pill>
          </div>

          <p class="mt-3 text-sm text-muted-foreground">
            Entrou em <b class="font-medium text-foreground">{{ fmtDate(a.intakeDate) }}</b> ({{ sinceDays(a.intakeDate) }}) · {{ animalCode(a.code) }}
          </p>

          <div class="mt-3 grid gap-2">
            <RouterLink
              v-if="a.status === 'adopted' && a.adopter"
              :to="{ name: 'person', params: { id: a.adopter.id } }"
              class="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700"
            >
              <HeartHandshake class="size-4 shrink-0" />
              <span>Adotado por <b>{{ a.adopter.name }}</b> em {{ fmtDate(a.adoptedAt) }}</span>
            </RouterLink>
            <div v-if="a.status === 'deceased'" class="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <Flower2 class="size-4 shrink-0" />
              <span>Óbito em {{ fmtDate(a.deathDate) }} — {{ DEATH_REASONS[a.deathReason as keyof typeof DEATH_REASONS] ?? a.deathReason }}</span>
            </div>
            <div v-if="a.bonded.length" class="flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">
              <Link2 class="size-4 shrink-0" /> Adoção conjunta com
              <RouterLink v-for="b in a.bonded" :key="b.id" :to="{ name: 'animal', params: { id: b.id } }" class="flex items-center gap-1.5 rounded-full bg-white py-0.5 pr-2.5 pl-0.5 font-medium shadow-xs">
                <AnimalAvatar :photo-key="b.photoKey" :species="b.species" size="sm" class="size-6 rounded-full" /> {{ b.name }}
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      <PillTabs v-model="tab" :items="tabs" class="mt-5 mb-4" />

      <!-- Visão geral -->
      <div v-if="tab === 'overview'" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 font-semibold">Identificação</h3>
          <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt class="text-xs text-muted-foreground">Pelagem</dt><dd>{{ dash(a.coatColor) }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">Peso</dt><dd>{{ a.weightKg ? `${a.weightKg} kg` : '—' }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">Microchip</dt><dd>{{ dash(a.microchip) }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">Nascimento (estimado)</dt><dd>{{ fmtDate(a.birthDate) }}</dd></div>
          </dl>
        </div>
        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 font-semibold">Saúde</h3>
          <dl class="grid gap-3 text-sm">
            <div v-if="a.diseases"><dt class="text-xs text-muted-foreground">Doenças</dt><dd class="whitespace-pre-line">{{ a.diseases }}</dd></div>
            <div v-if="a.disabilities"><dt class="text-xs text-muted-foreground">Deficiências</dt><dd class="whitespace-pre-line">{{ a.disabilities }}</dd></div>
            <div v-if="a.specialCare"><dt class="text-xs text-muted-foreground">Cuidados especiais</dt><dd class="whitespace-pre-line">{{ a.specialCare }}</dd></div>
            <p v-if="!special" class="text-muted-foreground">Sem doenças, deficiências ou cuidados especiais registrados.</p>
          </dl>
        </div>
        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 font-semibold">Comportamento</h3>
          <div v-if="a.temperament.length" class="mb-2 flex flex-wrap gap-1.5">
            <Pill v-for="t in a.temperament" :key="t" tone="brand">{{ TEMPERAMENT[t as keyof typeof TEMPERAMENT] }}</Pill>
          </div>
          <p class="text-sm whitespace-pre-line text-foreground/85">{{ a.behavior || (a.temperament.length ? '' : 'Sem descrição.') }}</p>
          <template v-if="a.notes">
            <h3 class="mt-4 mb-1 font-semibold">Observações</h3>
            <p class="text-sm whitespace-pre-line text-foreground/85">{{ a.notes }}</p>
          </template>
        </div>
        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 font-semibold">Boletim de entrada</h3>
          <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt class="text-xs text-muted-foreground">Através de</dt><dd>{{ a.intakeSource ? INTAKE_SOURCE[a.intakeSource as keyof typeof INTAKE_SOURCE] : '—' }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">Nº da ocorrência</dt><dd>{{ dash(a.occurrenceNumber) }}</dd></div>
            <div class="col-span-2">
              <dt class="text-xs text-muted-foreground">Onde foi recolhido</dt>
              <dd>{{ formatAddress({ street: a.intakeStreet, neighborhood: a.intakeNeighborhood, city: a.intakeCity, state: a.intakeState }) || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Denunciante / tutor</dt>
              <dd>
                <RouterLink v-if="a.reporter" :to="{ name: 'person', params: { id: a.reporter.id } }" class="font-medium text-brand-600 hover:underline">{{ a.reporter.name }}</RouterLink>
                <span v-else>—</span>
              </dd>
            </div>
            <div><dt class="text-xs text-muted-foreground">Destino</dt><dd>{{ a.intakeDestination ? INTAKE_DESTINATION[a.intakeDestination as keyof typeof INTAKE_DESTINATION] : '—' }}</dd></div>
            <div class="col-span-2">
              <dt class="mb-1 text-xs text-muted-foreground">Motivo</dt>
              <dd class="flex flex-wrap gap-1.5">
                <Pill v-for="r in label(INTAKE_REASONS, a.intakeReasons)" :key="r" tone="amber">{{ r }}</Pill>
                <span v-if="a.intakeReasonOther">{{ a.intakeReasonOther }}</span>
                <span v-if="!a.intakeReasons.length">—</span>
              </dd>
            </div>
            <div v-if="a.intakeCondition" class="col-span-2"><dt class="text-xs text-muted-foreground">Condição</dt><dd class="whitespace-pre-line">{{ a.intakeCondition }}</dd></div>
            <div v-if="a.intakeProcedures.length" class="col-span-2">
              <dt class="text-xs text-muted-foreground">Procedimentos</dt>
              <dd>{{ [...label(INTAKE_PROCEDURES, a.intakeProcedures), a.intakeProceduresOther].filter(Boolean).join(', ') }}</dd>
            </div>
            <div v-if="a.motherWithPups" class="col-span-2">
              <dt class="text-xs text-muted-foreground">Mãezinha com filhotes</dt>
              <dd>{{ a.litterMales ?? 0 }} macho(s), {{ a.litterFemales ?? 0 }} fêmea(s)</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Histórico -->
      <div v-else-if="tab === 'history'">
        <div v-if="session.can('animals.medical') && a.status !== 'deceased'" class="mb-3 flex flex-wrap gap-2">
          <Button size="sm" @click="newEvent('vaccine')"><Plus /> Vacina</Button>
          <Button size="sm" variant="outline" @click="newEvent('deworming')">Vermífugo</Button>
          <Button size="sm" variant="outline" @click="newEvent('vet_visit')">Consulta</Button>
          <Button size="sm" variant="outline" @click="newEvent('medication')">Medicação</Button>
          <Button size="sm" variant="outline" @click="newEvent('note')">Outro</Button>
        </div>
        <div class="rounded-2xl border bg-card p-4 sm:p-6">
          <ol v-if="events.data.value?.length" class="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-border">
            <li v-for="e in events.data.value" :key="e.id" class="relative flex gap-3">
              <span :class="['relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl ring-4 ring-card', EVENT_TONE[e.type] ?? 'bg-muted']">
                <component :is="EVENT_ICON[e.type]" class="size-4" />
              </span>
              <div class="min-w-0 flex-1 pt-0.5">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="font-medium">{{ e.title || EVENT_TYPE[e.type as keyof typeof EVENT_TYPE] }}</span>
                  <Pill v-if="e.nextDate" :tone="(daysUntil(e.nextDate) ?? 0) < 0 ? 'red' : 'amber'">
                    <CalendarClock /> Próxima: {{ fmtDate(e.nextDate) }}
                  </Pill>
                </div>
                <p v-if="e.description" class="mt-1 text-sm whitespace-pre-line text-foreground/80">{{ e.description }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ fmtDate(e.date) }}<template v-if="e.createdByName"> · {{ e.createdByName }}</template><template v-if="e.cost"> · {{ fmtMoney(e.cost) }}</template>
                </p>
              </div>
              <button
                v-if="session.can('animals.medical') && !['intake', 'adoption', 'return', 'death'].includes(e.type)"
                class="self-start rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-600"
                aria-label="Remover"
                @click="askRemoveEvent(e)"
              >
                <Trash2 class="size-4" />
              </button>
            </li>
          </ol>
          <p v-else class="py-8 text-center text-sm text-muted-foreground">Nenhum registro ainda.</p>
        </div>
      </div>

      <!-- Adoções -->
      <div v-else-if="tab === 'adoptions'">
        <div v-if="adoptions.data.value?.length" class="grid gap-2">
          <RouterLink
            v-for="ad in adoptions.data.value"
            :key="ad.id"
            :to="{ name: 'adoption', params: { id: ad.id } }"
            class="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 hover:border-brand-500/40"
          >
            <HeartHandshake class="size-5 text-brand-600" />
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ ad.person.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ fmtDate(ad.date) }}<template v-if="ad.returnedAt"> · devolvido em {{ fmtDate(ad.returnedAt) }}</template>
              </p>
            </div>
            <Pill :tone="adoptionStatusTone[ad.status]" size="md">{{ ADOPTION_STATUS[ad.status as keyof typeof ADOPTION_STATUS] }}</Pill>
          </RouterLink>
        </div>
        <EmptyState v-else title="Ainda sem adoções" :icon="HeartHandshake">
          <Button v-if="adoptable && session.can('adoptions.create')" as-child>
            <RouterLink :to="{ name: 'adoption-new', query: { animal: a.id } }"><HeartHandshake /> Declarar adoção</RouterLink>
          </Button>
        </EmptyState>
      </div>

      <!-- Custos -->
      <div v-else>
        <div class="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-5">
          <span class="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Receipt class="size-5" /></span>
          <div class="flex-1">
            <p class="text-sm text-muted-foreground">Custo total registrado</p>
            <p class="text-2xl font-bold">{{ fmtMoney(a.totalCost) }}</p>
          </div>
          <Button v-if="session.can('finance.manage')" variant="outline" as-child>
            <RouterLink :to="{ name: 'expenses', query: { nova: '1', animal: a.id } }"><Plus /> Lançar despesa</RouterLink>
          </Button>
        </div>
        <div v-if="session.can('finance.view') && expenses.data.value?.length" class="overflow-hidden rounded-2xl border bg-card">
          <div v-for="e in expenses.data.value" :key="e.id" class="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-0">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ e.description }}</p>
              <p class="text-xs text-muted-foreground">{{ EXPENSE_CATEGORY[e.category as keyof typeof EXPENSE_CATEGORY] }} · {{ fmtDate(e.dueDate) }}</p>
            </div>
            <Pill :tone="e.paid ? 'green' : 'amber'">{{ e.paid ? 'Paga' : 'Em aberto' }}</Pill>
            <span class="w-24 text-right font-semibold tabular-nums">{{ fmtMoney(e.amount) }}</span>
          </div>
          <div class="flex justify-between bg-muted/50 px-4 py-2.5 text-sm font-semibold"><span>Despesas vinculadas</span><span>{{ fmtMoney(expensesTotal) }}</span></div>
        </div>
        <p v-else class="text-sm text-muted-foreground">Custos de vacinas e consultas registrados no histórico também entram no total.</p>
      </div>
    </template>

    <DeathDialog v-model:open="deathOpen" :animal="a ?? null" />
    <EventDialog v-model:open="eventOpen" :animal="a ?? null" :type="eventType" />
  </div>
</template>
