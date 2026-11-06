<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { cn } from '@/lib/utils'

const model = defineModel<string>({ default: '' })
const props = defineProps<{ placeholder?: string; class?: string }>()
</script>

<template>
  <div :class="cn('relative', props.class)">
    <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
    <input
      v-model="model"
      type="search"
      :placeholder="placeholder ?? 'Pesquisar...'"
      class="h-10 w-full rounded-xl border bg-card pr-9 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
    />
    <button
      v-if="model"
      type="button"
      class="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      aria-label="Limpar"
      @click="model = ''"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>
