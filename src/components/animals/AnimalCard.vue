<script setup lang="ts">
import { computed } from 'vue'
import {
  BadgeCheck, Cat, Dog, Ellipsis, Eye, Flower2, HeartHandshake, Link2, Mars, PawPrint, Pencil, ShieldPlus, Syringe, Trash2, Venus,
} from '@lucide/vue'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Pill from '@/components/common/Pill.vue'
import { fileUrl } from '@/lib/api'
import { ageLabel, sizeLabel, speciesLabel } from '@/lib/animal'
import { useSession } from '@/stores/session'
import { ADOPTABLE_STATUSES } from '@shared/constants'
import type { Animal } from '@shared/types'

const props = defineProps<{ animal: Animal }>()
const emit = defineEmits<{ death: [Animal]; remove: [Animal] }>()
const session = useSession()

const a = computed(() => props.animal)
const special = computed(() => !!(a.value.specialCare || a.value.diseases || a.value.disabilities))
const adoptable = computed(() => (ADOPTABLE_STATUSES as readonly string[]).includes(a.value.status))
const deceased = computed(() => a.value.status === 'deceased')
const placeholderBg = computed(() =>
  a.value.species === 'cat' ? 'from-amber-50 to-orange-100 text-amber-500' : a.value.species === 'dog' ? 'from-brand-50 to-indigo-100 text-brand-500' : 'from-teal-50 to-emerald-100 text-teal-500',
)
</script>

<template>
  <article class="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60">
    <RouterLink :to="{ name: 'animal', params: { id: a.id } }" class="flex flex-1 flex-col outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
      <div class="relative aspect-[4/3] overflow-hidden">
        <img
          v-if="a.photoKey"
          :src="fileUrl(a.photoKey)!"
          :alt="a.name"
          loading="lazy"
          class="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          :class="deceased && 'grayscale'"
        />
        <div v-else :class="['flex size-full items-center justify-center bg-gradient-to-br', placeholderBg]">
          <Dog v-if="a.species === 'dog'" class="size-14 opacity-70" />
          <Cat v-else-if="a.species === 'cat'" class="size-14 opacity-70" />
          <PawPrint v-else class="size-14 opacity-70" />
        </div>
      </div>

      <div class="px-3.5 pt-3 pb-2">
        <div class="flex items-center gap-1.5">
          <h3 class="truncate text-[15px] font-semibold">{{ a.name }}</h3>
          <Mars v-if="a.sex === 'male'" class="size-4 shrink-0 text-sky-500" aria-label="Macho" />
          <Venus v-else-if="a.sex === 'female'" class="size-4 shrink-0 text-pink-500" aria-label="Fêmea" />
        </div>
        <p class="truncate text-xs text-muted-foreground">
          {{ [speciesLabel(a), a.breed, ageLabel(a)].filter(Boolean).join(' · ') }}
        </p>
      </div>
    </RouterLink>

    <footer class="mt-auto flex items-end gap-2 border-t border-dashed px-3.5 py-2">
      <div class="flex min-w-0 flex-1 flex-wrap gap-1.5">
        <Pill v-if="sizeLabel(a)">{{ sizeLabel(a) }}</Pill>
        <Pill v-if="a.castrated" tone="green"><BadgeCheck />Castrado</Pill>
        <Pill v-else tone="amber">Não castrado</Pill>
        <Pill v-if="a.vaccinated" tone="teal"><Syringe />Vacinado</Pill>
        <Pill v-if="special" tone="red"><ShieldPlus />Cuidados</Pill>
        <Pill v-if="a.bondedWith.length" tone="violet"><Link2 />Conjunta</Pill>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button type="button" class="-mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Ações">
            <Ellipsis class="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuItem as-child>
            <RouterLink :to="{ name: 'animal', params: { id: a.id } }"><Eye /> Ver ficha</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem v-if="session.can('animals.edit')" as-child>
            <RouterLink :to="{ name: 'animal-edit', params: { id: a.id } }"><Pencil /> Editar</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem v-if="adoptable && session.can('adoptions.create')" as-child>
            <RouterLink :to="{ name: 'adoption-new', query: { animal: a.id } }"><HeartHandshake /> Declarar adoção</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem v-if="!deceased && session.can('animals.death')" @click="emit('death', a)">
            <Flower2 /> Declarar óbito
          </DropdownMenuItem>
          <template v-if="session.can('animals.delete')">
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="emit('remove', a)"><Trash2 class="text-rose-600" /> Excluir registro</DropdownMenuItem>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
    </footer>
  </article>
</template>
