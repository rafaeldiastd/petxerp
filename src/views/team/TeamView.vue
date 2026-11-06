<script setup lang="ts">
import { ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import { Check, Copy, Ellipsis, KeyRound, MessageCircle, Pencil, ShieldCheck, Trash2, UserCog, UserPlus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pill from '@/components/common/Pill.vue'
import MemberDialog from '@/components/team/MemberDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { initials } from '@/lib/format'
import { roleTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import { ALL_PERMISSIONS, ROLES } from '@shared/permissions'
import type { TeamMember } from '@shared/types'

const session = useSession()
const { confirm } = useConfirm()
const { copy, copied } = useClipboard({ legacy: true })
const list = useApiQuery<TeamMember[]>(['team'], '/team')

const dlg = ref(false)
const editing = ref<TeamMember | null>(null)
function openNew() {
  editing.value = null
  dlg.value = true
}
function openEdit(m: TeamMember) {
  editing.value = m
  dlg.value = true
}

const credentials = ref<{ name: string; email: string; password: string } | null>(null)
function onCreated(r: { generatedPassword: string | null; email: string; name: string }) {
  if (r.generatedPassword) credentials.value = { name: r.name, email: r.email, password: r.generatedPassword }
}
const credText = () =>
  credentials.value
    ? `Olá, ${credentials.value.name.split(' ')[0]}! Seu acesso ao Petx ERP (${session.org?.name}):\n${window.location.origin}/login\nE-mail: ${credentials.value.email}\nSenha: ${credentials.value.password}`
    : ''

const remove = useApiMutation((id: string) => api.del(`/team/${id}`), { invalidate: ['team'], success: 'Membro removido' })
async function askRemove(m: TeamMember) {
  if (await confirm({ title: `Remover ${m.name} da equipe?`, description: 'A pessoa perde o acesso a esta ONG imediatamente.', confirmText: 'Remover', destructive: true }))
    remove.mutate(m.id)
}
</script>

<template>
  <div>
    <PageHeader title="Equipe">
      <template #actions><Button @click="openNew"><UserPlus /> Adicionar pessoa</Button></template>
    </PageHeader>

    <div v-if="list.isLoading.value" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-2xl border bg-card" />
    </div>
    <EmptyState v-else-if="!list.data.value?.length" title="Só você por aqui" :icon="UserCog" />
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="m in list.data.value" :key="m.id" class="flex flex-col rounded-2xl border bg-card p-5" :class="!m.active && 'opacity-60'">
        <div class="flex items-start gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">{{ initials(m.name) }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ m.name }} <span v-if="m.userId === session.user?.id" class="text-xs font-normal text-muted-foreground">(você)</span></p>
            <p class="truncate text-sm text-muted-foreground">{{ m.email }}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger as-child><Button variant="ghost" size="icon-sm" aria-label="Ações"><Ellipsis /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="openEdit(m)"><Pencil /> Editar acesso</DropdownMenuItem>
              <template v-if="m.userId !== session.user?.id">
                <DropdownMenuSeparator />
                <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove(m)"><Trash2 class="text-rose-600" /> Remover</DropdownMenuItem>
              </template>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <Pill :tone="roleTone[m.role]" size="md"><ShieldCheck />{{ ROLES[m.role as keyof typeof ROLES] }}</Pill>
          <Pill v-if="m.permissions?.length" tone="gray">Personalizado</Pill>
          <Pill v-if="!m.active" tone="red">Inativo</Pill>
        </div>
        <p v-if="m.jobTitle" class="mt-2 text-sm text-muted-foreground">{{ m.jobTitle }}</p>
        <div class="mt-auto pt-4">
          <div class="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Permissões</span><span>{{ m.effectivePermissions.length }}/{{ ALL_PERMISSIONS.length }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-brand-600" :style="{ width: `${(m.effectivePermissions.length / ALL_PERMISSIONS.length) * 100}%` }" />
          </div>
        </div>
      </article>
    </div>

    <MemberDialog v-model:open="dlg" :member="editing" @created="onCreated" />

    <Dialog :open="!!credentials" @update:open="(v) => !v && (credentials = null)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="mb-1 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><KeyRound class="size-5" /></div>
          <DialogTitle>Acesso criado</DialogTitle>
          <DialogDescription>Envie estes dados para {{ credentials?.name }}. A senha não será exibida novamente.</DialogDescription>
        </DialogHeader>
        <pre class="rounded-xl bg-muted p-3 text-sm whitespace-pre-wrap">{{ credText() }}</pre>
        <DialogFooter class="gap-2">
          <Button variant="outline" as-child>
            <a :href="`https://wa.me/?text=${encodeURIComponent(credText())}`" target="_blank" rel="noopener"><MessageCircle /> WhatsApp</a>
          </Button>
          <Button @click="copy(credText())"><Check v-if="copied" /><Copy v-else /> {{ copied ? 'Copiado' : 'Copiar' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
