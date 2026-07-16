import LZString from 'lz-string'

// ── AES-GCM 256, Web Crypto API ───────────────────────────────────────────────

async function generateKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function importKey(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
}

// PBKDF2: пароль + соль → ключ AES-GCM
async function deriveKeyFromPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function b64urlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(str) {
  return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
}

async function encrypt(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipher), iv.byteLength)
  return b64urlEncode(combined)
}

async function decrypt(b64url, key) {
  const combined = b64urlDecode(b64url)
  const iv = combined.slice(0, 12)
  const cipher = combined.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(plain)
}

// ── Публичное API ─────────────────────────────────────────────────────────────

const MAX_URL_BYTES = 7000

// password — необязательный. Если передан, ключ выводится из пароля через PBKDF2.
// Без пароля — случайный ключ кладётся в #fragment.
// С паролем — в #fragment кладётся только соль (pwd:<salt>), ключ нигде не хранится.
export async function encodeShareUrl(docJson, baseUrl, password = '') {
  const json = JSON.stringify(docJson)
  const compressed = LZString.compressToUTF16(json)

  let key, fragment
  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    key = await deriveKeyFromPassword(password, salt)
    fragment = 'pwd:' + b64urlEncode(salt)
  } else {
    key = await generateKey()
    fragment = await exportKey(key)
  }

  const encrypted = await encrypt(compressed, key)
  const url = new URL(baseUrl)
  url.searchParams.set('d', encrypted)
  url.hash = fragment

  const result = url.toString()
  if (result.length > MAX_URL_BYTES) {
    const err = new Error('too_large')
    throw err
  }
  return result
}

// Возвращает:
//   { doc } — успешно расшифровано без пароля
//   { needsPassword: true, salt } — нужен пароль (вызови decodeWithPassword)
//   null — нет данных в URL
export async function decodeShareUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('d')
    const fragment = window.location.hash.slice(1)
    if (!d || !fragment) return null

    if (fragment.startsWith('pwd:')) {
      const salt = b64urlDecode(fragment.slice(4))
      return { needsPassword: true, salt, d }
    }

    const key = await importKey(fragment)
    const compressed = await decrypt(d, key)
    const doc = JSON.parse(LZString.decompressFromUTF16(compressed))
    return { doc }
  } catch {
    return null
  }
}

export async function decodeWithPassword(d, salt, password) {
  const key = await deriveKeyFromPassword(password, salt)
  const compressed = await decrypt(d, key)
  return JSON.parse(LZString.decompressFromUTF16(compressed))
}
