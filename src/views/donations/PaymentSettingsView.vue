<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { Check, Copy, CreditCard, KeyRound, LoaderCircle, QrCode, Wallet } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import PageHeader from '@/components/common/PageHeader.vue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import Pill from '@/components/common/Pill.vue'
import PixQr from '@/components/donations/PixQr.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { api } from '@/lib/api'
import { useSession } from '@/stores/session'
import { pixPayload } from '@shared/pix'
import { PIX_KEY_TYPE } from '@shared/constants'
import type { PaymentSettingsPublic } from '@shared/types'

const session = useSession()
const { copy, copied } = useClipboard({ legacy: true })
const q = useApiQuery<PaymentSettingsPublic>(['donations', 'settings'], '/donations/settings')

const form = ref({
  pixEnabled: false, pixKey: '', pixKeyType: 'cnpj', pixName: '', pixCity: '',
  stripeEnabled: false, stripePublishableKey: '', stripeSecretKey: '', stripeWebhookSecret: '',
  mpEnabled: false, mpPublicKey: '', mpAccessToken: '', mpWebhookSecret: '',
  suggestedAmounts: '20, 50, 100, 200', donationMessage: '',
})
const clear = ref<string[]>([])

watch(
  () => q.data.value,
  (s) => {
    if (!s) return
    Object.assign(form.value, {
      pixEnabled: s.pixEnabled, pixKey: s.pixKey ?? '', pixKeyType: s.pixKeyType ?? 'cnpj', pixName: s.pixName ?? '', pixCity: s.pixCity ?? '',
      stripeEnabled: s.stripeEnabled, stripePublishableKey: s.stripePublishableKey ?? '', stripeSecretKey: '', stripeWebhookSecret: '',
      mpEnabled: s.mpEnabled, mpPublicKey: s.mpPublicKey ?? '', mpAccessToken: '', mpWebhookSecret: '',
      suggestedAmounts: s.suggestedAmounts.join(', '), donationMessage: s.donationMessage ?? '',
    })
    clear.value = []
  },
  { immediate: true },
)

const preview = computed(() =>
  form.value.pixKey ? pixPayload({ key: form.value.pixKey, keyType: form.value.pixKeyType, name: form.value.pixName || session.org?.name || 'ONG', city: form.value.pixCity || 'BRASIL' }) : null,
)
const origin = window.location.origin
const stripeWebhook = computed(() => `${origin}/api/webhooks/stripe/${session.orgId}`)
const mpWebhook = computed(() => `${origin}/api/webhooks/mercadopago/${session.orgId}`)

const save = useApiMutation(
  () =>
    api.put('/donations/settings', {
      ...form.value,
      suggestedAmounts: form.value.suggestedAmounts.split(/[,;\s]+/).map(Number).filter((n) => n > 0).slice(0, 6),
      clear: clear.value,
    }),
  { invalidate: ['donations'], success: 'Configurações de pagamento salvas' },
)
function toggleClear(field: string) {
  clear.value = clear.value.includes(field) ? clear.value.filter((x) => x !== field) : [...clear.value, field]
}
</script>

