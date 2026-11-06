import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { HandHeart, HeartHandshake, PackagePlus, PawPrint, Receipt, UserPlus } from '@lucide/vue'
import type { Permission } from '@shared/permissions'

export interface QuickAction {
  title: string
  description: string
  icon: Component
  to: RouteLocationRaw
  perm: Permission[]
  tone: string
}

/** Atalhos do painel, do botão "Novo" e da barra inferior no celular */
export const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Novo animal', description: 'Boletim de entrada', icon: PawPrint, to: { name: 'animal-new' }, perm: ['animals.create'], tone: 'bg-brand-50 text-brand-600' },
  { title: 'Nova adoção', description: 'Termo e checklist', icon: HeartHandshake, to: { name: 'adoption-new' }, perm: ['adoptions.create'], tone: 'bg-rose-50 text-rose-600' },
  { title: 'Nova pessoa', description: 'Adotante, tutor...', icon: UserPlus, to: { name: 'people', query: { novo: '1' } }, perm: ['people.edit'], tone: 'bg-sky-50 text-sky-600' },
  { title: 'Movimentar estoque', description: 'Entrada ou saída', icon: PackagePlus, to: { name: 'stock', query: { mov: '1' } }, perm: ['stock.move'], tone: 'bg-amber-50 text-amber-600' },
  { title: 'Lançar despesa', description: 'Clínicas e contas', icon: Receipt, to: { name: 'expenses', query: { nova: '1' } }, perm: ['finance.manage'], tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'Registrar doação', description: 'Pix, dinheiro...', icon: HandHeart, to: { name: 'donations', query: { nova: '1' } }, perm: ['donations.manage'], tone: 'bg-pink-50 text-pink-600' },
]
