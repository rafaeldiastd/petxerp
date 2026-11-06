<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField.vue'
import AuthLayout from './AuthLayout.vue'
import { authClient } from '@/lib/auth-client'
import { useSession } from '@/stores/session'

const router = useRouter()
const session = useSession()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'A senha precisa ter pelo menos 8 caracteres'
    return
  }
  loading.value = true
  const { error: err } = await authClient.signUp.email({ name: name.value.trim(), email: email.value.trim(), password: password.value })
  loading.value = false
  if (err) {
    error.value = err.code === 'USER_ALREADY_EXISTS' || err.status === 422 ? 'Já existe uma conta com este e-mail' : (err.message ?? 'Não foi possível criar a conta')
    return
  }
  await session.load(true)
  router.replace({ name: 'onboarding' })
}
</script>

<template>
  <AuthLayout title="Criar conta" subtitle="Em seguida você cadastra a sua ONG e convida a equipe.">
    <form class="grid gap-4" @submit.prevent="submit">
      <FormField label="Seu nome"><Input v-model="name" autocomplete="name" required class="h-11" /></FormField>
      <FormField label="E-mail"><Input v-model="email" type="email" autocomplete="email" required class="h-11" /></FormField>
      <FormField label="Senha" hint="Mínimo de 8 caracteres">
        <Input v-model="password" type="password" autocomplete="new-password" required class="h-11" />
      </FormField>
      <p v-if="error" class="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{{ error }}</p>
      <Button type="submit" size="lg" class="h-11" :disabled="loading">
        <LoaderCircle v-if="loading" class="animate-spin" /> Criar conta
      </Button>
    </form>
    <p class="mt-6 text-center text-sm text-muted-foreground">
      Já tem conta? <RouterLink :to="{ name: 'login' }" class="font-semibold text-brand-600 hover:underline">Entrar</RouterLink>
    </p>
  </AuthLayout>
</template>
