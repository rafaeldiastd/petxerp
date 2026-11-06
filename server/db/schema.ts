import { sql } from 'drizzle-orm'
import {
  boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'
import type { OrgSettings, UploadedFile } from '../../shared/types'

const ts = (name?: string) => (name ? timestamp(name, { withTimezone: true }) : timestamp({ withTimezone: true }))
const createdAt = () => ts().notNull().defaultNow()
const updatedAt = () => ts().notNull().defaultNow().$onUpdate(() => new Date())
const money = () => numeric({ precision: 12, scale: 2, mode: 'number' })
const qty = () => numeric({ precision: 12, scale: 3, mode: 'number' })

// =====================================================================
// Better Auth (tabelas padrão: user, session, account, verification)
// =====================================================================
export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: ts().notNull(),
    token: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index().on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: ts(),
    refreshTokenExpiresAt: ts(),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
)

export const verification = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: ts().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

// =====================================================================
// Multi-tenant: ONGs e membros (acesso granular)
// =====================================================================
export const organizations = pgTable('organizations', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  legalName: text(),
  document: text(),
  email: text(),
  phone: text(),
  whatsapp: text(),
  instagram: text(),
  website: text(),
  zip: text(),
  street: text(),
  number: text(),
  complement: text(),
  neighborhood: text(),
  city: text(),
  state: text(),
  logoKey: text(),
  settings: jsonb().$type<OrgSettings>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const memberships = pgTable(
  'memberships',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text().notNull().default('voluntario'),
    /** null = usa o preset da função; array = permissões personalizadas */
    permissions: text().array(),
    jobTitle: text(),
    phone: text(),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.orgId, t.userId), index().on(t.userId)],
)

// =====================================================================
// Pessoas (adotantes, tutores, denunciantes, voluntários, doadores...)
// =====================================================================
export const people = pgTable(
  'people',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    types: text().array().notNull().default(sql`'{}'::text[]`),
    cpf: text(),
    rg: text(),
    birthDate: date(),
    email: text(),
    phone: text(),
    whatsapp: text(),
    zip: text(),
    street: text(),
    number: text(),
    complement: text(),
    neighborhood: text(),
    city: text(),
    state: text(),
    housingType: text(),
    housingNotes: text(),
    /** pessoa com restrição para adoção (ex.: histórico de abandono) */
    restricted: boolean().notNull().default(false),
    restrictionReason: text(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts(),
  },
  (t) => [index().on(t.orgId, t.name), index().on(t.orgId, t.cpf)],
)

// =====================================================================
// Animais (ficha + boletim de entrada)
// =====================================================================
export const animals = pgTable(
  'animals',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    /** número sequencial por ONG (ex.: #0042) */
    code: integer().notNull(),
    name: text().notNull(),
    species: text().notNull(),
    sex: text().notNull().default('unknown'),
    ageGroup: text(),
    birthDate: date(),
    breed: text(),
    size: text(),
    coatColor: text(),
    weightKg: numeric({ precision: 6, scale: 2, mode: 'number' }),
    microchip: text(),
    photoKey: text(),
    status: text().notNull().default('sheltered'),
    temperament: text().array().notNull().default(sql`'{}'::text[]`),
    behavior: text(),
    diseases: text(),
    disabilities: text(),
    specialCare: text(),
    castrated: boolean().notNull().default(false),
    castrationDate: date(),
    vaccinated: boolean().notNull().default(false),
    dewormed: boolean().notNull().default(false),
    /** adoção conjunta: ids de animais que devem ser adotados juntos */
    bondedWith: uuid().array().notNull().default(sql`'{}'::uuid[]`),

    // Boletim de entrada
    intakeDate: date().notNull().defaultNow(),
    intakeSource: text(),
    occurrenceNumber: text(),
    intakeStreet: text(),
    intakeNeighborhood: text(),
    intakeCity: text(),
    intakeState: text(),
    reporterId: uuid().references(() => people.id, { onDelete: 'set null' }),
    intakeReasons: text().array().notNull().default(sql`'{}'::text[]`),
    intakeReasonOther: text(),
    intakeCondition: text(),
    intakeProcedures: text().array().notNull().default(sql`'{}'::text[]`),
    intakeProceduresOther: text(),
    intakeDestination: text(),
    motherWithPups: boolean().notNull().default(false),
    litterMales: integer(),
    litterFemales: integer(),

    // Saída
    deathDate: date(),
    deathReason: text(),
    deathNotes: text(),
    adoptedAt: date(),
    adopterId: uuid().references(() => people.id, { onDelete: 'set null' }),

    notes: text(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts(),
  },
  (t) => [
    uniqueIndex().on(t.orgId, t.code),
    index().on(t.orgId, t.status),
    index().on(t.orgId, t.intakeDate),
  ],
)

