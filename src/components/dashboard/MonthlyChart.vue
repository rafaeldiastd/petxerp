<script setup lang="ts">
import { computed, ref } from 'vue'
import { fmtMonth } from '@/lib/format'

/**
 * Barras agrupadas (entradas × adoções por mês). Paleta validada para daltonismo:
 * teal #0D9488 / índigo #4F46E5. Legenda + rótulo do último mês + tooltip por mês.
 */
const props = defineProps<{ data: { month: string; intakes: number; adoptions: number }[] }>()

const SERIES = [
  { key: 'intakes', label: 'Entradas', color: '#0D9488' },
  { key: 'adoptions', label: 'Adoções', color: '#4F46E5' },
] as const

const W = 560
const H = 220
const PAD = { top: 16, right: 8, bottom: 28, left: 32 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom

// contagens são inteiras: passo inteiro, no máximo ~4 linhas de grade
const step = computed(() => {
  const m = Math.max(1, ...props.data.flatMap((d) => [d.intakes, d.adoptions]))
  return Math.max(1, Math.ceil(m / 4))
})
const max = computed(() => {
  const m = Math.max(1, ...props.data.flatMap((d) => [d.intakes, d.adoptions]))
  return Math.ceil(m / step.value) * step.value
})
const ticks = computed(() => Array.from({ length: max.value / step.value + 1 }, (_, i) => i * step.value))
const y = (v: number) => PAD.top + innerH - (v / max.value) * innerH
const group = computed(() => innerW / Math.max(1, props.data.length))
const barW = computed(() => Math.min(22, (group.value - 18) / 2))

function bar(i: number, s: number, v: number) {
  const gx = PAD.left + group.value * i + group.value / 2
  const x = gx - barW.value - 1 + s * (barW.value + 2) // 2px de respiro entre as barras do par
  const top = y(v)
  const h = Math.max(0, PAD.top + innerH - top)
  const r = Math.min(4, h, barW.value / 2)
  // topo arredondado (4px), base reta ancorada na linha zero
  const d = h <= 0 ? '' : `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW.value - r} Q${x + barW.value},${top} ${x + barW.value},${top + r} V${top + h} Z`
  return { x, d }
}

const hover = ref<number | null>(null)
const last = computed(() => props.data.length - 1)
</script>

<template>
  <div class="relative">
    <div class="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
      <span v-for="s in SERIES" :key="s.key" class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-[3px]" :style="{ background: s.color }" /> {{ s.label }}
      </span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" role="img" aria-label="Entradas e adoções nos últimos 6 meses" @mouseleave="hover = null">
      <!-- grade recessiva -->
      <g v-for="t in ticks" :key="t">
        <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(t)" :y2="y(t)" stroke="currentColor" class="text-border" :stroke-dasharray="t === 0 ? '' : '3 4'" />
        <text :x="PAD.left - 8" :y="y(t) + 3.5" text-anchor="end" class="fill-muted-foreground text-[10px]">{{ t }}</text>
      </g>

      <g v-for="(d, i) in data" :key="d.month">
        <!-- área de hover maior que as barras -->
        <rect
          :x="PAD.left + group * i"
          :y="PAD.top"
          :width="group"
          :height="innerH"
          :class="hover === i ? 'fill-muted' : 'fill-transparent'"
          rx="8"
          @mouseenter="hover = i"
          @touchstart.passive="hover = i"
        />
        <path v-for="(s, si) in SERIES" :key="s.key" :d="bar(i, si, d[s.key]).d" :fill="s.color" :opacity="hover === null || hover === i ? 1 : 0.45" class="pointer-events-none transition-opacity" />
        <!-- rótulo direto só no mês atual -->
        <template v-if="i === last && hover === null">
          <text
            v-for="(s, si) in SERIES"
            :key="s.key"
            :x="bar(i, si, d[s.key]).x + barW / 2"
            :y="y(d[s.key]) - 5"
            text-anchor="middle"
            class="pointer-events-none fill-foreground text-[10px] font-semibold"
          >{{ d[s.key] }}</text>
        </template>
        <text :x="PAD.left + group * i + group / 2" :y="H - 8" text-anchor="middle" class="pointer-events-none fill-muted-foreground text-[11px] capitalize">
          {{ fmtMonth(d.month) }}
        </text>
      </g>
    </svg>

    <!-- tooltip -->
    <div
      v-if="hover !== null && data[hover]"
      class="pointer-events-none absolute top-8 z-10 min-w-36 -translate-x-1/2 rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg"
      :style="{ left: `${((PAD.left + group * hover + group / 2) / W) * 100}%` }"
    >
      <p class="mb-1 font-semibold capitalize">{{ fmtMonth(data[hover].month) }} {{ data[hover].month.slice(0, 4) }}</p>
      <p v-for="s in SERIES" :key="s.key" class="flex items-center gap-2">
        <span class="size-2 rounded-[2px]" :style="{ background: s.color }" />
        <span class="text-muted-foreground">{{ s.label }}</span>
        <span class="ml-auto font-semibold text-foreground tabular-nums">{{ data[hover][s.key] }}</span>
      </p>
    </div>

    <!-- tabela acessível -->
    <table class="sr-only">
      <caption>Entradas e adoções por mês</caption>
      <thead><tr><th>Mês</th><th>Entradas</th><th>Adoções</th></tr></thead>
      <tbody><tr v-for="d in data" :key="d.month"><td>{{ d.month }}</td><td>{{ d.intakes }}</td><td>{{ d.adoptions }}</td></tr></tbody>
    </table>
  </div>
</template>
