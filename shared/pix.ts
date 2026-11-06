// Gerador de BR Code Pix estático (padrão EMV do Banco Central) — "Pix copia e cola".

function tlv(id: string, value: string) {
  return id + value.length.toString().padStart(2, '0') + value
}

function crc16(payload: string) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function ascii(text: string, max: number) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, max)
}

export function normalizePixKey(type: string | null | undefined, key: string) {
  const k = key.trim()
  if (type === 'cpf' || type === 'cnpj') return k.replace(/\D/g, '')
  if (type === 'phone') {
    const digits = k.replace(/\D/g, '')
    return digits.startsWith('55') && digits.length > 11 ? `+${digits}` : `+55${digits}`
  }
  if (type === 'email') return k.toLowerCase()
  return k
}

export interface PixParams {
  key: string
  keyType?: string | null
  name: string
  city: string
  amount?: number | null
  txid?: string
  description?: string
}

export function pixPayload({ key, keyType, name, city, amount, txid = '***', description }: PixParams) {
  const gui =
    tlv('00', 'br.gov.bcb.pix') +
    tlv('01', normalizePixKey(keyType, key)) +
    (description ? tlv('02', ascii(description, 40)) : '')
  const payload =
    tlv('00', '01') +
    tlv('26', gui) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (amount && amount > 0 ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'BR') +
    tlv('59', ascii(name, 25) || 'ONG') +
    tlv('60', ascii(city, 15) || 'BRASIL') +
    tlv('62', tlv('05', ascii(txid, 25).replace(/[^A-Za-z0-9*]/g, '') || '***')) +
    '6304'
  return payload + crc16(payload)
}