export const animalEvents = pgTable(
  'animal_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    animalId: uuid().notNull().references(() => animals.id, { onDelete: 'cascade' }),
    type: text().notNull(),
    date: date().notNull(),
    title: text(),
    description: text(),
    /** próxima dose / retorno — alimenta os alertas do painel */
    nextDate: date(),
    cost: money(),
    data: jsonb().$type<Record<string, unknown>>(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.animalId, t.date), index().on(t.orgId, t.nextDate), index().on(t.orgId, t.createdAt)],
)

// =====================================================================
// Adoções (termo de adoção)
// =====================================================================
export const adoptions = pgTable(
  'adoptions',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    animalId: uuid().notNull().references(() => animals.id, { onDelete: 'cascade' }),
    personId: uuid().notNull().references(() => people.id, { onDelete: 'restrict' }),
    /** adoções registradas juntas (vários animais para o mesmo adotante) */
    groupId: uuid(),
    date: date().notNull(),
    status: text().notNull().default('active'),
    location: text(),
    castrationDeadline: date(),
    castrationDone: boolean().notNull().default(false),
    castrationDoneAt: date(),
    requirements: jsonb().$type<Record<string, boolean>>().notNull().default({}),
    documents: jsonb().$type<UploadedFile[]>().notNull().default([]),
    /** foto dos dados do animal no momento da adoção (vacinas, chip, castração...) */
    animalSnapshot: jsonb().$type<Record<string, unknown>>(),
    /** cópia dos textos aceitos (termo + declaração + responsabilidades) */
    termSnapshot: jsonb().$type<{ term: string; declaration: string; responsibilities: string }>(),
    termAcceptedAt: ts(),
    notes: text(),
    returnedAt: date(),
    returnReason: text(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.orgId, t.date), index().on(t.animalId), index().on(t.personId), index().on(t.groupId)],
)

// =====================================================================
// Financeiro: parceiros (clínicas/empresas) e despesas
// =====================================================================
export const partners = pgTable(
  'partners',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    type: text().notNull().default('clinic'),
    document: text(),
    contactName: text(),
    phone: text(),
    email: text(),
    address: text(),
    notes: text(),
    createdAt: createdAt(),
    deletedAt: ts(),
  },
  (t) => [index().on(t.orgId)],
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    description: text().notNull(),
    category: text().notNull().default('other'),
    amount: money().notNull(),
    partnerId: uuid().references(() => partners.id, { onDelete: 'set null' }),
    animalId: uuid().references(() => animals.id, { onDelete: 'set null' }),
    dueDate: date(),
    paymentMethod: text(),
    paid: boolean().notNull().default(false),
    paidAt: date(),
    attachmentKey: text(),
    notes: text(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.orgId, t.paid, t.dueDate), index().on(t.animalId), index().on(t.partnerId)],
)

// =====================================================================
// Estoque (ração e itens) + movimentações
// =====================================================================
export const stockItems = pgTable(
  'stock_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    kind: text().notNull().default('other'),
    species: text(),
    ageGroup: text(),
    unit: text().notNull().default('un'),
    quantity: qty().notNull().default(0),
    minQuantity: qty(),
    brand: text(),
    expiresAt: date(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts(),
  },
  (t) => [index().on(t.orgId, t.kind)],
)

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    itemId: uuid().notNull().references(() => stockItems.id, { onDelete: 'cascade' }),
    type: text().notNull(),
    quantity: qty().notNull(),
    balanceAfter: qty().notNull(),
    reason: text(),
    date: date().notNull(),
    notes: text(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.orgId, t.date), index().on(t.itemId)],
)

// =====================================================================
// Doações + configurações de pagamento (Stripe, Mercado Pago, Pix)
// =====================================================================
export const donations = pgTable(
  'donations',
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    personId: uuid().references(() => people.id, { onDelete: 'set null' }),
    donorName: text(),
    donorEmail: text(),
    amount: money().notNull(),
    method: text().notNull(),
    status: text().notNull().default('paid'),
    provider: text(),
    providerRef: text(),
    date: ts().notNull().defaultNow(),
    notes: text(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.orgId, t.date), uniqueIndex().on(t.provider, t.providerRef)],
)

export const paymentSettings = pgTable('payment_settings', {
  orgId: uuid().primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  pixEnabled: boolean().notNull().default(false),
  pixKey: text(),
  pixKeyType: text(),
  pixName: text(),
  pixCity: text(),
  stripeEnabled: boolean().notNull().default(false),
  stripePublishableKey: text(),
  /** segredos ficam cifrados (AES-GCM) com ENCRYPTION_KEY */
  stripeSecretKeyEnc: text(),
  stripeWebhookSecretEnc: text(),
  mpEnabled: boolean().notNull().default(false),
  mpPublicKey: text(),
  mpAccessTokenEnc: text(),
  mpWebhookSecretEnc: text(),
  suggestedAmounts: integer().array().notNull().default(sql`'{20,50,100,200}'::integer[]`),
  donationMessage: text(),
  updatedAt: updatedAt(),
})

export type DbAnimal = typeof animals.$inferSelect
export type DbPerson = typeof people.$inferSelect
