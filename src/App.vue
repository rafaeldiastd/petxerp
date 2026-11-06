<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import ConfirmHost from '@/components/common/ConfirmHost.vue'
</script>

<template>
  <RouterView />
  <Toaster position="top-center" rich-colors close-button />
  <ConfirmHost />
</template>
