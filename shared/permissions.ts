// Controle de acesso granular. Cada membro tem uma função (preset) e, opcionalmente,
// uma lista personalizada de permissões que substitui o preset.

export const PERMISSION_GROUPS = [
  {
    key: 'animals',
    label: 'Animais',
    items: {
      'animals.view': 'Ver animais',
      'animals.create': 'Cadastrar (boletim de entrada)',
      'animals.edit': 'Editar ficha',
      'animals.medical': 'Registrar saúde (vacinas, consultas)',
      'animals.death': 'Declarar óbito',
      'animals.delete': 'Excluir registros',
    },
  },
  {
    key: 'adoptions',
    label: 'Adoções',
    items: {
      'adoptions.view': 'Ver adoções',
      'adoptions.create': 'Realizar adoções',
      'adoptions.manage': 'Devoluções e cancelamentos',
    },
  },
  {
    key: 'people',
    label: 'Pessoas',
    items: {
      'people.view': 'Ver pessoas',
      'people.edit': 'Cadastrar e editar',
      'people.delete': 'Excluir',
    },
  },
  {
    key: 'stock',
    label: 'Estoque',
    items: {
      'stock.view': 'Ver estoque',
      'stock.move': 'Registrar entradas/saídas',
      'stock.manage': 'Gerenciar itens',
    },
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: {
      'finance.view': 'Ver despesas e parceiros',
      'finance.manage': 'Lançar e pagar despesas',
    },
  },
  {
    key: 'donations',
    label: 'Doações',
    items: {
      'donations.view': 'Ver doações',
      'donations.manage': 'Registrar doações',
      'donations.settings': 'Configurar pagamentos (Stripe, MP, Pix)',
    },
  },
  {
    key: 'admin',
    label: 'Administração',
    items: {
      'team.manage': 'Gerenciar equipe e acessos',
      'settings.manage': 'Configurações da ONG e termos',
    },
  },
] as const

type Group = (typeof PERMISSION_GROUPS)[number]
export type Permission = Group extends infer G ? (G extends { items: infer I } ? keyof I & string : never) : never

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => Object.keys(g.items)) as Permission[]

export const PERMISSION_LABELS = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => Object.entries(g.items)),
) as Record<Permission, string>

export const ROLES = {
  admin: 'Administrador',
  atendimento: 'Atendimento',
  veterinario: 'Veterinário',
  financeiro: 'Financeiro',
  voluntario: 'Voluntário',
} as const
export type Role = keyof typeof ROLES

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Acesso total, inclusive equipe e configurações.',
  atendimento: 'Entrada de animais, adoções e cadastro de pessoas.',
  veterinario: 'Fichas clínicas, vacinas, medicamentos e óbitos.',
  financeiro: 'Despesas, clínicas parceiras, doações e estoque.',
  voluntario: 'Consulta de animais e registro de consumo do estoque.',
}

export const ROLE_PRESETS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  atendimento: [
    'animals.view', 'animals.create', 'animals.edit',
    'adoptions.view', 'adoptions.create', 'adoptions.manage',
    'people.view', 'people.edit',
    'stock.view', 'stock.move',
    'donations.view', 'donations.manage',
  ],
  veterinario: [
    'animals.view', 'animals.create', 'animals.edit', 'animals.medical', 'animals.death',
    'adoptions.view',
    'people.view',
    'stock.view', 'stock.move', 'stock.manage',
    'finance.view',
  ],
  financeiro: [
    'animals.view',
    'adoptions.view',
    'people.view', 'people.edit',
    'stock.view', 'stock.move', 'stock.manage',
    'finance.view', 'finance.manage',
    'donations.view', 'donations.manage', 'donations.settings',
  ],
  voluntario: ['animals.view', 'stock.view', 'stock.move'],
}

export function resolvePermissions(role: string, custom?: string[] | null): Permission[] {
  if (role === 'admin') return ALL_PERMISSIONS
  if (custom && custom.length) return custom.filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p))
  return ROLE_PRESETS[role as Role] ?? []
}
