<script setup lang="ts">
import { Cat, Dog, HeartHandshake, Package, ShieldCheck } from '@lucide/vue'
import Logo from '@/components/common/Logo.vue'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
    <!-- Painel da marca -->
    <aside class="relative hidden overflow-hidden bg-brand-600 p-10 text-white lg:flex lg:flex-col">
      <div class="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
      <div class="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/5" />
      <div class="relative flex items-center gap-3">
        <span class="rounded-xl bg-white px-3 py-2"><Logo class="h-7" /></span>
      </div>
      <div class="relative mt-auto max-w-md">
        <h2 class="text-3xl leading-tight font-bold">Gestão completa para quem cuida de quem não tem voz.</h2>
        <p class="mt-3 text-white/75">Animais, adoções, estoque de ração, clínicas parceiras e doações — tudo em um só lugar, no computador ou no celular.</p>
        <ul class="mt-8 grid gap-3 text-sm">
          <li class="flex items-center gap-3"><span class="rounded-lg bg-white/15 p-2"><Dog class="size-4" /></span> Fichas completas com boletim de entrada</li>
          <li class="flex items-center gap-3"><span class="rounded-lg bg-white/15 p-2"><HeartHandshake class="size-4" /></span> Termo de adoção digital e impresso</li>
          <li class="flex items-center gap-3"><span class="rounded-lg bg-white/15 p-2"><Package class="size-4" /></span> Dias até acabar a ração, calculados na hora</li>
          <li class="flex items-center gap-3"><span class="rounded-lg bg-white/15 p-2"><ShieldCheck class="size-4" /></span> Acesso por função: atendimento, veterinário, financeiro</li>
        </ul>
      </div>
      <div class="relative mt-10 flex items-center gap-2 text-xs text-white/60"><Cat class="size-4" /> Feito para ONGs de proteção animal</div>
    </aside>

    <!-- Formulário -->
    <main class="flex flex-col px-5 py-8 sm:px-10">
      <div class="lg:hidden"><Logo class="h-8" /></div>
      <div class="m-auto w-full max-w-sm py-10">
        <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1.5 text-sm text-muted-foreground">{{ subtitle }}</p>
        <div class="mt-8"><slot /></div>
      </div>
      <p class="text-center text-xs text-muted-foreground">© {{ new Date().getFullYear() }} Petx ERP</p>
    </main>
  </div>
</template>
