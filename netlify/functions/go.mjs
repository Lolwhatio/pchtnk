import { getStore } from '@netlify/blobs'

// Раскрытие короткой ссылки /s/<slug> → 301 на /?d=<данные>.
// Фрагмент с ключом расшифровки браузер сам переносит на конечный
// адрес — сервер его не видит.

export default async (req, context) => {
  const slug = context.params?.slug
  if (!slug || !/^[A-Za-z0-9]{5,12}$/.test(slug)) {
    return new Response('Не найдено', { status: 404 })
  }

  const d = await getStore('shared-links').get(slug)
  if (!d) {
    return new Response('Ссылка не найдена или устарела', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const origin = new URL(req.url).origin
  return new Response(null, {
    status: 301,
    headers: {
      location: `${origin}/?d=${d}`,
      'cache-control': 'public, max-age=3600',
    },
  })
}

export const config = { path: '/s/:slug' }
