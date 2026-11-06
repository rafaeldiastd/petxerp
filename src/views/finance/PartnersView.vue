<script setup lang="ts">
import { computed, ref } from 'vue'
import { Building2, Ellipsis, Pencil, Plus, Receipt, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pill from '@/components/common/Pill.vue'
import PartnerDialog from '@/components/finance/PartnerDialog.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { fmtMoney } from '@/lib/format'
import { useSession } from '@/stores/session'
import { PARTNER_TYPE } from '@shared/constants'
import type { Partner } from '@shared/types'

const session = useSession()
const { confirm } = useConfirm()
const list = useApiQuery<Partner[]>(['partners'], '/finance/partners')
const search = ref('')
const rows = computed(() => (list.data.value ?? []).filter((p) => !search.value || p.name.toLowerCase().includes(search.value.toLowerCase())))
const totalOpen = computed(() => rows.value.reduce((s, p) => s + (p.openAmount ?? 0), 0))

const open = ref(false)
const editing = ref<Partner | null>(null)
function openNew() {
  editing.value = null
  open.value = true
}
function openEdit(p: Partner) {
  editing.value = p
  open.value = true
}
const remove = useApiMutation((id: string) => api.del(`/finance/partners/${id}`), { invalidate: ['partners'], success: 'Parceiro removido' })
async function askRemove(p: Partner) {
  if (await confirm({ title: `Remover ${p.name}?`, description: 'As despesas já lançadas continuam no histórico.', confirmText: 'Remover', destructive: true }))
    remove.mutate(p.id)
}
</script>

<template>
  <div>
    <PageHeader title="Clínicas e parceiros" :back="{ name: 'expenses' }">
      <template #description>{{ rows.length }} cadastrados · {{ fmtMoney(totalOpen) }} em aberto</template>
      <template #actions>
        <Button v-if="session.can('finance.manage')" @click="openNew"><Plus /> Novo parceiro</Button>
      </template>
    </PageHeader>

    <SearchInput v-model="search" placeholder="Buscar parceiro..." class="mb-4 sm:w-80" />

    <div v-if="list.isLoading.value" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-40 animate-pulse rounded-2xl border bg-card" />
    </div>
    <EmptyState v-else-if="!rows.length" title="Nenhum parceiro" :icon="Building2" description="Cadastre clínicas veterinárias e fornecedores para acompanhar os valores em aberto.">
      <Button v-if="session.can('finance.manage')" @click="openNew"><Plus /> Novo parceiro</Button>
    </EmptyState>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="p in rows" :key="p.id" class="flex flex-col rounded-2xl border bg-card p-5">
        <div class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Building2 class="size-5" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ p.name }}</p>
            <Pill class="mt-1">{{ PARTNER_TYPE[p.type as keyof typeof PARTNER_TYPE] }}</Pill>
          </div>
          <DropdownMenu v-if="session.can('finance.manage')">
            <DropdownMenuTrigger as-child><Button variant="ghost" size="icon-sm" aria-label="Ações"><Ellipsis /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="openEdit(p)"><Pencil /> Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-rose-600 focus:text-rose-600" @click="askRemove(p)"><Trash2 class="text-rose-600" /> Remover</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p class="mt-3 text-sm text-muted-foreground">{{ [p.contactName, p.phone, p.email].filter(Boolean).join(' · ') || 'Sem contato' }}</p>
        <p v-if="p.notes" class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ p.notes }}</p>
        <div class="mt-auto flex items-center justify-between border-t border-dashed pt-3">
          <div>
            <p class="text-xs text-muted-foreground">Em aberto</p>
            <p class="font-bold" :class="(p.openAmount ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'">{{ fmtMoney(p.openAmount) }}</p>
          </div>
          <Button size="sm" variant="outline" as-child>
            <RouterLink :to="{ name: 'expenses', query: { partner: p.id, status: 'all' } }"><Receipt /> Despesas</RouterLink>
          </Button>
        </div>
      </article>
    </div>

    <PartnerDialog v-model:open="open" :partner="editing" />
  </div>
</template>
