<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff, LoaderCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField.vue'
import AuthLayout from './AuthLayout.vue'
import { authClient } from '@/lib/auth-client'
import { useSession } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const session = useSession()

const email = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  const { error: err } = await authClient.signIn.email({ email: email.value.trim(), password: password.value })
  if (err) {
    loading.value = false
    error.value = err.status === 401 || err.code === 'INVALID_EMAIL_OR_PASSWORD' ? 'E-mail ou senha incorretos' : (err.message ?? 'Não foi possível entrar')
    return
  }
  await session.load(true)
  loading.value = false
  const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/painel'
  router.replace(session.memberships.length ? next : { name: 'onboarding' })
}
</script>

<template>
  <AuthLayout title="Entrar no painel" subtitle="Use o e-mail e a senha cadastrados pela sua ONG.">
    <form class="grid gap-4" @submit.prevent="submit">
      <FormField label="E-mail" id="email">
        <Input id="email" v-model="email" type="email" autocomplete="email" required class="h-11" placeholder="voce@ong.org" />
      </FormField>
      <FormField label="Senha" id="password">
        <div class="relative">
          <Input id="password" v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" required class="h-11 pr-10" />
          <button type="button" class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted-foreground" :aria-label="show ? 'Ocultar senha' : 'Mostrar senha'" @click="show = !show">
            <EyeOff v-if="show" class="size-4" /><Eye v-else class="size-4" />
          </button>
        </div>
      </FormField>
      <p v-if="error" class="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{{ error }}</p>
      <Button type="submit" size="lg" class="h-11" :disabled="loading">
        <LoaderCircle v-if="loading" class="animate-spin" /> Entrar
      </Button>
    </form>
    <p class="mt-6 text-center text-sm text-muted-foreground">
      Sua ONG ainda não usa o Petx?
      <RouterLink :to="{ name: 'signup' }" class="font-semibold text-brand-600 hover:underline">Criar conta</RouterLink>
    </p>
  </AuthLayout>
</template>
