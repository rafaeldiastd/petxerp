<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { Clock, HeartHandshake } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { fmtMoney } from '@/lib/format'

const route = useRoute()
const id = computed(() => route.query.d as string | undefined)
const q = useQuery({
  queryKey: ['public', 'donation', id],
  queryFn: () => api.get<{ status: string; amount: number }>(`/public/donation/${id.value}`),
  enabled: computed(() => !!id.value),
  // aguarda o webhook confirmar o pagamento
  refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
})
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-background px-4">
    <div class="max-w-sm text-center">
      <span class="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-pink-100 text-pink-600">
        <HeartHandshake class="size-8" />
      </span>
      <h1 class="text-2xl font-bold">Obrigado pela sua doação!</h1>
      <p v-if="q.data.value?.status === 'paid'" class="mt-2 text-muted-foreground">
        Recebemos {{ fmtMoney(q.data.value.amount) }}. Sua ajuda vai virar cuidado para quem mais precisa. 💜
      </p>
      <p v-else class="mt-2 flex items-center justify-center gap-1.5 text-muted-foreground">
        <Clock class="size-4" /> Aguardando a confirmação do pagamento...
      </p>
      <Button variant="outline" class="mt-6" as-child>
        <RouterLink :to="{ name: 'donate', params: { slug: route.params.slug } }">Fazer outra doação</RouterLink>
      </Button>
    </div>
  </div>
</template>
