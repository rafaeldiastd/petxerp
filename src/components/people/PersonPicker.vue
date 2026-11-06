<script setup lang="ts">
import { ref, watch } from 'vue'
import { ShieldAlert, UserRound } from '@lucide/vue'
import EntityPicker from '@/components/common/EntityPicker.vue'
import PersonFormDialog from './PersonFormDialog.vue'
import { api } from '@/lib/api'
import { maskCpf } from '@/lib/format'
import type { Person } from '@shared/types'

type Option = Pick<Person, 'id' | 'name' | 'cpf' | 'phone' | 'city' | 'types' | 'restricted' | 'restrictionReason'>

const model = defineModel<string | null | undefined>()
const props = defineProps<{
  initial?: Option | null
  placeholder?: string
  type?: string
  defaultTypes?: string[]
  invalid?: boolean
  blockRestricted?: boolean
}>()
const emit = defineEmits<{ change: [person: Option | null] }>()

const selected = ref<Option | null>(props.initial ?? null)
watch(
  () => props.initial,
  (v) => v && (selected.value = v),
)
watch(model, (id) => {
  if (!id) selected.value = null
})

const creating = ref(false)
const createName = ref('')

function search(q: string) {
  return api.get<Option[]>('/people/options', { q, type: props.type })
}
function select(p: Option | null) {
  selected.value = p
  model.value = p?.id ?? null
  emit('change', p)
}
</script>

<template>
  <EntityPicker
    :selected="selected"
    :search="search"
    :placeholder="placeholder ?? 'Buscar por nome, CPF ou telefone'"
    create-label="Cadastrar nova pessoa"
    :invalid="invalid"
    clearable
    :is-disabled="(p) => (blockRestricted && p.restricted ? 'Restrição para adoção' : false)"
    @select="select"
    @create="(q) => { createName = q; creating = true }"
  >
    <template #selected="{ item }">
      <span class="flex items-center gap-2">
        <UserRound class="size-4 text-brand-600" />
        <span class="truncate font-medium">{{ item.name }}</span>
        <span v-if="item.cpf" class="hidden text-xs text-muted-foreground sm:inline">{{ maskCpf(item.cpf) }}</span>
      </span>
    </template>
    <template #item="{ item, disabledReason }">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
        {{ item.name.slice(0, 1) }}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{{ item.name }}</span>
        <span class="block truncate text-xs text-muted-foreground">
          {{ [item.cpf && maskCpf(item.cpf), item.phone, item.city].filter(Boolean).join(' · ') || 'Sem documentos' }}
        </span>
      </span>
      <span v-if="item.restricted" class="flex items-center gap-1 text-xs font-medium text-rose-600" :title="item.restrictionReason ?? ''">
        <ShieldAlert class="size-3.5" /> {{ disabledReason || 'Restrição' }}
      </span>
    </template>
  </EntityPicker>
  <PersonFormDialog v-model:open="creating" :initial-name="createName" :default-types="defaultTypes" @saved="(p) => select(p)" />
</template>
