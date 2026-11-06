<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import FormField from '@/components/common/FormField.vue'
import PermissionMatrix from './PermissionMatrix.vue'
import { useApiMutation } from '@/composables/useApi'
import { api } from '@/lib/api'
import { maskPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fieldErrors, teamCreateSchema, teamUpdateSchema } from '@shared/schemas'
import { ROLE_DESCRIPTIONS, ROLE_PRESETS, ROLES, type Role } from '@shared/permissions'
import type { TeamMember } from '@shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ member?: TeamMember | null }>()
const emit = defineEmits<{ created: [res: { generatedPassword: string | null; email: string; name: string }] }>()

const form = ref({ name: '', email: '', password: '', role: 'atendimento' as Role, jobTitle: '', phone: '', active: true })
const custom = ref(false)
const perms = ref<string[]>([])
const errors = ref<Record<string, string>>({})

watch(open, (v) => {
  if (!v) return
  errors.value = {}
  const m = props.member
  form.value = {
    name: m?.name ?? '', email: m?.email ?? '', password: '', role: (m?.role as Role) ?? 'atendimento',
    jobTitle: m?.jobTitle ?? '', phone: m?.phone ?? '', active: m?.active ?? true,
  }
  custom.value = !!m?.permissions?.length
  perms.value = m ? [...m.effectivePermissions] : [...ROLE_PRESETS.atendimento]
})
watch(
  () => form.value.role,
  (r) => !custom.value && (perms.value = [...ROLE_PRESETS[r]]),
)
watch(custom, (c) => !c && (perms.value = [...ROLE_PRESETS[form.value.role]]))

const isAdmin = computed(() => form.value.role === 'admin')

const save = useApiMutation(
  (body: Record<string, unknown>) => (props.member ? api.patch(`/team/${props.member.id}`, body) : api.post<{ generatedPassword: string | null }>('/team', body)),
  {
    invalidate: ['team'],
    success: () => (props.member ? 'Acesso atualizado' : 'Membro adicionado à equipe'),
    onSuccess: (res) => {
      if (!props.member) emit('created', { generatedPassword: (res as { generatedPassword: string | null }).generatedPassword, email: form.value.email, name: form.value.name })
      open.value = false
    },
  },
)

function submit() {
  const body = { ...form.value, permissions: custom.value && !isAdmin.value ? perms.value : null }
  const res = (props.member ? teamUpdateSchema : teamCreateSchema).safeParse(body)
  if (!res.success) {
    errors.value = fieldErrors(res.error)
    return
  }
  save.mutate(res.data as Record<string, unknown>)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ member ? `Acesso de ${member.name}` : 'Adicionar à equipe' }}</DialogTitle>
        <DialogDescription>{{ member ? member.email : 'Crie o acesso com uma senha inicial — a pessoa entra com o e-mail e essa senha.' }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-5" @submit.prevent="submit">
        <div v-if="!member" class="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome" required :error="errors.name"><Input v-model="form.name" /></FormField>
          <FormField label="E-mail" required :error="errors.email"><Input v-model="form.email" type="email" autocomplete="off" /></FormField>
          <FormField label="Senha inicial" :error="errors.password" hint="Deixe em branco para gerar uma automaticamente">
            <Input v-model="form.password" type="text" autocomplete="new-password" />
          </FormField>
          <FormField label="Telefone"><Input :model-value="form.phone" @update:model-value="(v) => (form.phone = maskPhone(String(v)))" /></FormField>
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <FormField label="Cargo"><Input v-model="form.jobTitle" placeholder="Ex.: Médica veterinária" /></FormField>
          <FormField label="Telefone"><Input :model-value="form.phone" @update:model-value="(v) => (form.phone = maskPhone(String(v)))" /></FormField>
        </div>

        <FormField label="Função">
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="(label, key) in ROLES"
              :key="key"
              type="button"
              :class="cn('rounded-xl border p-3 text-left transition', form.role === key ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'hover:border-brand-500/40')"
              @click="form.role = key"
            >
              <p class="text-sm font-semibold">{{ label }}</p>
              <p class="text-xs text-muted-foreground">{{ ROLE_DESCRIPTIONS[key] }}</p>
            </button>
          </div>
        </FormField>

        <div v-if="!isAdmin" class="grid gap-3">
          <label class="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium">
            Personalizar permissões
            <Switch v-model="custom" />
          </label>
          <PermissionMatrix v-model="perms" :disabled="!custom" />
        </div>
        <p v-else class="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">Administradores têm acesso total.</p>

        <label v-if="member" class="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium">
          Acesso ativo
          <Switch v-model="form.active" />
        </label>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="save.isPending.value"><LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar</Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
