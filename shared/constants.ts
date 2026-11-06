// Enumerações do domínio com rótulos em PT-BR. As chaves são o que vai para o banco.

export const SPECIES = { dog: 'Cão', cat: 'Gato', other: 'Outro' } as const
export const SEX = { male: 'Macho', female: 'Fêmea', unknown: 'Indefinido' } as const
export const AGE_GROUP = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' } as const
export const SIZE = { small: 'Pequeno', medium: 'Médio', large: 'Grande' } as const

export const ANIMAL_STATUS = {
  sheltered: 'No abrigo',
  available: 'Disponível',
  treatment: 'Em tratamento',
  foster: 'Lar temporário',
  adopted: 'Adotado',
  returned_owner: 'Devolvido ao tutor',
  community: 'Comunitário',
  deceased: 'Óbito',
} as const

/** Status que contam como "animal sob responsabilidade da ONG" */
export const ACTIVE_STATUSES = ['sheltered', 'available', 'treatment', 'foster'] as const
export const ADOPTABLE_STATUSES = ['sheltered', 'available', 'treatment', 'foster'] as const

export const INTAKE_SOURCE = {
  gm: 'Guarda Municipal',
  sma: 'Sec. do Meio Ambiente',
  gate: 'Deixado no portão',
  staff: 'Funcionários/colaboradores',
  board: 'Diretoria',
  community: 'Comunidade',
  authorities: 'Bombeiros/PM/Vig. Sanitária',
  rescue: 'Resgate da ONG',
  other: 'Outro',
} as const

export const INTAKE_REASONS = {
  abandonment: 'Abandono',
  debilitated: 'Debilitado',
  fight: 'Briga / mordidas',
  pregnant: 'Prenhe ou amamentando',
  run_over: 'Atropelado',
  aggressive: 'Agressivo',
  puppies: 'Filhote(s)',
  poisoning: 'Possível envenenamento',
  snake_bite: 'Picada de cobra',
  vulnerable: 'Vulnerável / risco',
  community: 'Comunitário',
  mistreatment: 'Maus-tratos',
  consultation: 'Atendimento/consulta',
  other: 'Outros',
} as const

export const INTAKE_PROCEDURES = { clinical_eval: 'Avaliação clínica', other: 'Outros' } as const

export const INTAKE_DESTINATION = {
  shelter: 'Abrigo',
  return_owner: 'Devolução ao tutor',
  community: 'Comunitário',
  find_owner: 'Procurar tutor',
} as const

export const ADOPTION_LOCATION = { shelter: 'Abrigo', fair: 'Feirinha', foster: 'Lar temporário', other: 'Outro' } as const

export const TEMPERAMENT = {
  docile: 'Dócil',
  playful: 'Brincalhão',
  calm: 'Calmo',
  shy: 'Tímido',
  energetic: 'Agitado',
  good_dogs: 'Convive com cães',
  good_cats: 'Convive com gatos',
  good_kids: 'Convive com crianças',
  reactive: 'Reativo',
  escapist: 'Fujão',
} as const

export const DEATH_REASONS = {
  disease: 'Doença',
  injury: 'Trauma / acidente',
  run_over: 'Atropelamento',
  old_age: 'Idade avançada',
  euthanasia: 'Eutanásia',
  poisoning: 'Envenenamento',
  unknown: 'Causa desconhecida',
  other: 'Outro',
} as const

/** Adotante e tutor são a mesma pessoa para a ONG: um único tipo */
export const PERSON_TYPES = {
  adopter: 'Adotante/tutor',
  reporter: 'Denunciante',
  volunteer: 'Voluntário',
  donor: 'Doador',
  foster: 'Lar temporário',
} as const

export const HOUSING = { house: 'Casa', apartment: 'Apartamento', farm: 'Sítio/Chácara', other: 'Outro' } as const