<template>
  <form class="mx-auto max-w-3xl" @submit.prevent="save.mutate()">
    <PageHeader title="Pagamentos de doação" description="Chaves e credenciais ficam cifradas e nunca voltam para o navegador." :back="{ name: 'donations' }" />

    <div v-if="q.isLoading.value" class="h-96 animate-pulse rounded-2xl bg-muted" />
    <div v-else class="grid grid-cols-1 gap-5">
      <!-- Pix -->
      <FormSection title="Pix direto" description="QR Code estático na página de doação. Confirme os recebimentos manualmente." :icon="QrCode">
        <template #aside><Switch v-model="form.pixEnabled" /></template>
        <div class="grid gap-5 sm:grid-cols-[1fr_240px]">
          <div class="grid content-start gap-4">
            <div class="grid grid-cols-[150px_1fr] gap-3">
              <FormField label="Tipo de chave"><SelectField v-model="form.pixKeyType" :options="PIX_KEY_TYPE" /></FormField>
              <FormField label="Chave Pix"><Input v-model="form.pixKey" /></FormField>
            </div>
            <div class="grid grid-cols-[1fr_140px] gap-3">
              <FormField label="Nome do recebedor" hint="Até 25 caracteres"><Input v-model="form.pixName" maxlength="25" /></FormField>
              <FormField label="Cidade" hint="Até 15"><Input v-model="form.pixCity" maxlength="15" /></FormField>
            </div>
          </div>
          <div class="rounded-xl bg-muted/40 p-3">
            <PixQr v-if="preview" :payload="preview" :size="180" />
            <p v-else class="py-10 text-center text-xs text-muted-foreground">Informe a chave para ver o QR Code</p>
          </div>
        </div>
      </FormSection>

      <!-- Stripe -->
      <FormSection title="Cartão de crédito (Stripe)" description="Checkout da Stripe — cartões, Apple/Google Pay. Confirmação automática via webhook." :icon="CreditCard">
        <template #aside><Switch v-model="form.stripeEnabled" /></template>
        <FormField label="Chave publicável" hint="pk_live_... ou pk_test_..."><Input v-model="form.stripePublishableKey" /></FormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField label="Chave secreta" :hint="q.data.value?.stripeSecretSet ? 'Já configurada — preencha só para trocar' : 'sk_live_... (obrigatória)'">
            <div class="flex items-center gap-2">
              <Input v-model="form.stripeSecretKey" type="password" autocomplete="off" :placeholder="q.data.value?.stripeSecretSet ? '••••••••••••' : ''" />
              <Pill v-if="q.data.value?.stripeSecretSet" :tone="clear.includes('stripeSecretKey') ? 'red' : 'green'" class="cursor-pointer" @click="toggleClear('stripeSecretKey')">
                <KeyRound />{{ clear.includes('stripeSecretKey') ? 'Remover' : 'Salva' }}
              </Pill>
            </div>
          </FormField>
          <FormField label="Segredo do webhook" :hint="q.data.value?.stripeWebhookSet ? 'Já configurado' : 'whsec_...'">
            <Input v-model="form.stripeWebhookSecret" type="password" autocomplete="off" :placeholder="q.data.value?.stripeWebhookSet ? '••••••••••••' : ''" />
          </FormField>
        </div>
        <div class="rounded-xl bg-muted/50 p-3 text-xs">
          <p class="mb-1 font-medium">URL do webhook (Stripe → Developers → Webhooks), eventos <code>checkout.session.*</code>:</p>
          <div class="flex items-center gap-2"><code class="min-w-0 flex-1 truncate">{{ stripeWebhook }}</code><Button type="button" size="xs" variant="outline" @click="copy(stripeWebhook)"><Check v-if="copied" /><Copy v-else /></Button></div>
        </div>
      </FormSection>

      <!-- Mercado Pago -->
      <FormSection title="Mercado Pago" description="Checkout Pro — Pix, cartão e boleto pelo Mercado Pago." :icon="Wallet">
        <template #aside><Switch v-model="form.mpEnabled" /></template>
        <FormField label="Public key"><Input v-model="form.mpPublicKey" /></FormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField label="Access token" :hint="q.data.value?.mpAccessTokenSet ? 'Já configurado — preencha só para trocar' : 'APP_USR-... (obrigatório)'">
            <div class="flex items-center gap-2">
              <Input v-model="form.mpAccessToken" type="password" autocomplete="off" :placeholder="q.data.value?.mpAccessTokenSet ? '••••••••••••' : ''" />
              <Pill v-if="q.data.value?.mpAccessTokenSet" :tone="clear.includes('mpAccessToken') ? 'red' : 'green'" class="cursor-pointer" @click="toggleClear('mpAccessToken')">
                <KeyRound />{{ clear.includes('mpAccessToken') ? 'Remover' : 'Salvo' }}
              </Pill>
            </div>
          </FormField>
          <FormField label="Assinatura secreta do webhook" hint="Opcional — valida o x-signature">
            <Input v-model="form.mpWebhookSecret" type="password" autocomplete="off" :placeholder="q.data.value?.mpWebhookSet ? '••••••••••••' : ''" />
          </FormField>
        </div>
        <div class="rounded-xl bg-muted/50 p-3 text-xs">
          <p class="mb-1 font-medium">URL de notificação (já enviada automaticamente em cada pagamento):</p>
          <code class="block truncate">{{ mpWebhook }}</code>
        </div>
      </FormSection>

      <!-- Página pública -->
      <FormSection title="Página de doação" :icon="QrCode">
        <FormField label="Valores sugeridos (R$)" hint="Separados por vírgula, até 6"><Input v-model="form.suggestedAmounts" /></FormField>
        <FormField label="Mensagem para o doador"><Textarea v-model="form.donationMessage" rows="3" placeholder="Sua doação ajuda a pagar castrações, ração e tratamentos..." /></FormField>
      </FormSection>
    </div>

    <div class="sticky bottom-20 z-20 mt-6 md:bottom-4">
      <div class="flex justify-end gap-2 rounded-2xl border bg-card/95 p-2.5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <Button type="submit" class="min-w-32" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar</Button>
      </div>
    </div>
  </form>
</template>
