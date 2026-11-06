<script setup lang="ts">
import { ref, watch } from 'vue'
import EntityPicker from '@/components/common/EntityPicker.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import Pill from '@/components/common/Pill.vue'
import { api } from '@/lib/api'
import { animalCode } from '@/lib/format'
import { animalStatusTone } from '@/lib/status'
import { ANIMAL_STATUS, SEX, SPECIES } from '@shared/constants'

export interface AnimalOption {
  id: string
  code: number
  name: string
  species: string
  sex: string
  status: string
  photoKey: string | null
  bondedWith: string[]
  castrated: boolean
  ageGroup: string | null
  birthDate: string | null
}

const model = defineModel<string | null | undefined>()
const props = defineProps<{
  initial?: AnimalOption | null
  status?: string
  exclude?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  onlyAdoptable?: boolean
}>()
const emit = defineEmits<{ change: [animal: AnimalOption | null] }>()

const selected = ref<AnimalOption | null>(props.initial ?? null)
watch(
  () => props.initial,
  (v) => v && (selected.value = v),
)
watch(model, (id) => {
  if (!id) selected.value = null
})

function search(q: string) {
  return api.get<AnimalOption[]>('/animals/options', { q, status: props.status, exclude: props.exclude })
}
function select(a: AnimalOption | null) {
  selected.value = a
  model.value = a?.id ?? null
  emit('change', a)
}
const adoptable = ['sheltered', 'available', 'treatment', 'foster']
</script>

<template>
  <EntityPicker
    :selected="selected"
    :search="search"
    :placeholder="placeholder ?? 'Buscar animal por nome ou código'"
    :invalid="invalid"
    :disabled="disabled"
    clearable
    :is-disabled="(a) => (onlyAdoptable && !adoptable.includes(a.status) ? ANIMAL_STATUS[a.status as keyof typeof ANIMAL_STATUS] : false)"
    @select="select"
  >
    <template #selected="{ item }">
      <span class="flex items-center gap-2">
        <AnimalAvatar :photo-key="item.photoKey" :species="item.species" size="sm" class="size-6 rounded-md" />
        <span class="truncate font-medium">{{ item.name }}</span>
        <span class="text-xs text-muted-foreground">{{ animalCode(item.code) }}</span>
      </span>
    </template>
    <template #item="{ item }">
      <AnimalAvatar :photo-key="item.photoKey" :species="item.species" size="sm" />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{{ item.name }} <span class="text-xs font-normal text-muted-foreground">{{ animalCode(item.code) }}</span></span>
        <span class="block text-xs text-muted-foreground">
          {{ SPECIES[item.species as keyof typeof SPECIES] }} · {{ SEX[item.sex as keyof typeof SEX] }}
        </span>
      </span>
      <Pill :tone="animalStatusTone[item.status]">{{ ANIMAL_STATUS[item.status as keyof typeof ANIMAL_STATUS] }}</Pill>
    </template>
  </EntityPicker>
</template>
