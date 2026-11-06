<script setup lang="ts">
import { computed } from 'vue'
import { Cat, Dog, PawPrint } from '@lucide/vue'
import { fileUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{ photoKey?: string | null; species?: string | null; name?: string; size?: 'sm' | 'md' | 'lg'; class?: string }>(), {
  size: 'md',
})
const icon = computed(() => (props.species === 'dog' ? Dog : props.species === 'cat' ? Cat : PawPrint))
const sizes = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-xl', lg: 'size-14 rounded-2xl' }
</script>

<template>
  <span :class="cn('relative flex shrink-0 items-center justify-center overflow-hidden bg-brand-50 text-brand-600', sizes[size], props.class)">
    <img v-if="photoKey" :src="fileUrl(photoKey)!" :alt="name" class="size-full object-cover" loading="lazy" />
    <component :is="icon" v-else class="size-1/2" />
  </span>
</template>
