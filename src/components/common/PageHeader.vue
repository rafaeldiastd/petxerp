<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ title: string; description?: string; back?: RouteLocationRaw }>()
</script>

<template>
  <div class="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <RouterLink
        v-if="back"
        :to="back"
        class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition hover:text-foreground"
        aria-label="Voltar"
      >
        <ArrowLeft class="size-4" />
      </RouterLink>
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight sm:text-2xl">{{ title }}</h1>
        <p v-if="description || $slots.description" class="mt-1 text-sm text-muted-foreground">
          <slot name="description">{{ description }}</slot>
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
