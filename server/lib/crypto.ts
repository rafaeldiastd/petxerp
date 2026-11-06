// Utilitários de criptografia baseados em WebCrypto (nativo no Workers, sem custo de CPU em JS).

const enc = new TextEncoder()
const dec = new TextDecoder()

export function toB64(bytes: Uint8Array) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
export function fromB64(b64: string) {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}
export function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

// ---------- Senhas (PBKDF2-SHA256; o Workers limita a 100k iterações) ----------
const PBKDF2_ITERATIONS = 100_000

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [algo, iter, salt, expected] = hash.split('$')
  if (algo !== 'pbkdf2_sha256' || !iter || !salt || !expected) return false
  const actual = await pbkdf2(password, fromB64(salt), Number(iter))
  return timingSafeEqual(actual, fromB64(expected))
}

// ---------- Segredos em repouso (AES-GCM) ----------
async function aesKey(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(plain: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await aesKey(secret)
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain))
  return `v1:${toB64(iv)}:${toB64(new Uint8Array(data))}`
}

export async function decryptSecret(payload: string | null | undefined, secret: string) {
  if (!payload) return null
  const [v, iv, data] = payload.split(':')
  if (v !== 'v1' || !iv || !data) return null
  const key = await aesKey(secret)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data))
  return dec.decode(plain)
}

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
}
