<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export type Tone = 'gray' | 'brand' | 'green' | 'amber' | 'red' | 'sky' | 'violet' | 'teal' | 'pink'

const props = withDefaults(defineProps<{ tone?: Tone; size?: 'sm' | 'md'; class?: string }>(), { tone: 'gray', size: 'sm' })

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  pink: 'bg-pink-50 text-pink-700 ring-pink-600/15',
}

const cls = computed(() =>
  cn(
    'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium ring-1 ring-inset [&>svg]:size-3',
    props.size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    tones[props.tone],
    props.class,
  ),
)
</script>

<template>
  <span :class="cls"><slot /></span>
</template>
