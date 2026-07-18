import { getStore } from '@netlify/blobs'

// Собственный сокращатель ссылок «Поделиться заметкой».
// Принимает ?url=<полная ссылка без #fragment>, сохраняет зашифрованные
// данные (?d=…) в Netlify Blobs и возвращает короткий адрес /s/<slug>.
// Ключ расшифровки сюда не попадает никогда: он живёт во #fragment,
// а фрагменты браузер на сервер не отправляет.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function randomSlug(len = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('')
}

export default async (req) => {
  const reqUrl = new URL(req.url)
  const raw = reqUrl.searchParams.get('url')
  if (!raw) return new Response('missing url', { status: 400 })

  let target
  try { target = new URL(raw) } catch { return new Response('bad url', { status: 400 }) }

  // Сокращаем только собственные ссылки с данными документа
  if (target.origin !== reqUrl.origin) return new Response('foreign url', { status: 400 })
  const d = target.searchParams.get('d')
  if (!d || d.length > 16000 || !/^[\w-]+$/.test(d)) {
    return new Response('bad payload', { status: 400 })
  }

  const store = getStore('shared-links')

  // Слепая коллизия слуга крайне маловероятна, но проверяем
  let slug = randomSlug()
  for (let i = 0; i < 3 && (await store.get(slug)) !== null; i++) slug = randomSlug()

  await store.set(slug, d)

  return new Response(`${reqUrl.origin}/s/${slug}`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export const config = { path: '/api/shorten' }
