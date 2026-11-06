import type { Component } from 'vue'
import {
  Activity, ClipboardList, FlaskConical, Flower2, HeartHandshake, HeartPulse, NotebookPen, PhoneCall, Pill, Scale,
  Scissors, Stethoscope, Syringe, Undo2,
} from '@lucide/vue'
import { AGE_GROUP, SEX, SIZE, SPECIES } from '@shared/constants'
import { ageFrom } from './format'

export const EVENT_ICON: Record<string, Component> = {
  intake: ClipboardList,
  vaccine: Syringe,
  deworming: Pill,
  castration: Scissors,
  vet_visit: Stethoscope,
  exam: FlaskConical,
  medication: Pill,
  surgery: HeartPulse,
  weight: Scale,
  adoption: HeartHandshake,
  return: Undo2,
  death: Flower2,
  status: Activity,
  followup: PhoneCall,
  note: NotebookPen,
}

export const EVENT_TONE: Record<string, string> = {
  intake: 'bg-sky-50 text-sky-600',
  vaccine: 'bg-emerald-50 text-emerald-600',
  deworming: 'bg-teal-50 text-teal-600',
  castration: 'bg-violet-50 text-violet-600',
  vet_visit: 'bg-brand-50 text-brand-600',
  exam: 'bg-brand-50 text-brand-600',
  medication: 'bg-amber-50 text-amber-600',
  surgery: 'bg-rose-50 text-rose-600',
  weight: 'bg-slate-100 text-slate-600',
  adoption: 'bg-pink-50 text-pink-600',
  return: 'bg-amber-50 text-amber-700',
  death: 'bg-slate-100 text-slate-500',
  status: 'bg-slate-100 text-slate-600',
  followup: 'bg-sky-50 text-sky-600',
  note: 'bg-slate-100 text-slate-600',
}

export const BREEDS = {
  dog: ['SRD (vira-lata)', 'Labrador', 'Golden Retriever', 'Pinscher', 'Poodle', 'Shih Tzu', 'Yorkshire', 'Pit Bull', 'Rottweiler', 'Pastor Alemão', 'Beagle', 'Dachshund', 'Border Collie', 'Husky Siberiano', 'Chow Chow', 'Lhasa Apso'],
  cat: ['SRD (vira-lata)', 'Siamês', 'Persa', 'Maine Coon', 'Angorá', 'Sphynx', 'Bengal', 'Ragdoll'],
}

type AnimalLike = {
  species: string
  sex: string
  ageGroup?: string | null
  birthDate?: string | null
  size?: string | null
  breed?: string | null
}

export function speciesLabel(a: AnimalLike) {
  return SPECIES[a.species as keyof typeof SPECIES] ?? a.species
}
export function sexLabel(a: AnimalLike) {
  return SEX[a.sex as keyof typeof SEX] ?? a.sex
}
export function sizeLabel(a: AnimalLike) {
  return a.size ? SIZE[a.size as keyof typeof SIZE] : null
}
/** Idade calculada pela data estimada ou, na falta, a faixa etária */
export function ageLabel(a: AnimalLike) {
  return ageFrom(a.birthDate) ?? (a.ageGroup ? AGE_GROUP[a.ageGroup as keyof typeof AGE_GROUP] : null)
}
