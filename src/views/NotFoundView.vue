<script setup lang="ts">
import { PawPrint } from '@lucide/vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <span class="flex size-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600"><PawPrint class="size-8" /></span>
    <h1 class="text-2xl font-bold">Página não encontrada</h1>
    <p class="max-w-sm text-muted-foreground">Parece que este caminho fugiu pelo portão. Vamos voltar para o painel?</p>
    <Button as-child><RouterLink to="/painel">Ir para o painel</RouterLink></Button>
  </div>
</template>
