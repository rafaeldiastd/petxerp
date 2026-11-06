<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ title: string; description?: string; icon?: Component; id?: string }>()
</script>

<template>
  <section :id="id" class="scroll-mt-20 rounded-2xl border bg-card">
    <header class="flex items-start gap-3 border-b border-dashed px-4 py-3.5 sm:px-6 sm:py-4">
      <span v-if="icon" class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <component :is="icon" class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold">{{ title }}</h2>
        <p v-if="description" class="text-[13px] text-muted-foreground">{{ description }}</p>
      </div>
      <slot name="aside" />
    </header>
    <div class="grid grid-cols-1 gap-4 p-4 sm:p-6">
      <slot />
    </div>
  </section>
</template>
