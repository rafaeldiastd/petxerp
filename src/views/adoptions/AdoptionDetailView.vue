<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  BadgeCheck, Ban, CircleCheck, Link2, LoaderCircle, MessageCircle, Phone, Printer, Scissors, Undo2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/components/common/PageHeader.vue'
import Pill from '@/components/common/Pill.vue'
import FormField from '@/components/common/FormField.vue'
import ChipGroup from '@/components/common/ChipGroup.vue'
import FileUpload from '@/components/common/FileUpload.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import CastrationBadge from '@/components/adoptions/CastrationBadge.vue'
import { useApiMutation, useApiQuery } from '@/composables/useApi'
import { useConfirm } from '@/composables/useConfirm'
import { api } from '@/lib/api'
import { animalCode, fmtDate, fmtDateTime, formatAddress, maskCpf, todayISO, whatsappLink } from '@/lib/format'
import { ageLabel, sexLabel, speciesLabel } from '@/lib/animal'
import { adoptionStatusTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import { ADOPTION_LOCATION, ADOPTION_STATUS } from '@shared/constants'
import type { Adoption, UploadedFile } from '@shared/types'

const route = useRoute()
const session = useSession()
const { confirm } = useConfirm()
const id = computed(() => route.params.id as string)
const justCreated = ref(route.query.nova === '1')

const q = useApiQuery<Adoption>(['adoptions', id], () => `/adoptions/${id.value}`)
const ad = computed(() => q.data.value)
const wa = computed(() => whatsappLink(ad.value?.person?.whatsapp || ad.value?.person?.phone, `Olá ${ad.value?.person?.name?.split(' ')[0]}! Aqui é da ${session.org?.name}, tudo bem com o(a) ${ad.value?.animal?.name}?`))

// documentos (edição inline)
const docs = ref<UploadedFile[]>([])
watch(() => ad.value?.documents, (d) => d && (docs.value = [...d]), { immediate: true })
const saveDocs = useApiMutation((documents: UploadedFile[]) => api.patch(`/adoptions/${id.value}`, { documents }), { invalidate: ['adoptions'], success: 'Documentos atualizados' })
watch(docs, (d) => {
  if (ad.value && JSON.stringify(d) !== JSON.stringify(ad.value.documents)) saveDocs.mutate(d)
})

// castração
const castOpen = ref(false)
const castDate = ref(todayISO())
const castration = useApiMutation(() => api.post(`/adoptions/${id.value}/castration`, { date: castDate.value }), {
  invalidate: ['adoptions', 'animals'],
  success: 'Castração registrada',
  onSuccess: () => (castOpen.value = false),
})

// devolução
const retOpen = ref(false)
const ret = ref({ date: todayISO(), reason: '', newStatus: 'available' })
const giveBack = useApiMutation(() => api.post(`/adoptions/${id.value}/return`, ret.value), {
  invalidate: ['adoptions', 'animals'],
  success: 'Devolução registrada — o animal voltou para a ONG',
  onSuccess: () => (retOpen.value = false),
})

const cancel = useApiMutation(() => api.post(`/adoptions/${id.value}/cancel`), { invalidate: ['adoptions', 'animals'], success: 'Adoção cancelada' })
async function askCancel() {
  if (await confirm({ title: 'Cancelar esta adoção?', description: 'Use quando o registro foi feito por engano. O animal volta como "Disponível". Para devoluções, use "Registrar devolução".', confirmText: 'Cancelar adoção', destructive: true }))
    cancel.mutate()
}

const vaccines = computed(() => ((q.data.value as any)?.vaccines ?? []) as { date: string; title: string; type: string }[])

// adoção de vários animais de uma vez: um termo por animal
const groupCount = computed(() => ad.value?.group?.length ?? 1)
const groupNames = computed(() =>
  (ad.value?.group?.length ? ad.value.group.map((g) => g.animal.name) : [ad.value?.animal?.name ?? '']).join(', ').replace(/, ([^,]*)$/, ' e $1'),
)
const termsUrl = computed(() =>
  groupCount.value > 1 ? `/painel/adocoes/termos?ids=${ad.value!.group!.map((g) => g.id).join(',')}` : `/painel/adocoes/${ad.value?.id}/termo`,
)
</script>

<template>
  <div>
    <PageHeader :title="ad ? `Adoção de ${ad.animal?.name}` : 'Adoção'" :back="{ name: 'adoptions' }">
      <template #description><span v-if="ad">Registrada em {{ fmtDateTime(ad.createdAt) }}</span></template>
      <template #actions>
        <Button v-if="ad" as-child>
          <a :href="termsUrl" target="_blank"><Printer /> {{ groupCount > 1 ? `Imprimir ${groupCount} termos` : 'Imprimir termo' }}</a>
        </Button>
      </template>
    </PageHeader>

    <div v-if="justCreated && ad" class="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
      <CircleCheck class="size-6 shrink-0 text-emerald-600" />
      <div class="flex-1 text-sm text-emerald-900">
        <p class="font-semibold">Adoção concluída! {{ groupNames }} {{ groupCount > 1 ? 'ganharam' : 'ganhou' }} uma família.</p>
        <p>Imprima {{ groupCount > 1 ? `os ${groupCount} termos (um por animal)` : 'o termo' }} em 2 vias para assinatura.</p>
      </div>
      <Button variant="outline" class="bg-white" @click="justCreated = false">Fechar</Button>
    </div>

    <div v-if="q.isLoading.value" class="h-64 animate-pulse rounded-2xl bg-muted" />

    <div v-else-if="ad" class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      <div class="grid min-w-0 content-start gap-4">
        <!-- Adotados juntos -->
        <div v-if="groupCount > 1" class="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
          <Link2 class="size-4 shrink-0" /> Adotados juntos:
          <RouterLink
            v-for="g in ad.group"
            :key="g.id"
            :to="{ name: 'adoption', params: { id: g.id } }"
            class="flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 font-medium"
            :class="g.id === ad.id ? 'bg-violet-600 text-white' : 'bg-white shadow-xs'"
          >
            <AnimalAvatar :photo-key="g.animal.photoKey" :species="g.animal.species" size="sm" class="size-6 rounded-full" /> {{ g.animal.name }}
          </RouterLink>
        </div>
        <!-- Animal + adotante -->
        <div class="grid gap-4 xl:grid-cols-2">
          <RouterLink :to="{ name: 'animal', params: { id: ad.animalId } }" class="flex gap-3 rounded-2xl border bg-card p-4 hover:border-brand-500/40">
            <AnimalAvatar :photo-key="ad.animal?.photoKey" :species="ad.animal?.species" size="lg" />
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">Animal {{ animalCode(ad.animal?.code) }}</p>
              <p class="truncate font-semibold">{{ ad.animal?.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ ad.animal && [speciesLabel(ad.animal), sexLabel(ad.animal), ageLabel(ad.animal)].filter(Boolean).join(' · ') }}</p>
            </div>
          </RouterLink>
          <div class="rounded-2xl border bg-card p-4">
            <p class="text-xs text-muted-foreground">Adotante</p>
            <RouterLink :to="{ name: 'person', params: { id: ad.personId } }" class="font-semibold hover:text-brand-600">{{ ad.person?.name }}</RouterLink>
            <p class="text-xs text-muted-foreground">{{ ad.person?.cpf ? `CPF ${maskCpf(ad.person.cpf)}` : 'CPF não informado' }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ ad.person && formatAddress(ad.person) }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <Button v-if="wa" size="sm" variant="outline" as-child><a :href="wa" target="_blank" rel="noopener"><MessageCircle /> WhatsApp</a></Button>
              <Button v-if="ad.person?.phone" size="sm" variant="outline" as-child><a :href="`tel:${ad.person.phone}`"><Phone /> Ligar</a></Button>
            </div>
          </div>
        </div>

        <!-- Requisitos -->
        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 font-semibold">Requisitos verificados</h3>
          <ul v-if="Object.keys(ad.requirements).length" class="grid gap-2 text-sm">
            <li v-for="(ok, r) in ad.requirements" :key="r" class="flex items-start gap-2">
              <BadgeCheck v-if="ok" class="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <Ban v-else class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span :class="!ok && 'text-muted-foreground line-through'">{{ r }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted-foreground">Nenhum requisito registrado.</p>
        </div>

        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 font-semibold">Documentos e fotos</h3>
          <FileUpload v-model="docs" folder="adoptions" />
        </div>

        <div v-if="ad.notes || ad.returnReason" class="rounded-2xl border bg-card p-5 text-sm">
          <template v-if="ad.returnReason">
            <h3 class="mb-1 font-semibold">Devolução em {{ fmtDate(ad.returnedAt) }}</h3>
            <p class="mb-3 whitespace-pre-line text-foreground/80">{{ ad.returnReason }}</p>
          </template>
          <template v-if="ad.notes">
            <h3 class="mb-1 font-semibold">Observações</h3>
            <p class="whitespace-pre-line text-foreground/80">{{ ad.notes }}</p>
          </template>
        </div>
      </div>

      <!-- Lateral -->
      <aside class="grid content-start gap-4">
        <div class="rounded-2xl border bg-card p-5">
          <dl class="grid gap-3 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">Status</dt><dd><Pill :tone="adoptionStatusTone[ad.status]" size="md">{{ ADOPTION_STATUS[ad.status as keyof typeof ADOPTION_STATUS] }}</Pill></dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Data</dt><dd class="font-medium">{{ fmtDate(ad.date) }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Local</dt><dd class="font-medium">{{ ad.location ? ADOPTION_LOCATION[ad.location as keyof typeof ADOPTION_LOCATION] : '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Termo aceito</dt><dd class="font-medium">{{ fmtDateTime(ad.termAcceptedAt) }}</dd></div>
          </dl>
        </div>

        <div class="rounded-2xl border bg-card p-5">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="flex items-center gap-2 font-semibold"><Scissors class="size-4 text-violet-600" /> Castração</h3>
            <CastrationBadge :done="ad.castrationDone" :deadline="ad.castrationDeadline" :status="ad.status" />
          </div>
          <p class="text-sm text-muted-foreground">
            <template v-if="ad.castrationDone">{{ ad.castrationDoneAt ? `Realizada em ${fmtDate(ad.castrationDoneAt)}.` : 'Animal já castrado.' }}</template>
            <template v-else-if="ad.castrationDeadline">Prazo: {{ fmtDate(ad.castrationDeadline) }} — por conta do adotante.</template>
            <template v-else>Sem prazo definido.</template>
          </p>
          <Button v-if="!ad.castrationDone && ad.status === 'active'" variant="outline" class="mt-3 w-full" @click="castOpen = true">
            <Scissors /> Marcar como castrado
          </Button>
        </div>

        <div class="rounded-2xl border bg-card p-5">
          <h3 class="mb-2 font-semibold">Vacinas e vermífugos</h3>
          <ul v-if="vaccines.length" class="grid gap-1.5 text-sm">
            <li v-for="v in vaccines" :key="v.date + v.title" class="flex justify-between gap-2">
              <span class="truncate">{{ v.title }}</span><span class="text-muted-foreground">{{ fmtDate(v.date) }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted-foreground">Nenhum registro.</p>
        </div>

        <div v-if="ad.status === 'active' && session.can('adoptions.manage')" class="grid gap-2">
          <Button variant="outline" @click="retOpen = true"><Undo2 /> Registrar devolução</Button>
          <Button variant="ghost" class="text-rose-600 hover:bg-rose-50 hover:text-rose-700" @click="askCancel"><Ban /> Cancelar adoção</Button>
        </div>
      </aside>
    </div>

    <!-- Castração -->
    <Dialog v-model:open="castOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Castração realizada</DialogTitle>
          <DialogDescription>Atualiza a ficha do animal e encerra a pendência.</DialogDescription>
        </DialogHeader>
        <FormField label="Data da castração"><Input v-model="castDate" type="date" :max="todayISO()" /></FormField>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="castOpen = false">Cancelar</Button>
          <Button :disabled="castration.isPending.value" @click="castration.mutate()">
            <LoaderCircle v-if="castration.isPending.value" class="animate-spin" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Devolução -->
    <Dialog v-model:open="retOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar devolução</DialogTitle>
          <DialogDescription>O animal volta para a ONG e fica disponível para nova adoção.</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4">
          <FormField label="Data"><Input v-model="ret.date" type="date" :max="todayISO()" /></FormField>
          <FormField label="Motivo"><Textarea v-model="ret.reason" rows="3" placeholder="Por que o animal foi devolvido?" /></FormField>
          <FormField label="Status do animal">
            <ChipGroup v-model="ret.newStatus" :options="{ available: 'Disponível', sheltered: 'No abrigo', treatment: 'Em tratamento' }" size="sm" />
          </FormField>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="retOpen = false">Cancelar</Button>
          <Button :disabled="giveBack.isPending.value || ret.reason.trim().length < 3" @click="giveBack.mutate()">
            <LoaderCircle v-if="giveBack.isPending.value" class="animate-spin" /> Registrar devolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
