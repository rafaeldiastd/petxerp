<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Check } from '@lucide/vue'
import { cn } from '@/lib/utils'

/** Pills clicáveis para seleção simples ou múltipla (ótimo no celular) */
type Opt = { value: string; label: string; icon?: Component }

const props = withDefaults(
  defineProps<{
    modelValue: string | string[] | null | undefined
    options: Record<string, string> | Opt[]
    multiple?: boolean
    /** permite desmarcar na seleção simples */
    clearable?: boolean
    variant?: 'pills' | 'segmented'
    size?: 'sm' | 'md'
    class?: string
  }>(),
  { variant: 'pills', size: 'md' },
)
const emit = defineEmits<{ 'update:modelValue': [value: any] }>()

const list = computed<Opt[]>(() =>
  Array.isArray(props.options) ? props.options : Object.entries(props.options).map(([value, label]) => ({ value, label })),
)

function isOn(v: string) {
  return props.multiple ? ((props.modelValue as string[]) ?? []).includes(v) : props.modelValue === v
}

function toggle(v: string) {
  if (props.multiple) {
    const cur = [...((props.modelValue as string[]) ?? [])]
    const i = cur.indexOf(v)
    if (i >= 0) cur.splice(i, 1)
    else cur.push(v)
    emit('update:modelValue', cur)
  } else {
    emit('update:modelValue', props.modelValue === v && props.clearable ? '' : v)
  }
}
</script>

<template>
  <div
    :role="multiple ? 'group' : 'radiogroup'"
    :class="
      cn(
        variant === 'segmented' ? 'grid auto-cols-fr grid-flow-col gap-1 rounded-xl border bg-muted/60 p-1' : 'flex flex-wrap gap-2',
        props.class,
      )
    "
  >
    <button
      v-for="o in list"
      :key="o.value"
      type="button"
      :role="multiple ? 'checkbox' : 'radio'"
      :aria-checked="isOn(o.value)"
      :class="
        cn(
          'inline-flex items-center justify-center gap-1.5 font-medium transition outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&>svg]:size-4',
          variant === 'segmented'
            ? cn('h-9 rounded-lg px-3 text-sm', isOn(o.value) ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')
            : cn(
                'rounded-full border',
                size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
                isOn(o.value)
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'bg-card text-foreground/80 hover:border-brand-500/50 hover:bg-brand-50/60',
              ),
        )
      "
      @click="toggle(o.value)"
    >
      <component :is="o.icon" v-if="o.icon" />
      <Check v-else-if="multiple && isOn(o.value)" class="-ml-0.5 size-3.5" />
      {{ o.label }}
    </button>
  </div>
</template>
