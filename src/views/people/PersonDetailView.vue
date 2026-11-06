<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { HandHeart, HeartHandshake, Mail, MapPin, MessageCircle, Pencil, Phone, ShieldAlert, Siren } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import Pill from '@/components/common/Pill.vue'
import AnimalAvatar from '@/components/common/AnimalAvatar.vue'
import CastrationBadge from '@/components/adoptions/CastrationBadge.vue'
import PersonFormDialog from '@/components/people/PersonFormDialog.vue'
import { useApiQuery } from '@/composables/useApi'
import { fmtDate, fmtMoney, formatAddress, initials, maskCpf, whatsappLink } from '@/lib/format'
import { adoptionStatusTone, animalStatusTone, donationStatusTone, personTypeTone } from '@/lib/status'
import { useSession } from '@/stores/session'
import { ADOPTION_STATUS, ANIMAL_STATUS, DONATION_METHOD, DONATION_STATUS, HOUSING, PERSON_TYPES } from '@shared/constants'
import type { Person } from '@shared/types'

const route = useRoute()
const session = useSession()
const id = computed(() => route.params.id as string)
type Detail = Person & { adoptions: any[]; reported: any[]; donations: any[] }
const q = useApiQuery<Detail>(['people', id], () => `/people/${id.value}`)
const p = computed(() => q.data.value)
const wa = computed(() => whatsappLink(p.value?.whatsapp || p.value?.phone))
const editOpen = ref(false)
</script>

<template>
  <div>
    <PageHeader :title="p?.name ?? 'Carregando...'" :back="{ name: 'people' }">
      <template #actions>
        <Button v-if="wa" variant="outline" as-child><a :href="wa" target="_blank" rel="noopener"><MessageCircle /> WhatsApp</a></Button>
        <Button v-if="p && session.can('people.edit')" variant="outline" @click="editOpen = true"><Pencil /> Editar</Button>
      </template>
    </PageHeader>

    <div v-if="q.isLoading.value" class="h-64 animate-pulse rounded-2xl bg-muted" />
    <div v-else-if="p" class="grid gap-4 lg:grid-cols-[340px_1fr]">
      <aside class="grid content-start gap-4">
        <div class="rounded-2xl border bg-card p-5">
          <div class="flex items-center gap-3">
            <span class="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">{{ initials(p.name) }}</span>
            <div class="min-w-0">
              <p class="truncate font-semibold">{{ p.name }}</p>
              <div class="mt-1 flex flex-wrap gap-1">
                <Pill v-for="t in p.types" :key="t" :tone="personTypeTone[t]">{{ PERSON_TYPES[t as keyof typeof PERSON_TYPES] }}</Pill>
              </div>
            </div>
          </div>
          <div v-if="p.restricted" class="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <ShieldAlert class="mt-0.5 size-4 shrink-0" />
            <span><b>Restrição para adoção.</b> {{ p.restrictionReason }}</span>
          </div>
          <dl class="mt-4 grid gap-3 text-sm">
            <div class="flex gap-2"><Phone class="mt-0.5 size-4 text-muted-foreground" /><span>{{ [p.phone, p.whatsapp].filter(Boolean).join(' · ') || '—' }}</span></div>
            <div class="flex gap-2"><Mail class="mt-0.5 size-4 text-muted-foreground" /><span class="break-all">{{ p.email || '—' }}</span></div>
            <div class="flex gap-2"><MapPin class="mt-0.5 size-4 text-muted-foreground" /><span>{{ formatAddress(p) || '—' }}{{ p.zip ? ` · CEP ${p.zip}` : '' }}</span></div>
          </dl>
          <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-dashed pt-4 text-sm">
            <div><dt class="text-xs text-muted-foreground">CPF</dt><dd class="font-medium">{{ maskCpf(p.cpf) || '—' }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">RG</dt><dd class="font-medium">{{ p.rg || '—' }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">Nascimento</dt><dd class="font-medium">{{ fmtDate(p.birthDate) }}</dd></div>
            <div><dt class="text-xs text-muted-foreground">Moradia</dt><dd class="font-medium">{{ p.housingType ? HOUSING[p.housingType as keyof typeof HOUSING] : '—' }}</dd></div>
          </dl>
          <p v-if="p.housingNotes" class="mt-3 text-sm text-muted-foreground">{{ p.housingNotes }}</p>
          <p v-if="p.notes" class="mt-3 border-t border-dashed pt-3 text-sm whitespace-pre-line">{{ p.notes }}</p>
        </div>
      </aside>

      <div class="grid content-start gap-4">
        <section class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 flex items-center gap-2 font-semibold"><HeartHandshake class="size-4 text-brand-600" /> Adoções ({{ p.adoptions.length }})</h3>
          <div v-if="p.adoptions.length" class="grid gap-2">
            <RouterLink v-for="ad in p.adoptions" :key="ad.id" :to="{ name: 'adoption', params: { id: ad.id } }" class="flex items-center gap-3 rounded-xl border p-2.5 hover:bg-muted/50">
              <AnimalAvatar :photo-key="ad.animal.photoKey" :species="ad.animal.species" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ ad.animal.name }}</p>
                <p class="text-xs text-muted-foreground">{{ fmtDate(ad.date) }}</p>
              </div>
              <CastrationBadge :done="ad.castrationDone" :deadline="ad.castrationDeadline" :status="ad.status" />
              <Pill :tone="adoptionStatusTone[ad.status]">{{ ADOPTION_STATUS[ad.status as keyof typeof ADOPTION_STATUS] }}</Pill>
            </RouterLink>
          </div>
          <p v-else class="text-sm text-muted-foreground">Nenhuma adoção.</p>
        </section>

        <section v-if="p.reported.length" class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 flex items-center gap-2 font-semibold"><Siren class="size-4 text-amber-600" /> Animais trazidos / denunciados ({{ p.reported.length }})</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <RouterLink v-for="a in p.reported" :key="a.id" :to="{ name: 'animal', params: { id: a.id } }" class="flex items-center gap-3 rounded-xl border p-2.5 hover:bg-muted/50">
              <AnimalAvatar :photo-key="a.photoKey" :species="a.species" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ a.name }}</p>
                <p class="text-xs text-muted-foreground">Entrada {{ fmtDate(a.intakeDate) }}</p>
              </div>
              <Pill :tone="animalStatusTone[a.status]">{{ ANIMAL_STATUS[a.status as keyof typeof ANIMAL_STATUS] }}</Pill>
            </RouterLink>
          </div>
        </section>

        <section v-if="p.donations.length" class="rounded-2xl border bg-card p-5">
          <h3 class="mb-3 flex items-center gap-2 font-semibold"><HandHeart class="size-4 text-pink-600" /> Doações</h3>
          <div class="grid gap-1.5 text-sm">
            <div v-for="d in p.donations" :key="d.id" class="flex items-center gap-3 border-b py-2 last:border-0">
              <span class="flex-1">{{ fmtDate(d.date) }} · {{ DONATION_METHOD[d.method as keyof typeof DONATION_METHOD] }}</span>
              <Pill :tone="donationStatusTone[d.status]">{{ DONATION_STATUS[d.status as keyof typeof DONATION_STATUS] }}</Pill>
              <span class="w-24 text-right font-semibold">{{ fmtMoney(d.amount) }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <PersonFormDialog v-if="p" v-model:open="editOpen" :person="p" />
  </div>
</template>
