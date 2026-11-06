<script setup lang="ts">
import { computed } from 'vue'
import { BadgeCheck, Clock, TriangleAlert } from '@lucide/vue'
import Pill from '@/components/common/Pill.vue'
import { daysUntil, fmtDate } from '@/lib/format'

const props = defineProps<{ done: boolean; deadline: string | null; status?: string }>()
const days = computed(() => daysUntil(props.deadline))
</script>

<template>
  <Pill v-if="done" tone="green"><BadgeCheck />Castrado</Pill>
  <Pill v-else-if="!deadline || status !== 'active'" tone="gray">—</Pill>
  <Pill v-else-if="(days ?? 0) < 0" tone="red"><TriangleAlert />Atrasada {{ Math.abs(days!) }}d</Pill>
  <Pill v-else tone="amber"><Clock />Até {{ fmtDate(deadline, { day: '2-digit', month: '2-digit' }) }}</Pill>
</template>
