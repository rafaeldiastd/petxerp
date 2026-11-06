import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import {
  HandHeart, HeartHandshake, LayoutDashboard, Package, PawPrint, Settings, UserCog, Users, Wallet,
} from '@lucide/vue'
import type { Permission } from '@shared/permissions'

export interface NavItem {
  title: string
  icon?: Component
  to?: RouteLocationRaw & { name: string }
  perm?: Permission[]
  children?: NavItem[]
}

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Painel', to: { name: 'dashboard' }, icon: LayoutDashboard },
      { title: 'Animais', to: { name: 'animals' }, icon: PawPrint, perm: ['animals.view'] },
      { title: 'Adoções', to: { name: 'adoptions' }, icon: HeartHandshake, perm: ['adoptions.view'] },
      { title: 'Pessoas', to: { name: 'people' }, icon: Users, perm: ['people.view'] },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Estoque', to: { name: 'stock' }, icon: Package, perm: ['stock.view'] },
      {
        title: 'Financeiro',
        icon: Wallet,
        perm: ['finance.view'],
        children: [
          { title: 'Despesas', to: { name: 'expenses' } },
          { title: 'Clínicas e parceiros', to: { name: 'partners' } },
        ],
      },
      { title: 'Doações', to: { name: 'donations' }, icon: HandHeart, perm: ['donations.view'] },
    ],
  },
  {
    label: 'Organização',
    items: [
      { title: 'Equipe', to: { name: 'team' }, icon: UserCog, perm: ['team.manage'] },
      {
        title: 'Configurações',
        icon: Settings,
        perm: ['settings.manage', 'donations.settings'],
        children: [
          { title: 'ONG e adoção', to: { name: 'settings' }, perm: ['settings.manage'] },
          { title: 'Pagamentos', to: { name: 'payments' }, perm: ['donations.settings'] },
        ],
      },
    ],
  },
]

/** Rotas consideradas "dentro" de cada item (para destacar o menu em páginas filhas) */
export const NAV_MATCH: Record<string, string[]> = {
  animals: ['animals', 'animal', 'animal-new', 'animal-edit'],
  adoptions: ['adoptions', 'adoption', 'adoption-new'],
  people: ['people', 'person'],
}
