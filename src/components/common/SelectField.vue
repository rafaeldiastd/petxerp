<script setup lang="ts">
import { computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const NONE = '__none__'

const props = defineProps<{
  modelValue?: string | null
  options: Record<string, string> | { value: string; label: string }[]
  placeholder?: string
  nullable?: boolean
  nullLabel?: string
  disabled?: boolean
  id?: string
  class?: string
  invalid?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const list = computed(() =>
  Array.isArray(props.options) ? props.options : Object.entries(props.options).map(([value, label]) => ({ value, label })),
)

const model = computed({
  get: () => (props.modelValue ? props.modelValue : props.nullable ? NONE : undefined),
  set: (v) => emit('update:modelValue', !v || v === NONE ? '' : String(v)),
})
</script>

<template>
  <Select v-model="model" :disabled="disabled">
    <SelectTrigger :id="id" :aria-invalid="invalid || undefined" :class="cn('w-full bg-card', props.class)">
      <SelectValue :placeholder="placeholder ?? 'Selecione'" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-if="nullable" :value="NONE">
        <span class="text-muted-foreground">{{ nullLabel ?? 'Não informado' }}</span>
      </SelectItem>
      <SelectItem v-for="o in list" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
    </SelectContent>
  </Select>
</template>
