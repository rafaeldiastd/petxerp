<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LoaderCircle, LogOut } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import AuthLayout from './AuthLayout.vue'
import { useForm } from '@/composables/useForm'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { useSession } from '@/stores/session'
import { onboardingSchema } from '@shared/schemas'
import { UF } from '@shared/constants'

const router = useRouter()
const session = useSession()
const { values, errors, validate } = useForm(onboardingSchema, () => ({ orgName: '', city: '', state: '' }))

const create = useApiMutation((data: unknown) => api.post<{ orgId: string }>('/onboarding', data), {
  success: 'ONG cadastrada! Bem-vindo(a) ao Petx.',
  onSuccess: async (res) => {
    await session.load(true)
    session.switchOrg(res.orgId)
    router.replace({ name: 'dashboard' })
  },
})

function submit() {
  const data = validate()
  if (data) create.mutate(data)
}
async function logout() {
  await session.signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <AuthLayout title="Cadastre sua ONG" :subtitle="`Olá, ${session.user?.name?.split(' ')[0] ?? ''}! Você será o administrador e poderá adicionar a equipe depois.`">
    <form class="grid gap-4" @submit.prevent="submit">
      <FormField label="Nome da ONG" required :error="errors.orgName">
        <Input v-model="values.orgName" class="h-11" placeholder="Ex.: Associação Viva Bicho" />
      </FormField>
      <div class="grid grid-cols-[1fr_96px] gap-3">
        <FormField label="Cidade" :error="errors.city"><Input v-model="values.city" class="h-11" /></FormField>
        <FormField label="UF"><SelectField v-model="values.state" :options="UF.map((u) => ({ value: u, label: u }))" placeholder="UF" class="h-11" /></FormField>
      </div>
      <Button type="submit" size="lg" class="h-11" :disabled="create.isPending.value">
        <LoaderCircle v-if="create.isPending.value" class="animate-spin" /> Começar
      </Button>
      <div class="flex items-center justify-between text-sm">
        <RouterLink v-if="session.memberships.length" :to="{ name: 'dashboard' }" class="text-muted-foreground hover:text-foreground">Voltar ao painel</RouterLink>
        <button type="button" class="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground" @click="logout">
          <LogOut class="size-4" /> Sair
        </button>
      </div>
    </form>
  </AuthLayout>
</template>
