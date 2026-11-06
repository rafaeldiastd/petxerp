<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { AtSign, CreditCard, Heart, LoaderCircle, QrCode, Wallet } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Logo from '@/components/common/Logo.vue'
import PixQr from '@/components/donations/PixQr.vue'
import { api, fileUrl } from '@/lib/api'
import { fmtMoney, initials } from '@/lib/format'
import { pixPayload } from '@shared/pix'

type PublicDonate = {
  org: { name: string; slug: string; logoKey: string | null; city: string | null; state: string | null; instagram: string | null; website: string | null; whatsapp: string | null }
  pix: { key: string; keyType: string | null; name: string; city: string } | null
  stripe: boolean
  mercadopago: boolean
  suggestedAmounts: number[]
  message: string | null
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const q = useQuery({ queryKey: ['public', slug], queryFn: () => api.get<PublicDonate>(`/public/donate/${slug.value}`), retry: false })
const d = computed(() => q.data.value)

const amount = ref<number | ''>(50)
const custom = ref(false)
const method = ref<'pix' | 'stripe' | 'mercadopago'>('pix')
const name = ref('')
const email = ref('')
const loading = ref(false)

const methods = computed(() =>
  [
    d.value?.pix && { value: 'pix' as const, label: 'Pix', icon: QrCode },
    d.value?.stripe && { value: 'stripe' as const, label: 'Cartão', icon: CreditCard },
    d.value?.mercadopago && { value: 'mercadopago' as const, label: 'Mercado Pago', icon: Wallet },
  ].filter(Boolean) as { value: 'pix' | 'stripe' | 'mercadopago'; label: string; icon: unknown }[],
)
const activeMethod = computed(() => (methods.value.some((m) => m.value === method.value) ? method.value : methods.value[0]?.value))

const pix = computed(() =>
  d.value?.pix ? pixPayload({ ...d.value.pix, amount: Number(amount.value) || null, description: 'Doacao' }) : null,
)

async function checkout() {
  if (!amount.value || Number(amount.value) < 5) {
    toast.error('O valor mínimo é R$ 5,00')
    return
  }
  loading.value = true
  try {
    const { url } = await api.post<{ url: string }>(`/public/donate/${slug.value}/checkout`, {
      amount: amount.value, provider: activeMethod.value, name: name.value, email: email.value,
    })
    window.location.href = url
  } catch (e) {
    toast.error((e as Error).message)
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-gradient-to-b from-brand-50 via-background to-background px-4 py-8 sm:py-14">
    <div v-if="q.isLoading.value" class="mx-auto h-96 max-w-md animate-pulse rounded-3xl bg-card" />
    <div v-else-if="!d" class="mx-auto max-w-md text-center">
      <h1 class="text-xl font-bold">ONG não encontrada</h1>
      <p class="mt-2 text-muted-foreground">Confira o link de doação.</p>
    </div>

    <main v-else class="mx-auto max-w-md">
      <header class="mb-6 text-center">
        <span class="mx-auto mb-3 flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg shadow-brand-600/30">
          <img v-if="d.org.logoKey" :src="fileUrl(d.org.logoKey)!" class="size-full object-cover" alt="" />
          <template v-else>{{ initials(d.org.name) }}</template>
        </span>
        <h1 class="text-2xl font-bold tracking-tight">Doe para {{ d.org.name }}</h1>
        <p v-if="d.org.city" class="text-sm text-muted-foreground">{{ d.org.city }}{{ d.org.state ? `/${d.org.state}` : '' }}</p>
        <p class="mx-auto mt-3 max-w-sm text-sm text-foreground/80">
          {{ d.message || 'Cada doação vira ração, vacinas, castrações e tratamento para animais resgatados. Obrigado por fazer parte!' }}
        </p>
      </header>

      <section class="rounded-3xl border bg-card p-5 shadow-xl shadow-slate-200/50">
        <p class="mb-2 text-sm font-semibold">Escolha um valor</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="v in d.suggestedAmounts"
            :key="v"
            type="button"
            class="h-12 rounded-xl border text-base font-bold transition"
            :class="!custom && amount === v ? 'border-brand-600 bg-brand-600 text-white' : 'hover:border-brand-500/50'"
            @click="custom = false; amount = v"
          >
            {{ fmtMoney(v).replace(',00', '') }}
          </button>
          <button
            type="button"
            class="h-12 rounded-xl border text-sm font-semibold transition"
            :class="custom ? 'border-brand-600 bg-brand-50 text-brand-700' : 'hover:border-brand-500/50'"
            @click="custom = true; amount = ''"
          >
            Outro
          </button>
        </div>
        <Input v-if="custom" v-model.number="amount" type="number" min="5" step="1" inputmode="numeric" placeholder="Valor em R$" class="mt-2 h-12 text-lg font-semibold" autofocus />

        <template v-if="methods.length">
          <p class="mt-5 mb-2 text-sm font-semibold">Como quer doar?</p>
          <div class="grid gap-1 rounded-xl border bg-muted/60 p-1" :style="{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }">
            <button
              v-for="m in methods"
              :key="m.value"
              type="button"
              class="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
              :class="activeMethod === m.value ? 'bg-card shadow-sm ring-1 ring-border' : 'text-muted-foreground'"
              @click="method = m.value"
            >
              <component :is="m.icon" class="size-4" /> {{ m.label }}
            </button>
          </div>

          <div class="mt-5">
            <PixQr v-if="activeMethod === 'pix'" :payload="pix" />
            <div v-else class="grid gap-3">
              <Input v-model="name" placeholder="Seu nome (opcional)" class="h-11" autocomplete="name" />
              <Input v-model="email" type="email" placeholder="Seu e-mail para o recibo (opcional)" class="h-11" autocomplete="email" />
              <Button size="lg" class="h-12 text-base" :disabled="loading" @click="checkout">
                <LoaderCircle v-if="loading" class="animate-spin" /><Heart v-else /> Doar {{ amount ? fmtMoney(Number(amount)) : '' }}
              </Button>
            </div>
          </div>
        </template>
        <p v-else class="mt-5 rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">Os meios de doação ainda não foram configurados.</p>
      </section>

      <footer class="mt-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <a v-if="d.org.instagram" :href="`https://instagram.com/${d.org.instagram.replace('@', '')}`" target="_blank" rel="noopener" class="flex items-center gap-1.5 hover:text-foreground">
          <AtSign class="size-4" /> {{ d.org.instagram }}
        </a>
        <span class="flex items-center gap-1.5 text-xs">Tecnologia <Logo class="h-4" /></span>
      </footer>
    </main>
  </div>
</template>
