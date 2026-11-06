<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const props = defineProps<{ label?: string; error?: string; hint?: string; required?: boolean; id?: string; class?: string }>()
</script>

<template>
  <div :class="cn('grid min-w-0 content-start gap-1.5', props.class)" :data-error="!!error || undefined">
    <Label v-if="label" :for="id" class="text-[13px] font-medium text-foreground/85">
      {{ label }}<span v-if="required" class="text-rose-500">*</span>
    </Label>
    <slot />
    <p v-if="error" class="text-xs font-medium text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>
