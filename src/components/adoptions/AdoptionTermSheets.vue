<script lang="ts">
import type { Adoption, Organization, Person } from '@shared/types'

export type TermData = Adoption & {
  personFull: Person
  vaccines: { date: string; title: string; type: string }[]
  org: Organization
  termSnapshot?: { term: string; declaration: string; responsibilities: string } | null
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import Logo from '@/components/common/Logo.vue'
import { fileUrl } from '@/lib/api'
import { ageLabel } from '@/lib/animal'
import { fmtDate, fmtDateLong, formatAddress, maskCpf } from '@/lib/format'
import { lines, withDefaults as withOrgDefaults } from '@shared/defaults'
import { ADOPTION_LOCATION, AGE_GROUP, SIZE } from '@shared/constants'

/** As 2 folhas A4 de uma adoção: Termo de adoção + Responsabilidades do adotante */

const props = defineProps<{ d: TermData }>()
const d = computed(() => props.d)
const snap = computed(() => (d.value.animalSnapshot ?? {}) as Record<string, any>)
const settings = computed(() => withOrgDefaults(d.value.org?.settings))
const texts = computed(() => {
  const s = d.value.termSnapshot
  const org = d.value.org?.name ?? 'ONG'
  return {
    term: s?.term ?? settings.value.adoptionTerm.replaceAll('{{ong}}', org),
    declaration: s?.declaration ?? settings.value.adoptionDeclaration.replaceAll('{{ong}}', org),
    responsibilities: lines(s?.responsibilities ?? settings.value.adopterResponsibilities.replaceAll('{{ong}}', org)),
  }
})
const p = computed(() => d.value.personFull)
const vaccineDoses = computed(() => (d.value.vaccines ?? []).filter((v) => v.type === 'vaccine'))
const dewormed = computed(() => (d.value.vaccines ?? []).some((v) => v.type === 'deworming') || snap.value.dewormed)
const reqDog = computed(() => lines(settings.value.requirementsDog))
const reqCat = computed(() => lines(settings.value.requirementsCat))
const orgAddress = computed(() => (d.value.org ? formatAddress(d.value.org) : ''))
const label = (dict: Record<string, string>, k?: string | null) => (k ? (dict[k] ?? k) : '')
const mark = (on: boolean) => (on ? 'X' : '  ')
</script>

<template>
  <!-- Página 1: Termo -->
  <article class="sheet">
    <header class="flex items-center justify-between border-b-2 border-slate-900 pb-3">
      <div class="flex items-center gap-3">
        <img v-if="d.org.logoKey" :src="fileUrl(d.org.logoKey)!" class="h-12 w-auto" alt="" />
        <div>
          <p class="text-base font-bold">{{ d.org.legalName || d.org.name }}</p>
          <p class="text-[11px] text-slate-600">{{ [d.org.document && `CNPJ ${d.org.document}`, d.org.phone, d.org.email].filter(Boolean).join(' · ') }}</p>
        </div>
      </div>
      <div class="text-right">
        <h1 class="text-lg font-bold tracking-wide">TERMO DE ADOÇÃO</h1>
        <p class="text-xs">Data da adoção: <b>{{ fmtDate(d.date) }}</b></p>
      </div>
    </header>

    <p class="mt-4 text-[12.5px] leading-relaxed whitespace-pre-line">{{ texts.term }}</p>

    <div class="mt-3 flex justify-end">
      <span class="rounded border-2 border-slate-900 px-3 py-1 text-sm font-bold">
        CASTRAR EM: {{ d.castrationDone ? 'JÁ CASTRADO' : fmtDate(d.castrationDeadline) }}
      </span>
    </div>

    <h2 class="section">Dados do adotante</h2>
    <div class="grid grid-cols-6 gap-x-4 gap-y-2 text-[12.5px]">
      <div class="field col-span-6"><span>Nome:</span> {{ p?.name }}</div>
      <div class="field col-span-3"><span>RG:</span> {{ p?.rg }}</div>
      <div class="field col-span-3"><span>CPF:</span> {{ maskCpf(p?.cpf) }}</div>
      <div class="field col-span-6"><span>Endereço residencial:</span> {{ [p?.street, p?.number, p?.complement].filter(Boolean).join(', ') }}</div>
      <div class="field col-span-2"><span>Bairro:</span> {{ p?.neighborhood }}</div>
      <div class="field col-span-3"><span>Cidade:</span> {{ p?.city }}</div>
      <div class="field col-span-1"><span>UF:</span> {{ p?.state }}</div>
      <div class="field col-span-3"><span>Contato:</span> {{ [p?.phone, p?.whatsapp].filter(Boolean).join(' / ') }}</div>
      <div class="field col-span-3"><span>E-mail:</span> {{ p?.email }}</div>
    </div>

    <h2 class="section">Dados do animal</h2>
    <div class="grid grid-cols-6 gap-x-4 gap-y-2 text-[12.5px]">
      <div class="field col-span-2"><span>Nome:</span> {{ snap.name ?? d.animal?.name }}</div>
      <div class="field col-span-2">({{ mark(snap.species === 'dog') }}) Cão &nbsp; ({{ mark(snap.species === 'cat') }}) Gato</div>
      <div class="field col-span-2">({{ mark(snap.sex === 'male') }}) Macho &nbsp; ({{ mark(snap.sex === 'female') }}) Fêmea</div>
      <div class="field col-span-3"><span>Idade:</span> {{ label(AGE_GROUP, snap.ageGroup) }} {{ ageLabel({ species: snap.species, sex: snap.sex, birthDate: snap.birthDate }) ? `(≈ ${ageLabel({ species: snap.species, sex: snap.sex, birthDate: snap.birthDate })})` : '' }}</div>
      <div class="field col-span-3"><span>Local:</span> {{ label(ADOPTION_LOCATION, d.location) }}</div>
      <div class="field col-span-2"><span>Raça:</span> {{ snap.breed || 'SRD' }}</div>
      <div class="field col-span-2"><span>Porte:</span> {{ label(SIZE, snap.size) }}</div>
      <div class="field col-span-2"><span>Cor/pelagem:</span> {{ snap.coatColor }}</div>
      <div class="field col-span-2"><span>Castrado:</span> ({{ mark(!!snap.castrated) }}) Sim ({{ mark(!snap.castrated) }}) Não</div>
      <div class="field col-span-4">
        <span>Vacinado:</span> ({{ mark(!!snap.vaccinated) }}) Sim ({{ mark(!snap.vaccinated) }}) Não
        <template v-for="(v, i) in vaccineDoses.slice(0, 3)" :key="i"> &nbsp; {{ i + 1 }}ª dose {{ fmtDate(v.date) }}</template>
      </div>
      <div class="field col-span-2"><span>Vermífugo:</span> ({{ mark(dewormed) }}) Sim ({{ mark(!dewormed) }}) Não</div>
      <div class="field col-span-4"><span>Número do chip:</span> {{ snap.microchip }}</div>
    </div>

    <h2 class="section">Declaração</h2>
    <p class="text-[12.5px] leading-relaxed whitespace-pre-line">{{ texts.declaration }}</p>

    <div class="mt-14 grid grid-cols-2 gap-10 text-center text-[12px]">
      <div class="border-t border-slate-900 pt-1">Adotante<br /><b>{{ p?.name }}</b></div>
      <div class="border-t border-slate-900 pt-1">{{ d.org.name }}</div>
    </div>

    <footer class="mt-auto border-t pt-2 text-center text-[10px] text-slate-500">
      {{ d.org.legalName || d.org.name }}<template v-if="orgAddress"> · {{ orgAddress }}</template>
      <template v-if="d.org.whatsapp"> · WhatsApp {{ d.org.whatsapp }}</template>
      <template v-if="d.org.instagram"> · {{ d.org.instagram }}</template>
    </footer>
  </article>

  <!-- Página 2: Responsabilidades -->
  <article class="sheet">
    <h1 class="text-center text-base font-bold tracking-wide underline">RESPONSABILIDADES DO ADOTANTE</h1>

    <h2 class="mt-4 text-[12.5px] font-bold">PARA ADOTAR FELINOS (Gatos), é obrigatório:</h2>
    <ul class="list-disc pl-6 text-[12px] leading-relaxed"><li v-for="r in reqCat" :key="r">{{ r }}</li></ul>
    <h2 class="mt-3 text-[12.5px] font-bold">PARA ADOTAR CANINOS (Cães), é obrigatório:</h2>
    <ul class="list-disc pl-6 text-[12px] leading-relaxed"><li v-for="r in reqDog" :key="r">{{ r }}</li></ul>

    <h2 class="mt-4 text-[12.5px] font-bold">Antes de adotar qualquer animal, verificar:</h2>
    <ul class="list-disc space-y-1 pl-6 text-[11.5px] leading-snug">
      <li v-for="r in texts.responsibilities" :key="r">{{ r }}</li>
    </ul>

    <p class="mt-6 text-[12px] leading-relaxed">
      Eu, <b>{{ p?.name }}</b>, CPF <b>{{ maskCpf(p?.cpf) || '_______________' }}</b>, confirmo para os devidos fins que fui devidamente
      informado(a) sobre as questões acima descritas, estando de acordo e ciente de que assumo a responsabilidade pela vida do animal
      <b>{{ snap.name ?? d.animal?.name }}</b> que acabo de adotar; por isso assino este documento.
    </p>
    <p class="mt-4 text-[12px]">{{ d.org.city || '__________' }}, {{ fmtDateLong(d.date) }}.</p>
    <div class="mx-auto mt-14 w-2/3 border-t border-slate-900 pt-1 text-center text-[12px]">Assinatura do adotante</div>

    <footer class="mt-auto flex items-center justify-between border-t pt-2 text-[10px] text-slate-400">
      <span>Documento gerado pelo Petx ERP</span>
      <Logo class="h-4 opacity-60" />
    </footer>
  </article>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  width: 210mm;
  max-width: 100%;
  min-height: 297mm;
  margin: 0 auto 1.5rem;
  padding: 14mm 16mm;
  background: white;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
  color: #0f172a;
}
.section {
  margin: 1rem 0 0.5rem;
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
}
.field {
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 2px;
  min-height: 1.4rem;
}
.field > span {
  color: #475569;
  margin-right: 0.25rem;
}
@media print {
  .sheet {
    width: auto;
    min-height: calc(297mm - 28mm);
    margin: 0;
    padding: 0;
    box-shadow: none;
    break-after: page;
  }
  .sheet:last-child {
    break-after: auto;
  }
}
</style>
