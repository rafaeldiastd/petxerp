<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { ArrowLeft, Printer } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import AdoptionTermSheets, { type TermData } from '@/components/adoptions/AdoptionTermSheets.vue'
import { api } from '@/lib/api'

/**
 * Termos para impressão em A4. Uma adoção: /painel/adocoes/:id/termo
 * Várias (adoção de mais de um animal): /painel/adocoes/termos?ids=a,b
 */
const route = useRoute()
const router = useRouter()
const ids = computed(() =>
  route.params.id ? [route.params.id as string] : String(route.query.ids ?? '').split(',').filter(Boolean),
)
const q = useQuery({
  queryKey: computed(() => ['adoptions', 'terms', ids.value]),
  queryFn: () => Promise.all(ids.value.map((id) => api.get<TermData>(`/adoptions/${id}`))),
  enabled: computed(() => ids.value.length > 0),
})
const docs = computed(() => q.data.value ?? [])
const printPage = () => window.print()
function back() {
  if (window.history.length > 1) router.back()
  else router.push(ids.value[0] ? { name: 'adoption', params: { id: ids.value[0] } } : { name: 'adoptions' })
}
</script>

<template>
  <div class="min-h-dvh bg-slate-100 py-6 print:bg-white print:py-0">
    <div class="no-print mx-auto mb-4 flex max-w-[210mm] items-center gap-2 px-4">
      <Button variant="outline" @click="back"><ArrowLeft /> Voltar</Button>
      <p class="hidden text-sm text-muted-foreground sm:block">
        {{ docs.length > 1 ? `${docs.length} termos (um por animal)` : 'Imprima em 2 vias' }} — uma via fica com o adotante.
      </p>
      <Button class="ml-auto" :disabled="!docs.length" @click="printPage"><Printer /> Imprimir</Button>
    </div>

    <div v-if="q.isLoading.value" class="mx-auto h-[297mm] max-w-[210mm] animate-pulse bg-white" />
    <AdoptionTermSheets v-for="d in docs" :key="d.id" :d="d" />
  </div>
</template>
