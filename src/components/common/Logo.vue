<script setup lang="ts">
import logoFull from '@/assets/logo.svg'
import logoMark from '@/assets/logo-mark.svg'

withDefaults(defineProps<{ mark?: boolean; class?: string }>(), { mark: false })
</script>

<template>
  <img
    :src="mark ? logoMark : logoFull"
    alt="Petx"
    :class="['h-8 w-auto select-none', $props.class]"
    draggable="false"
  />
</template>
