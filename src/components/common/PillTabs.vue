<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Abas no padrão visual do sistema (usadas em listas e fichas) */
const model = defineModel<string>({ required: true })
const props = defineProps<{ items: { value: string; label: string; count?: number | null }[]; class?: string }>()
</script>

<template>
  <div :class="cn('-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0', props.class)">
    <div role="tablist" class="flex w-max gap-1 rounded-xl border bg-card p-1">
      <button
        v-for="t in items"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="model === t.value"
        class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition"
        :class="model === t.value ? 'bg-brand-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
        @click="model = t.value"
      >
        {{ t.label }}
        <span
          v-if="t.count != null"
          class="rounded-full px-1.5 text-[11px] tabular-nums"
          :class="model === t.value ? 'bg-white/20' : 'bg-muted text-muted-foreground'"
        >{{ t.count }}</span>
      </button>
    </div>
  </div>
</template>
