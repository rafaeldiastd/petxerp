<script setup lang="ts">
import { useSidebar } from '@/components/ui/sidebar'

// precisa estar dentro do SidebarProvider para abrir a gaveta lateral
const { setOpenMobile } = useSidebar()
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted-foreground"
    @click="setOpenMobile(true)"
  >
    <slot />
  </button>
</template>
