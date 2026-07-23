import { sanitizeHtml, markdownToHtml } from './markdown'

// ── Распознавание сносок при импорте ──────────────────────────────────────────
// И Word (через mammoth), и наш HTML-экспорт дают структурные сноски:
// надстрочная ссылка <sup><a href="#…N">N</a></sup> плюс список определений
// внизу (<li id="…N">текст ↩</li>). Превращаем это в родные <sup data-footnote>,
// а список определений убираем — блок «Источники» соберётся сам.
function transformFootnotes(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 1. Карта определений: id → { text, url }
  const defs = new Map()
  const defLists = new Set()
  doc.querySelectorAll('li[id]').forEach(li => {
    if (!/^(footnote|fn|endnote)[-_]?/i.test(li.id)) return
    const clone = li.cloneNode(true)
    // Выкидываем обратные ссылки-стрелки (↑ ↩ ⤴ и вариации)
    const ARROWS = ['↑', '↩', '⤴', '️']
    const isArrowOnly = (str) => [...str].every(ch => ARROWS.includes(ch) || /\s/.test(ch))
    let url = ''
    clone.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || ''
      if (isArrowOnly(a.textContent)) { a.remove(); return }       // стрелка «наверх»
      if (/^https?:/i.test(href)) {
        if (!url) url = href
        // Голый URL как подпись выкидываем из текста (он уже в data-url),
        // осмысленную подпись оставляем
        if (a.textContent.trim() === href.trim()) a.remove()
      }
    })
    const text = [...clone.textContent].filter(ch => !ARROWS.includes(ch)).join('').replace(/\s+/g, ' ').trim()
    if (text || url) defs.set(li.id, { text, url })
    if (li.parentElement) defLists.add(li.parentElement)
  })

  // 2. Ссылки-надстрочники → data-footnote
  let converted = 0
  doc.querySelectorAll('sup').forEach(sup => {
    const a = sup.querySelector('a[href^="#"]')
    if (!a) return
    const targetId = a.getAttribute('href').slice(1)
    const def = defs.get(targetId)
    if (!def) return
    const ns = doc.createElement('sup')
    ns.setAttribute('data-footnote', '')
    ns.setAttribute('data-note', def.text)
    if (def.url) ns.setAttribute('data-url', def.url)
    sup.replaceWith(ns)
    converted++
  })

  // 3. Удаляем исходные списки определений (наш блок соберётся заново)
  if (converted > 0) {
    defLists.forEach(list => {
      // Заголовок «Источники»/«Footnotes» рядом тоже убираем
      const sec = list.closest('section.sources') || list
      const prev = sec.previousElementSibling
      if (prev && /^(источники|сноски|footnotes|notes|примечания)$/i.test(prev.textContent.trim())) prev.remove()
      sec.remove()
    })
  }

  return { html: doc.body.innerHTML, hasFootnotes: converted > 0 }
}

// Оборачивает санитизацию распознаванием сносок + автодобавлением блока
// «Источники», если сноски нашлись.
function processImportedHtml(rawHtml) {
  const { html, hasFootnotes } = transformFootnotes(rawHtml)
  let clean = sanitizeHtml(html)
  if (hasFootnotes) clean += '<div data-sources-list></div>'
  return clean
}

// ── Импорт файлов разных форматов ─────────────────────────────────────────────
// Возвращаемый документ: { title, content } (content — санитизированный HTML,
// TipTap понимает и HTML, и JSON). id/даты проставляет вызывающий код.

// Word (.docx) → один документ. mammoth конвертирует в HTML.
export async function docxToDocs(file) {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.convertToHtml({ arrayBuffer })
  const title = file.name.replace(/\.docx$/i, '') || 'Документ Word'
  return [{ title, content: processImportedHtml(value) }]
}

// Markdown / текст → один документ.
export async function markdownFileToDocs(file) {
  const text = await file.text()
  const title = file.name.replace(/\.(md|markdown|txt)$/i, '') || 'Документ'
  return [{ title, content: markdownToHtml(text) }]
}

// HTML → один или несколько документов.
// Файл базы знаний Печатников содержит несколько <article class="page">
// (кроме главной id="home") — каждую разворачиваем в отдельный документ.
// Обычный HTML-файл превращается в один документ.
export async function htmlFileToDocs(file) {
  const raw = await file.text()
  const doc = new DOMParser().parseFromString(raw, 'text/html')

  const pages = [...doc.querySelectorAll('article.page')].filter(a => a.id !== 'home')
  if (pages.length > 0) {
    return pages.map(page => {
      const header = page.querySelector('.page-header')
      const title = header?.querySelector('h1')?.textContent?.trim() || 'Без названия'
      header?.remove()                 // убираем дублирующий заголовок
      page.querySelector('.page-footer')?.remove() // и служебную ссылку «К содержанию»
      return { title, content: processImportedHtml(page.innerHTML) }
    })
  }

  // Обычный HTML: заголовок из <title> или первого h1, тело — из body
  const title = (doc.querySelector('title')?.textContent
    || doc.querySelector('h1')?.textContent
    || file.name.replace(/\.html?$/i, '')
    || 'Документ').trim()
  const body = doc.body || doc.documentElement
  return [{ title, content: processImportedHtml(body.innerHTML) }]
}

// Диспетчер по расширению. Возвращает массив документов { title, content }.
export async function fileToDocs(file) {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.docx')) return docxToDocs(file)
  if (name.endsWith('.html') || name.endsWith('.htm')) return htmlFileToDocs(file)
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) return markdownFileToDocs(file)
  throw new Error('Неподдерживаемый формат: ' + (name.split('.').pop() || '?'))
}
