import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { toast } from 'vue-sonner'
import { useSession } from '@/stores/session'
import type { Permission } from '@shared/permissions'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    guestOnly?: boolean
    perm?: Permission[]
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/painel' },
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true, guestOnly: true, title: 'Entrar' } },
  { path: '/cadastro', name: 'signup', component: () => import('@/views/auth/SignupView.vue'), meta: { public: true, guestOnly: true, title: 'Criar conta' } },
  { path: '/onboarding', name: 'onboarding', component: () => import('@/views/auth/OnboardingView.vue'), meta: { title: 'Cadastre sua ONG' } },
  { path: '/doar/:slug', name: 'donate', component: () => import('@/views/public/DonatePage.vue'), meta: { public: true, title: 'Doe' } },
  { path: '/doar/:slug/obrigado', name: 'donate-thanks', component: () => import('@/views/public/DonateThanks.vue'), meta: { public: true, title: 'Obrigado!' } },
  {
    // vários termos de uma vez (adoção de mais de um animal): ?ids=a,b,c
    path: '/painel/adocoes/termos',
    name: 'adoption-terms',
    component: () => import('@/views/adoptions/AdoptionTermPrint.vue'),
    meta: { perm: ['adoptions.view'], title: 'Termos de adoção' },
  },
  {
    path: '/painel/adocoes/:id/termo',
    name: 'adoption-term',
    component: () => import('@/views/adoptions/AdoptionTermPrint.vue'),
    meta: { perm: ['adoptions.view'], title: 'Termo de adoção' },
  },
  {
    path: '/painel',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Painel' } },
      { path: 'animais', name: 'animals', component: () => import('@/views/animals/AnimalsView.vue'), meta: { title: 'Animais', perm: ['animals.view'] } },
      { path: 'animais/novo', name: 'animal-new', component: () => import('@/views/animals/AnimalFormView.vue'), meta: { title: 'Novo animal', perm: ['animals.create'] } },
      { path: 'animais/:id', name: 'animal', component: () => import('@/views/animals/AnimalDetailView.vue'), meta: { title: 'Ficha do animal', perm: ['animals.view'] } },
      { path: 'animais/:id/editar', name: 'animal-edit', component: () => import('@/views/animals/AnimalFormView.vue'), meta: { title: 'Editar animal', perm: ['animals.edit'] } },
      { path: 'adocoes', name: 'adoptions', component: () => import('@/views/adoptions/AdoptionsView.vue'), meta: { title: 'Adoções', perm: ['adoptions.view'] } },
      { path: 'adocoes/nova', name: 'adoption-new', component: () => import('@/views/adoptions/AdoptionWizardView.vue'), meta: { title: 'Nova adoção', perm: ['adoptions.create'] } },
      { path: 'adocoes/:id', name: 'adoption', component: () => import('@/views/adoptions/AdoptionDetailView.vue'), meta: { title: 'Adoção', perm: ['adoptions.view'] } },
      { path: 'pessoas', name: 'people', component: () => import('@/views/people/PeopleView.vue'), meta: { title: 'Pessoas', perm: ['people.view'] } },
      { path: 'pessoas/:id', name: 'person', component: () => import('@/views/people/PersonDetailView.vue'), meta: { title: 'Pessoa', perm: ['people.view'] } },
      { path: 'estoque', name: 'stock', component: () => import('@/views/stock/StockView.vue'), meta: { title: 'Estoque', perm: ['stock.view'] } },
      { path: 'financeiro', name: 'expenses', component: () => import('@/views/finance/ExpensesView.vue'), meta: { title: 'Despesas', perm: ['finance.view'] } },
      { path: 'financeiro/parceiros', name: 'partners', component: () => import('@/views/finance/PartnersView.vue'), meta: { title: 'Clínicas e parceiros', perm: ['finance.view'] } },
      { path: 'doacoes', name: 'donations', component: () => import('@/views/donations/DonationsView.vue'), meta: { title: 'Doações', perm: ['donations.view'] } },
      { path: 'equipe', name: 'team', component: () => import('@/views/team/TeamView.vue'), meta: { title: 'Equipe', perm: ['team.manage'] } },
      { path: 'configuracoes', name: 'settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { title: 'Configurações', perm: ['settings.manage'] } },
      { path: 'configuracoes/pagamentos', name: 'payments', component: () => import('@/views/donations/PaymentSettingsView.vue'), meta: { title: 'Pagamentos', perm: ['donations.settings'] } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { public: true, title: 'Página não encontrada' } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.beforeEach(async (to) => {
  if (to.meta.public && !to.meta.guestOnly) return true
  const session = useSession()
  await session.load().catch(() => null)

  if (to.meta.guestOnly) {
    if (!session.user) return true
    return session.memberships.length ? { name: 'dashboard' } : { name: 'onboarding' }
  }
  if (!session.user) return { name: 'login', query: to.fullPath !== '/painel' ? { next: to.fullPath } : {} }
  if (to.name === 'onboarding') return true
  if (!session.memberships.length) return { name: 'onboarding' }
  if (to.meta.perm && !session.can(...to.meta.perm)) {
    toast.error('Você não tem acesso a esta página')
    return { name: 'dashboard' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Petx ERP` : 'Petx ERP'
})
