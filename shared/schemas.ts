// Schemas Zod compartilhados: validam formulários no front e payloads no Worker.
import { z } from 'zod'
import {
  ADOPTION_LOCATION, AGE_GROUP, ANIMAL_STATUS, DEATH_REASONS, DONATION_METHOD, DONATION_STATUS,
  EXPENSE_CATEGORY, HOUSING, INTAKE_DESTINATION, INTAKE_PROCEDURES, INTAKE_REASONS, INTAKE_SOURCE,
  MANUAL_EVENT_TYPES, MOVEMENT_REASON, MOVEMENT_TYPE, PARTNER_TYPE, PAYMENT_METHOD, PERSON_TYPES,
  PIX_KEY_TYPE, SEX, SIZE, SPECIES, STOCK_AGE, STOCK_KIND, STOCK_SPECIES, STOCK_UNIT, TEMPERAMENT, keys,
} from './constants'
import { ROLES } from './permissions'

// ---------- helpers ----------
const str = (max = 255) => z.string().trim().max(max, `Máximo de ${max} caracteres`)
const optStr = (max = 255) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres`).nullish().transform((v) => (v ? v : null))
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
const optDate = z
  .union([dateStr, z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null)
const optNum = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number({ error: 'Número inválido' }).nullable(),
)
const optInt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(0).nullable(),
)
const money = z.preprocess(
  (v) => (typeof v === 'string' ? Number(v.replace(',', '.')) : v),
  z.number({ error: 'Informe um valor' }).positive('O valor deve ser maior que zero').max(10_000_000),
)
const optEnum = <T extends Record<string, string>>(o: T) =>
  z
    .union([z.enum(keys(o)), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null))
const optUuid = z
  .union([z.uuid(), z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null)
const optEmail = z
  .union([z.email('E-mail inválido'), z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null)
const bool = z.boolean().default(false)

export function onlyDigits(v: string | null | undefined) {
  return (v ?? '').replace(/\D/g, '')
}

export function isValidCPF(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

const optCpf = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? onlyDigits(v) : null))
  .refine((v) => !v || isValidCPF(v), 'CPF inválido')

// ---------- Animais ----------
/** Status que podem ser escolhidos no formulário (adotado/óbito só pelos fluxos próprios) */
export const EDITABLE_STATUSES = ['sheltered', 'available', 'treatment', 'foster', 'returned_owner', 'community'] as const

export const animalSchema = z.object({
  name: str(80).min(1, 'Informe o nome'),
  species: z.enum(keys(SPECIES), { error: 'Selecione a espécie' }),
  sex: z.enum(keys(SEX)).default('unknown'),
  ageGroup: optEnum(AGE_GROUP),
  birthDate: optDate,
  breed: optStr(80),
  size: optEnum(SIZE),
  coatColor: optStr(80),
  weightKg: optNum,
  microchip: optStr(40),
  photoKey: optStr(300),
  status: z.enum(keys(ANIMAL_STATUS)).default('sheltered'),
  temperament: z.array(z.enum(keys(TEMPERAMENT))).default([]),
  behavior: optStr(4000),
  diseases: optStr(4000),
  disabilities: optStr(4000),
  specialCare: optStr(4000),
  castrated: bool,
  castrationDate: optDate,
  vaccinated: bool,
  dewormed: bool,
  bondedWith: z.array(z.uuid()).default([]),
  intakeDate: dateStr,
  intakeSource: optEnum(INTAKE_SOURCE),
  occurrenceNumber: optStr(40),
  intakeStreet: optStr(160),
  intakeNeighborhood: optStr(120),
  intakeCity: optStr(120),
  intakeState: optStr(2),
  reporterId: optUuid,
  intakeReasons: z.array(z.enum(keys(INTAKE_REASONS))).default([]),
  intakeReasonOther: optStr(300),
  intakeCondition: optStr(2000),
  intakeProcedures: z.array(z.enum(keys(INTAKE_PROCEDURES))).default([]),
  intakeProceduresOther: optStr(300),
  intakeDestination: optEnum(INTAKE_DESTINATION),
  motherWithPups: bool,
  litterMales: optInt,
  litterFemales: optInt,
  notes: optStr(4000),
})
export type AnimalInput = z.input<typeof animalSchema>

export const deathSchema = z.object({
  date: dateStr,
  reason: z.enum(keys(DEATH_REASONS), { error: 'Selecione a causa' }),
  notes: optStr(2000),
})

export const eventSchema = z.object({
  type: z.enum(MANUAL_EVENT_TYPES),
  date: dateStr,
  title: optStr(160),
  description: optStr(4000),
  nextDate: optDate,
  cost: optNum,
  weightKg: optNum,
})

// ---------- Pessoas ----------
export const personSchema = z.object({
  name: str(120).min(2, 'Informe o nome'),
  types: z.array(z.enum(keys(PERSON_TYPES))).default([]),
  cpf: optCpf,
  rg: optStr(20),
  birthDate: optDate,
  email: optEmail,
  phone: optStr(20),
  whatsapp: optStr(20),
  zip: optStr(9),
  street: optStr(160),
  number: optStr(20),
  complement: optStr(80),
  neighborhood: optStr(120),
  city: optStr(120),
  state: optStr(2),
  housingType: optEnum(HOUSING),
  housingNotes: optStr(1000),
  restricted: bool,
  restrictionReason: optStr(1000),
  notes: optStr(4000),
})

// ---------- Adoções ----------
export const fileSchema = z.object({
  key: z.string().min(1).max(300),
  name: z.string().max(200),
  type: z.string().max(100),
  label: z.string().max(80).optional(),
})

/** Uma adoção pode levar vários animais (ex.: irmãos) — um registro e um termo por animal */
export const adoptionSchema = z.object({
  animals: z
    .array(z.object({ animalId: z.uuid(), castrationDeadline: optDate }))
    .min(1, 'Selecione ao menos um animal')
    .max(10, 'Máximo de 10 animais por vez'),
  personId: z.uuid({ error: 'Selecione o adotante' }),
  date: dateStr,
  location: optEnum(ADOPTION_LOCATION),
  requirements: z.record(z.string(), z.boolean()).default({}),
  documents: z.array(fileSchema).max(20).default([]),
  termAccepted: z.literal(true, { error: 'O adotante precisa aceitar o termo' }),
  notes: optStr(4000),
})

export const adoptionReturnSchema = z.object({
  date: dateStr,
  reason: str(2000).min(3, 'Descreva o motivo'),
  newStatus: z.enum(['available', 'sheltered', 'treatment']).default('available'),
})

// ---------- Financeiro ----------
export const partnerSchema = z.object({
  name: str(160).min(2, 'Informe o nome'),
  type: z.enum(keys(PARTNER_TYPE)).default('clinic'),
  document: optStr(20),
  contactName: optStr(120),
  phone: optStr(20),
  email: optEmail,
  address: optStr(300),
  notes: optStr(2000),
})

export const expenseSchema = z.object({
  description: str(200).min(2, 'Informe o motivo'),
  category: z.enum(keys(EXPENSE_CATEGORY)).default('other'),
  amount: money,
  partnerId: optUuid,
  animalId: optUuid,
  dueDate: optDate,
  paymentMethod: optEnum(PAYMENT_METHOD),
  paid: bool,
  paidAt: optDate,
  attachmentKey: optStr(300),
  notes: optStr(2000),
})

// ---------- Estoque ----------
export const stockItemSchema = z.object({
  name: str(160).min(2, 'Informe a descrição'),
  kind: z.enum(keys(STOCK_KIND)).default('other'),
  species: optEnum(STOCK_SPECIES),
  ageGroup: optEnum(STOCK_AGE),
  unit: z.enum(keys(STOCK_UNIT)).default('un'),
  quantity: z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)), z.number().min(0, 'Não pode ser negativo')),
  minQuantity: optNum,
  brand: optStr(80),
  expiresAt: optDate,
  notes: optStr(2000),
})

export const movementSchema = z.object({
  itemId: z.uuid(),
  type: z.enum(keys(MOVEMENT_TYPE)),
  quantity: z.preprocess((v) => Number(v), z.number().min(0, 'Quantidade inválida')),
  reason: optEnum(MOVEMENT_REASON),
  date: dateStr,
  notes: optStr(1000),
})

export const foodConsumptionSchema = z.object({
  dog: z.preprocess((v) => Number(v || 0), z.number().min(0)),
  cat: z.preprocess((v) => Number(v || 0), z.number().min(0)),
})

// ---------- Doações ----------
export const donationSchema = z.object({
  personId: optUuid,
  donorName: optStr(120),
  donorEmail: optEmail,
  amount: money,
  method: z.enum(keys(DONATION_METHOD)).default('pix'),
  status: z.enum(keys(DONATION_STATUS)).default('paid'),
  date: dateStr,
  notes: optStr(1000),
})

export const paymentSettingsSchema = z.object({
  pixEnabled: bool,
  pixKey: optStr(77),
  pixKeyType: optEnum(PIX_KEY_TYPE),
  pixName: optStr(25),
  pixCity: optStr(15),
  stripeEnabled: bool,
  stripePublishableKey: optStr(200),
  stripeSecretKey: optStr(200),
  stripeWebhookSecret: optStr(200),
  mpEnabled: bool,
  mpPublicKey: optStr(200),
  mpAccessToken: optStr(300),
  mpWebhookSecret: optStr(200),
  suggestedAmounts: z.array(z.number().int().positive()).max(6).default([20, 50, 100, 200]),
  donationMessage: optStr(1000),
})

export const checkoutSchema = z.object({
  amount: z.preprocess((v) => Number(v), z.number().min(5, 'Mínimo de R$ 5,00').max(50_000)),
  provider: z.enum(['stripe', 'mercadopago']),
  name: optStr(120),
  email: optEmail,
})

// ---------- Equipe e organização ----------
export const teamCreateSchema = z.object({
  name: str(120).min(2, 'Informe o nome'),
  email: z.email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres').max(128).optional().or(z.literal('')),
  role: z.enum(keys(ROLES)),
  permissions: z.array(z.string()).nullish(),
  jobTitle: optStr(80),
  phone: optStr(20),
})

export const teamUpdateSchema = z.object({
  role: z.enum(keys(ROLES)),
  permissions: z.array(z.string()).nullish(),
  jobTitle: optStr(80),
  phone: optStr(20),
  active: z.boolean().default(true),
})

export const orgSettingsSchema = z.object({
  foodDailyKg: z.object({ dog: z.number().min(0).optional(), cat: z.number().min(0).optional() }).optional(),
  castrationMonths: z.number().int().min(1).max(24).optional(),
  castrationDaysAdult: z.number().int().min(1).max(365).optional(),
  adoptionTerm: z.string().max(10_000).optional(),
  adoptionDeclaration: z.string().max(10_000).optional(),
  adopterResponsibilities: z.string().max(20_000).optional(),
  requirementsDog: z.string().max(5_000).optional(),
  requirementsCat: z.string().max(5_000).optional(),
})

export const orgSchema = z.object({
  name: str(120).min(2, 'Informe o nome da ONG'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/, 'Use letras minúsculas, números e hífen'),
  legalName: optStr(160),
  document: optStr(20),
  email: optEmail,
  phone: optStr(20),
  whatsapp: optStr(20),
  instagram: optStr(60),
  website: optStr(200),
  zip: optStr(9),
  street: optStr(160),
  number: optStr(20),
  complement: optStr(80),
  neighborhood: optStr(120),
  city: optStr(120),
  state: optStr(2),
  logoKey: optStr(300),
})

export const onboardingSchema = z.object({
  orgName: str(120).min(2, 'Informe o nome da ONG'),
  city: optStr(120),
  state: optStr(2),
})

/** Converte issues do Zod em { campo: mensagem } para exibir nos formulários */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const k = issue.path.join('.') || '_'
    if (!out[k]) out[k] = issue.message
  }
  return out
}
