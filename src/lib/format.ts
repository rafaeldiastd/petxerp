// Formatação pt-BR (datas, moeda, idade, máscaras)

const parse = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d)

export function fmtDate(d?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return parse(d).toLocaleDateString('pt-BR', opts)
}

export function fmtDateLong(d?: string | null) {
  return fmtDate(d, { day: '2-digit', month: 'long', year: 'numeric' })
}

export function fmtDateTime(d?: string | null) {
  if (!d) return '—'
  return parse(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

export function fmtMoney(n?: number | null) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtNumber(n?: number | null, digits = 1) {
  return (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: digits })
}

export function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function currentMonth() {
  return todayISO().slice(0, 7)
}

export function addDays(iso: string, days: number) {
  const d = parse(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addMonths(iso: string, months: number) {
  const d = parse(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(iso?: string | null) {
  if (!iso) return null
  return Math.round((parse(iso).getTime() - parse(todayISO()).getTime()) / 86400000)
}

/** "2 anos e 3 meses", "5 meses", "2 semanas" */
export function ageFrom(birth?: string | null) {
  if (!birth) return null
  const b = parse(birth)
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months--
  if (months < 1) {
    const weeks = Math.max(1, Math.floor((now.getTime() - b.getTime()) / (7 * 86400000)))
    return `${weeks} semana${weeks > 1 ? 's' : ''}`
  }
  const y = Math.floor(months / 12)
  const m = months % 12
  const ys = y ? `${y} ano${y > 1 ? 's' : ''}` : ''
  const ms = m ? `${m} ${m > 1 ? 'meses' : 'mês'}` : ''
  return [ys, ms].filter(Boolean).join(' e ')
}

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
export function relative(d?: string | null) {
  if (!d) return '—'
  const diff = (parse(d).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'agora'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month')
  return rtf.format(Math.round(diff / (86400 * 365)), 'year')
}

/** Tempo desde uma data em dias: "há 12 dias" com precisão de dia */
export function sinceDays(d?: string | null) {
  const n = daysUntil(d)
  if (n === null) return '—'
  if (n === 0) return 'hoje'
  return rtf.format(n, 'day')
}

export function animalCode(n?: number | null) {
  return n ? `#${String(n).padStart(4, '0')}` : ''
}

export function initials(name?: string | null) {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

// ---------- máscaras ----------
const digits = (v: string) => v.replace(/\D/g, '')

export function maskCpf(v?: string | null) {
  const d = digits(v ?? '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(v?: string | null) {
  const d = digits(v ?? '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCep(v?: string | null) {
  return digits(v ?? '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

export function whatsappLink(phone?: string | null, text?: string) {
  const d = digits(phone ?? '')
  if (d.length < 10) return null
  const full = d.startsWith('55') && d.length > 11 ? d : `55${d}`
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function formatAddress(p: {
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
}) {
  const line1 = [p.street, p.number].filter(Boolean).join(', ')
  const line2 = [p.complement, p.neighborhood].filter(Boolean).join(' — ')
  const city = [p.city, p.state].filter(Boolean).join('/')
  return [line1, line2, city].filter(Boolean).join(' · ')
}

/** Converte null → '' (para formulários) mantendo arrays/booleans */
export function toForm<T extends Record<string, unknown>>(obj: T, defaults: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...defaults }
  for (const k of Object.keys(defaults)) {
    const v = obj[k]
    if (v !== undefined) out[k] = v === null ? (Array.isArray(defaults[k]) ? [] : typeof defaults[k] === 'boolean' ? false : '') : v
  }
  return out
}
