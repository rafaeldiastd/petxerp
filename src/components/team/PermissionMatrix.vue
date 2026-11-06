<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { PERMISSION_GROUPS } from '@shared/permissions'

const model = defineModel<string[]>({ default: () => [] })
defineProps<{ disabled?: boolean }>()

function toggle(p: string, on: boolean | 'indeterminate') {
  model.value = on === true ? [...new Set([...model.value, p])] : model.value.filter((x) => x !== p)
}
function toggleGroup(keys: string[], on: boolean) {
  model.value = on ? [...new Set([...model.value, ...keys])] : model.value.filter((x) => !keys.includes(x))
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <fieldset v-for="g in PERMISSION_GROUPS" :key="g.key" :disabled="disabled" class="rounded-xl border p-3 disabled:opacity-60">
      <legend class="sr-only">{{ g.label }}</legend>
      <label class="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Checkbox
          :model-value="Object.keys(g.items).every((k) => model.includes(k)) ? true : Object.keys(g.items).some((k) => model.includes(k)) ? 'indeterminate' : false"
          :disabled="disabled"
          @update:model-value="(v) => toggleGroup(Object.keys(g.items), v === true)"
        />
        {{ g.label }}
      </label>
      <div class="grid gap-1.5 pl-6">
        <label v-for="(label, key) in g.items" :key="key" class="flex items-center gap-2 text-[13px] text-foreground/85">
          <Checkbox :model-value="model.includes(key)" :disabled="disabled" @update:model-value="(v) => toggle(key, v)" />
          {{ label }}
        </label>
      </div>
    </fieldset>
  </div>
</template>
