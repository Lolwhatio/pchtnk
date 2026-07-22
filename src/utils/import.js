import { sanitizeHtml, markdownToHtml } from './markdown'

// ── Импорт файлов разных форматов ─────────────────────────────────────────────
// Возвращаемый документ: { title, content } (content — санитизированный HTML,
// TipTap понимает и HTML, и JSON). id/даты проставляет вызывающий код.

// Word (.docx) → один документ. mammoth конвертирует в HTML.
export async function docxToDocs(file) {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.convertToHtml({ arrayBuffer })
  const title = file.name.replace(/\.docx$/i, '') || 'Документ Word'
  return [{ title, content: sanitizeHtml(value) }]
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
      return { title, content: sanitizeHtml(page.innerHTML) }
    })
  }

  // Обычный HTML: заголовок из <title> или первого h1, тело — из body
  const title = (doc.querySelector('title')?.textContent
    || doc.querySelector('h1')?.textContent
    || file.name.replace(/\.html?$/i, '')
    || 'Документ').trim()
  const body = doc.body || doc.documentElement
  return [{ title, content: sanitizeHtml(body.innerHTML) }]
}

// Диспетчер по расширению. Возвращает массив документов { title, content }.
export async function fileToDocs(file) {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.docx')) return docxToDocs(file)
  if (name.endsWith('.html') || name.endsWith('.htm')) return htmlFileToDocs(file)
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) return markdownFileToDocs(file)
  throw new Error('Неподдерживаемый формат: ' + (name.split('.').pop() || '?'))
}
