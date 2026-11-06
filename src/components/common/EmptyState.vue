<script setup lang="ts">
import type { Component } from 'vue'
import { PawPrint } from '@lucide/vue'

defineProps<{ title: string; description?: string; icon?: Component }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
    <span class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
      <component :is="icon ?? PawPrint" class="size-6" />
    </span>
    <h3 class="font-semibold">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4 flex flex-wrap justify-center gap-2"><slot /></div>
  </div>
</template>
