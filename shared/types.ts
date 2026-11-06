// Tipos compartilhados entre Worker e front-end (formas de resposta da API)

export interface OrgSettings {
  /** kg de ração distribuídos por dia, por espécie (para "dias até esgotar") */
  foodDailyKg?: { dog?: number; cat?: number }
  /** idade (meses) em que filhotes devem ser castrados */
  castrationMonths?: number
  /** prazo padrão (dias) para castração de adultos não castrados */
  castrationDaysAdult?: number
  /** texto do termo de adoção — aceita {{ong}} */
  adoptionTerm?: string
  /** declaração assinada pelo adotante — aceita {{ong}} */
  adoptionDeclaration?: string
  /** responsabilidades do adotante (uma por linha) */
  adopterResponsibilities?: string
  /** requisitos obrigatórios por espécie (um por linha) */
  requirementsDog?: string
  requirementsCat?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  legalName: string | null
  document: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  website: string | null
  zip: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  logoKey: string | null
  settings: OrgSettings
}

export interface MeResponse {
  user: { id: string; name: string; email: string; image: string | null }
  memberships: {
    id: string
    orgId: string
    role: string
    permissions: string[]
    org: Pick<Organization, 'id' | 'name' | 'slug' | 'logoKey'>
  }[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface Animal {
  id: string
  code: number
  name: string
  species: string
  sex: string
  ageGroup: string | null
  birthDate: string | null
  breed: string | null
  size: string | null
  coatColor: string | null
  weightKg: number | null
  microchip: string | null
  photoKey: string | null
  status: string
  temperament: string[]
  behavior: string | null
  diseases: string | null
  disabilities: string | null
  specialCare: string | null
  castrated: boolean
  castrationDate: string | null
  vaccinated: boolean
  dewormed: boolean
  bondedWith: string[]
  intakeDate: string
  intakeSource: string | null
  occurrenceNumber: string | null
  intakeStreet: string | null
  intakeNeighborhood: string | null
  intakeCity: string | null
  intakeState: string | null
  reporterId: string | null
  intakeReasons: string[]
  intakeReasonOther: string | null
  intakeCondition: string | null
  intakeProcedures: string[]
  intakeProceduresOther: string | null
  intakeDestination: string | null
  motherWithPups: boolean
  litterMales: number | null
  litterFemales: number | null
  deathDate: string | null
  deathReason: string | null
  deathNotes: string | null
  adoptedAt: string | null
  adopterId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface AnimalDetail extends Animal {
  reporter: Person | null
  adopter: Person | null
  bonded: Pick<Animal, 'id' | 'name' | 'photoKey' | 'species' | 'status' | 'code'>[]
  totalCost: number
}

export interface AnimalEvent {
  id: string
  animalId: string
  type: string
  date: string
  title: string | null
  description: string | null
  nextDate: string | null
  cost: number | null
  data: Record<string, unknown> | null
  createdAt: string
  createdByName?: string | null
}

export interface Person {
  id: string
  name: string
  types: string[]
  cpf: string | null
  rg: string | null
  birthDate: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  zip: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  housingType: string | null
  housingNotes: string | null
  restricted: boolean
  restrictionReason: string | null
  notes: string | null
  createdAt: string
  adoptionsCount?: number
}

export interface Adoption {
  id: string
  animalId: string
  personId: string
  /** adoções feitas juntas (vários animais, mesmo adotante) */
  groupId: string | null
  group?: { id: string; status: string; animal: { id: string; name: string; photoKey: string | null; species: string } }[]
  date: string
  status: string
  location: string | null
  castrationDeadline: string | null
  castrationDone: boolean
  castrationDoneAt: string | null
  requirements: Record<string, boolean>
  documents: UploadedFile[]
  animalSnapshot: Record<string, unknown> | null
  termAcceptedAt: string | null
  notes: string | null
  returnedAt: string | null
  returnReason: string | null
  createdAt: string
  animal?: Pick<Animal, 'id' | 'name' | 'photoKey' | 'species' | 'sex' | 'code' | 'status' | 'breed' | 'size' | 'coatColor' | 'ageGroup' | 'microchip' | 'castrated' | 'vaccinated' | 'dewormed' | 'birthDate'>
  person?: Pick<Person, 'id' | 'name' | 'phone' | 'whatsapp' | 'email' | 'cpf' | 'rg' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'restricted'>
}

export interface UploadedFile {
  key: string
  name: string
  type: string
  label?: string
}

export interface Partner {
  id: string
  name: string
  type: string
  document: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  openAmount?: number
}

export interface Expense {
  id: string
  description: string
  category: string
  amount: number
  partnerId: string | null
  animalId: string | null
  dueDate: string | null
  paymentMethod: string | null
  paid: boolean
  paidAt: string | null
  attachmentKey: string | null
  notes: string | null
  createdAt: string
  partnerName?: string | null
  animalName?: string | null
}

export interface StockItem {
  id: string
  name: string
  kind: string
  species: string | null
  ageGroup: string | null
  unit: string
  quantity: number
  minQuantity: number | null
  brand: string | null
  expiresAt: string | null
  notes: string | null
  updatedAt: string
}

export interface StockMovement {
  id: string
  itemId: string
  type: string
  quantity: number
  balanceAfter: number
  reason: string | null
  date: string
  notes: string | null
  createdAt: string
  itemName?: string
  itemUnit?: string
  createdByName?: string | null
}

export interface Donation {
  id: string
  personId: string | null
  donorName: string | null
  donorEmail: string | null
  amount: number
  method: string
  status: string
  provider: string | null
  providerRef: string | null
  date: string
  notes: string | null
}

export interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
  permissions: string[] | null
  effectivePermissions: string[]
  jobTitle: string | null
  phone: string | null
  active: boolean
  createdAt: string
}

export interface PaymentSettingsPublic {
  pixEnabled: boolean
  pixKey: string | null
  pixKeyType: string | null
  pixName: string | null
  pixCity: string | null
  stripeEnabled: boolean
  stripePublishableKey: string | null
  stripeSecretSet: boolean
  stripeWebhookSet: boolean
  mpEnabled: boolean
  mpPublicKey: string | null
  mpAccessTokenSet: boolean
  mpWebhookSet: boolean
  suggestedAmounts: number[]
  donationMessage: string | null
}

export interface DashboardData {
  animals: {
    active: number
    available: number
    treatment: number
    bySpecies: Record<string, number>
    adoptedThisMonth: number
    intakesThisMonth: number
  }
  food: {
    bySpecies: Record<string, number>
    dailyKg: { dog: number; cat: number }
    daysLeft: { dog: number | null; cat: number | null }
  }
  finance: {
    openTotal: number
    overdueTotal: number
    openByPartner: { partnerId: string | null; name: string; amount: number; count: number }[]
    donationsThisMonth: number
  }
  monthly: { month: string; intakes: number; adoptions: number }[]
  alerts: {
    castrations: { adoptionId: string; animalName: string; personName: string; deadline: string }[]
    upcoming: { animalId: string; animalName: string; type: string; title: string | null; nextDate: string }[]
    lowStock: { id: string; name: string; quantity: number; minQuantity: number; unit: string }[]
  }
  recentAnimals: Pick<Animal, 'id' | 'name' | 'photoKey' | 'species' | 'sex' | 'status' | 'intakeDate' | 'code'>[]
  activity: { id: string; type: string; date: string; title: string | null; animalId: string; animalName: string; createdAt: string }[]
}