export const EXPENSE_CATEGORY = {
  veterinary: 'Veterinário',
  castration: 'Castração',
  medicine: 'Medicamentos',
  exams: 'Exames',
  food: 'Ração',
  maintenance: 'Manutenção',
  transport: 'Transporte',
  utilities: 'Contas (água/luz)',
  staff: 'Pessoal',
  other: 'Outros',
} as const

export const PAYMENT_METHOD = {
  pix: 'Pix',
  boleto: 'Boleto',
  card: 'Cartão',
  cash: 'Dinheiro',
  transfer: 'Transferência',
} as const

export const PARTNER_TYPE = {
  clinic: 'Clínica veterinária',
  supplier: 'Fornecedor',
  petshop: 'Pet shop',
  laboratory: 'Laboratório',
  other: 'Outro',
} as const

export const STOCK_KIND = {
  food: 'Ração',
  medicine: 'Medicamento',
  hygiene: 'Higiene',
  cleaning: 'Limpeza',
  accessory: 'Acessório',
  other: 'Outro',
} as const

export const STOCK_UNIT = { kg: 'kg', g: 'g', un: 'un', l: 'L', ml: 'ml', pct: 'pacote', cx: 'caixa' } as const
export const STOCK_SPECIES = { dog: 'Cães', cat: 'Gatos', both: 'Ambos' } as const
export const STOCK_AGE = { all: 'Todas as idades', puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' } as const

export const MOVEMENT_TYPE = { in: 'Entrada', out: 'Saída', adjust: 'Ajuste' } as const
export const MOVEMENT_REASON = {
  donation: 'Doação recebida',
  purchase: 'Compra',
  consumption: 'Consumo / distribuição',
  loss: 'Perda / vencimento',
  transfer: 'Transferência',
  inventory: 'Inventário',
} as const

export const DONATION_METHOD = {
  pix: 'Pix',
  stripe: 'Cartão (Stripe)',
  mercadopago: 'Mercado Pago',
  cash: 'Dinheiro',
  transfer: 'Transferência',
} as const
export const DONATION_STATUS = { pending: 'Pendente', paid: 'Confirmada', failed: 'Falhou', refunded: 'Estornada' } as const

export const EVENT_TYPE = {
  intake: 'Entrada',
  vaccine: 'Vacina',
  deworming: 'Vermífugo',
  castration: 'Castração',
  vet_visit: 'Consulta',
  exam: 'Exame',
  medication: 'Medicação',
  surgery: 'Cirurgia',
  weight: 'Pesagem',
  adoption: 'Adoção',
  return: 'Devolução',
  death: 'Óbito',
  status: 'Status',
  followup: 'Acompanhamento',
  note: 'Anotação',
} as const

/** Tipos de evento que podem ser registrados manualmente na ficha */
export const MANUAL_EVENT_TYPES = [
  'vaccine',
  'deworming',
  'castration',
  'vet_visit',
  'exam',
  'medication',
  'surgery',
  'weight',
  'followup',
  'note',
] as const

export const ADOPTION_STATUS = { active: 'Ativa', returned: 'Devolvida', cancelled: 'Cancelada' } as const

export const PIX_KEY_TYPE = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone', random: 'Chave aleatória' } as const

export const UF = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB',
  'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export type Species = keyof typeof SPECIES
export type Sex = keyof typeof SEX
export type AgeGroup = keyof typeof AGE_GROUP
export type Size = keyof typeof SIZE
export type AnimalStatus = keyof typeof ANIMAL_STATUS
export type EventType = keyof typeof EVENT_TYPE
export type PersonType = keyof typeof PERSON_TYPES
export type StockKind = keyof typeof STOCK_KIND

/** Utilitário para transformar um dicionário de rótulos em tupla de chaves (para z.enum) */
export function keys<T extends Record<string, string>>(o: T) {
  return Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]
}

/** Lista de opções {value,label} para selects */
export function options<T extends Record<string, string>>(o: T) {
  return (Object.entries(o) as [keyof T & string, string][]).map(([value, label]) => ({ value, label }))
}
