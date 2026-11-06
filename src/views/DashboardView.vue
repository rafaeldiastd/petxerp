<script setup lang="ts">
import { computed } from 'vue'
import { Bone, CalendarClock, ChevronRight, HeartHandshake, PackageX, PawPrint, Scissors, TriangleAlert, Wallet } from '@lucide/vue'
import StatCard from '@/components/common/StatCard.vue'
import Pill from '@/components/common/Pill.vue'
import MonthlyChart from '@/components/dashboard/MonthlyChart.vue'
import { useApiQuery } from '@/composables/useApi'
import { daysUntil, fmtDate, fmtMoney, fmtNumber, todayISO } from '@/lib/format'
import { EVENT_ICON, EVENT_TONE } from '@/lib/animal'
import { QUICK_ACTIONS } from '@/lib/quick-actions'
import { useSession } from '@/stores/session'
import { EVENT_TYPE } from '@shared/constants'
import type { DashboardData } from '@shared/types'

const session = useSession()
const canSee = computed(() => session.can('animals.view', 'stock.view', 'finance.view'))
const q = useApiQuery<DashboardData>(['dashboard'], '/dashboard', undefined, { enabled: canSee })
const d = computed(() => q.data.value)
const loading = computed(() => q.isLoading.value)

const firstName = computed(() => session.user?.name?.split(' ')[0] ?? '')
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
})
const actions = computed(() => QUICK_ACTIONS.filter((a) => session.can(...a.perm)))
const pl = (n = 0, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// ração: o menor número de dias entre as espécies com consumo configurado
const foodDays = computed(() => {
  const dl = d.value?.food.daysLeft
  if (!dl) return null
  const vals = [dl.dog, dl.cat].filter((v): v is number => v !== null)
  return vals.length ? Math.min(...vals) : null
})
const foodTone = computed(() => (foodDays.value === null ? 'default' : foodDays.value < 7 ? 'bad' : foodDays.value < 15 ? 'warn' : 'good'))
const foodHint = computed(() => {
  const dl = d.value?.food.daysLeft
  if (!dl || (dl.dog === null && dl.cat === null)) return 'Informe o consumo diário'
  return [dl.dog !== null && `cães ${dl.dog}d`, dl.cat !== null && `gatos ${dl.cat}d`].filter(Boolean).join(' · ')
})

const alertsCount = computed(() => (d.value ? d.value.alerts.castrations.length + d.value.alerts.upcoming.length + d.value.alerts.lowStock.length : 0))
</script>

<template>
  <div class="grid grid-cols-1 gap-5 sm:gap-6">
    <h1 class="text-2xl font-bold tracking-tight">{{ greeting }}, {{ firstName }} 👋</h1>

    <!-- Atalhos -->
    <section v-if="actions.length" class="grid grid-cols-3 gap-2 sm:grid-cols-6">
      <RouterLink
        v-for="a in actions"
        :key="a.title"
        :to="a.to"
        class="flex min-w-0 flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-3 text-center transition hover:border-brand-500/40 hover:shadow-sm"
      >
        <span :class="['flex size-9 items-center justify-center rounded-xl', a.tone]"><component :is="a.icon" class="size-[18px]" /></span>
        <span class="w-full truncate text-xs font-medium sm:text-[13px]">{{ a.title }}</span>
      </RouterLink>
    </section>

    <template v-if="canSee">
      <!-- Indicadores -->
      <section class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          v-if="session.can('animals.view')"
          label="Sob cuidado"
          :value="d?.animals.active ?? 0"
          :icon="PawPrint"
          :to="{ name: 'animals', query: { status: 'sheltered,available,treatment,foster' } }"
          :loading="loading"
          :hint="`${d?.animals.bySpecies.dog ?? 0} cães · ${d?.animals.bySpecies.cat ?? 0} gatos`"
        />
        <StatCard
          v-if="session.can('animals.view')"
          label="Para adoção"
          :value="d?.animals.available ?? 0"
          :icon="HeartHandshake"
          :to="{ name: 'animals', query: { status: 'available' } }"
          :loading="loading"
          :hint="`${pl(d?.animals.adoptedThisMonth, 'adoção', 'adoções')} no mês`"
        />
        <StatCard
          v-if="session.can('stock.view')"
          label="Ração"
          :value="`${fmtNumber(d?.food.bySpecies.total)} kg`"
          :icon="Bone"
          :to="{ name: 'stock' }"
          :loading="loading"
          :hint-tone="foodTone"
          :hint="foodHint"
        />
        <StatCard
          v-if="session.can('finance.view')"
          label="A pagar"
          :value="fmtMoney(d?.finance.openTotal)"
          :icon="Wallet"
          :to="{ name: 'expenses' }"
          :loading="loading"
          :hint-tone="d?.finance.overdueTotal ? 'bad' : 'default'"
          :hint="d?.finance.overdueTotal ? `${fmtMoney(d.finance.overdueTotal)} vencidos` : 'Nada vencido'"
        />
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Atenção -->
        <div class="rounded-2xl border bg-card p-5">
          <h2 class="mb-3 flex items-center gap-2 font-semibold">
            <TriangleAlert class="size-4 text-amber-500" /> Atenção
            <span v-if="alertsCount" class="rounded-full bg-amber-100 px-2 text-xs text-amber-800">{{ alertsCount }}</span>
          </h2>
          <div v-if="loading" class="space-y-2"><div v-for="i in 3" :key="i" class="h-10 animate-pulse rounded-lg bg-muted" /></div>
          <ul v-else-if="alertsCount" class="grid gap-1">
            <li v-for="c in d!.alerts.castrations" :key="c.adoptionId">
              <RouterLink :to="{ name: 'adoption', params: { id: c.adoptionId } }" class="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Scissors class="size-4" /></span>
                <span class="min-w-0 flex-1 truncate text-sm"><b class="font-medium">Castrar {{ c.animalName }}</b> <span class="text-muted-foreground">· {{ c.personName }}</span></span>
                <Pill :tone="(daysUntil(c.deadline) ?? 0) < 0 ? 'red' : 'amber'">{{ (daysUntil(c.deadline) ?? 0) < 0 ? 'Atrasada' : fmtDate(c.deadline, { day: '2-digit', month: '2-digit' }) }}</Pill>
              </RouterLink>
            </li>
            <li v-for="u in d!.alerts.upcoming" :key="u.animalId + u.type">
              <RouterLink :to="{ name: 'animal', params: { id: u.animalId } }" class="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <span :class="['flex size-8 shrink-0 items-center justify-center rounded-lg', EVENT_TONE[u.type]]"><component :is="EVENT_ICON[u.type] ?? CalendarClock" class="size-4" /></span>
                <span class="min-w-0 flex-1 truncate text-sm"><b class="font-medium">{{ EVENT_TYPE[u.type as keyof typeof EVENT_TYPE] }} · {{ u.animalName }}</b></span>
                <Pill :tone="u.nextDate < todayISO() ? 'red' : 'amber'">{{ fmtDate(u.nextDate, { day: '2-digit', month: '2-digit' }) }}</Pill>
              </RouterLink>
            </li>
            <li v-for="s in d!.alerts.lowStock" :key="s.id">
              <RouterLink :to="{ name: 'stock' }" class="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><PackageX class="size-4" /></span>
                <span class="min-w-0 flex-1 truncate text-sm"><b class="font-medium">{{ s.name }}</b> <span class="text-muted-foreground">· estoque baixo</span></span>
                <Pill tone="red">{{ fmtNumber(s.quantity) }} {{ s.unit }}</Pill>
              </RouterLink>
            </li>
          </ul>
          <p v-else class="rounded-xl bg-emerald-50 px-3 py-4 text-center text-sm text-emerald-700">Tudo em dia ✨</p>
        </div>

        <!-- A pagar -->
        <div v-if="session.can('finance.view')" class="rounded-2xl border bg-card p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold">A pagar por clínica/empresa</h2>
            <RouterLink :to="{ name: 'expenses' }" class="text-xs font-medium text-brand-600 hover:underline">Ver tudo</RouterLink>
          </div>
          <ul v-if="d?.finance.openByPartner.length" class="grid gap-1">
            <li v-for="p in d.finance.openByPartner" :key="p.partnerId ?? 'none'">
              <RouterLink :to="{ name: 'expenses', query: p.partnerId ? { partner: p.partnerId } : {} }" class="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ p.name }}</span>
                <span class="text-sm font-semibold tabular-nums">{{ fmtMoney(p.amount) }}</span>
                <ChevronRight class="size-4 text-muted-foreground" />
              </RouterLink>
            </li>
          </ul>
          <p v-else-if="!loading" class="py-6 text-center text-sm text-muted-foreground">Nenhum valor em aberto.</p>
        </div>

        <!-- Gráfico -->
        <div v-if="session.can('animals.view')" class="rounded-2xl border bg-card p-5" :class="session.can('finance.view') && 'lg:col-span-2'">
          <h2 class="mb-2 font-semibold">Entradas × adoções <span class="text-xs font-normal text-muted-foreground">· 6 meses</span></h2>
          <div v-if="loading" class="h-56 animate-pulse rounded-xl bg-muted" />
          <MonthlyChart v-else-if="d" :data="d.monthly" />
        </div>
      </section>
    </template>
  </div>
</template>
