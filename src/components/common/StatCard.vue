<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowUpRight } from '@lucide/vue'

defineProps<{
  label: string
  value: string | number
  icon?: Component
  hint?: string
  hintTone?: 'default' | 'good' | 'warn' | 'bad'
  to?: RouteLocationRaw
  loading?: boolean
}>()
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="group relative flex flex-col rounded-2xl border bg-card p-4 transition sm:p-5"
    :class="to && 'hover:border-brand-500/40 hover:shadow-sm'"
  >
    <div class="flex items-center gap-2.5">
      <span v-if="icon" class="flex size-9 items-center justify-center rounded-xl border bg-background text-muted-foreground">
        <component :is="icon" class="size-[18px]" />
      </span>
      <span class="text-sm font-medium text-foreground/80">{{ label }}</span>
      <ArrowUpRight v-if="to" class="ml-auto size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
    </div>
    <div class="mt-4 border-t border-dashed pt-3">
      <div v-if="loading" class="h-8 w-24 animate-pulse rounded-md bg-muted" />
      <div v-else class="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{{ value }}</div>
      <div
        v-if="hint || $slots.hint"
        class="mt-1 text-xs"
        :class="{
          'text-muted-foreground': !hintTone || hintTone === 'default',
          'text-emerald-600': hintTone === 'good',
          'text-amber-600': hintTone === 'warn',
          'text-rose-600': hintTone === 'bad',
        }"
      >
        <slot name="hint">{{ hint }}</slot>
      </div>
      <slot />
    </div>
  </component>
</template>
