import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { numberFootnotesJson, sourceKey } from './footnotes'

marked.setOptions({ breaks: true, gfm: true })

// marked пропускает сырой HTML внутри markdown как есть — санитизируем результат,
// иначе текст вроде `<img src=x onerror="...">` выполнится при рендере в Preview/экспорте.
const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'strong', 'em', 's', 'br', 'hr', 'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'sup']
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan',
  'width', 'data-footnote', 'data-note', 'data-url',
  'data-crop-x', 'data-crop-y', 'data-crop-w', 'data-crop-h']

export function markdownToHtml(md) {
  const html = marked.parse(md)
  return layOutImages(DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR }))
}

// ── Картинки: кадр и воздух вокруг ───────────────────────────────────────────
// Кадрирование — это окно с overflow:hidden поверх сдвинутой картинки. Разметки
// под такое в markdown нет, поэтому из редактора кадр уходит data-атрибутами
// (см. imageToMd), а окно собирается здесь — уже после санитайзера. Так стили
// пишем мы, а не документ, и белый список не приходится расширять до style
// и div ради одной картинки: расширился бы он и для импорта .docx.
//
// Заодно снимаем абзац с картинки, которая стоит в нём одна: `![](…)` marked
// заворачивает в <p>, а <img> тегом оставляет блоком — с абзацем-обёрткой
// у одной картинки был бы лишний отступ, а у другой нет.
const CROPPED = 'img[data-crop-x],img[data-crop-y],img[data-crop-w],img[data-crop-h]'

function layOutImages(html) {
  if (!html.includes('<img')) return html
  const box = document.createElement('div')
  box.innerHTML = html

  for (const img of box.querySelectorAll(CROPPED)) {
    const side = (name) => {
      const v = parseInt(img.getAttribute(name), 10)
      return Number.isFinite(v) && v > 0 ? v : 0
    }
    const [x, y, w, h] = ['data-crop-x', 'data-crop-y', 'data-crop-w', 'data-crop-h'].map(side)
    const frame = document.createElement('span')
    frame.className = 'img-crop'
    frame.style.cssText = [
      'display:block', 'overflow:hidden', 'max-width:100%',
      w ? `width:${w}px` : '', h ? `height:${h}px` : '',
    ].filter(Boolean).join(';')
    // Картинку в кадре ужимать по ширине полосы нельзя — сместится и сам кадр
    img.style.maxWidth = 'none'
    if (x) img.style.marginLeft = `-${x}px`
    if (y) img.style.marginTop = `-${y}px`
    img.replaceWith(frame)
    frame.appendChild(img)
  }

  for (const p of box.querySelectorAll('p')) {
    const only = p.children.length === 1 && !p.textContent.trim()
    const kid = p.firstElementChild
    if (only && kid && (kid.tagName === 'IMG' || kid.classList.contains('img-crop'))) {
      p.replaceWith(kid)
    }
  }

  return box.innerHTML
}

// Санитизация произвольного HTML (импорт .docx через mammoth, .html-файлы).
// Тот же белый список тегов/атрибутов, что и для markdown.
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}

// Академическая нумерация: один источник — один номер. Перед обходом
// строим карту «источник → номер», в тексте по ней проставляем [^N].
let fnSources = []  // уникальные источники по порядку
let fnMap = new Map()  // ключ источника → номер

export function editorToMarkdown(editor) {
  return jsonToMarkdown(editor.getJSON())
}

export function jsonToMarkdown(json) {
  const content = (json || {}).content || []
  const { sources, map } = numberFootnotesJson(content)
  fnSources = sources
  fnMap = map
  return nodesToMd(content)
}

function nodesToMd(nodes) {
  return nodes.map(nodeToMd).join('')
}

function nodeToMd(node) {
  switch (node.type) {
    case 'heading': {
      const hashes = '#'.repeat(node.attrs?.level || 1)
      return `${hashes} ${inlinesToText(node.content)}\n\n`
    }
    case 'paragraph':
      return node.content?.length ? `${inlinesToText(node.content)}\n\n` : '\n'
    case 'bulletList':
      return (node.content || []).map(li =>
        `- ${nodesToMd(li.content || []).trim()}`
      ).join('\n') + '\n\n'
    case 'orderedList':
      return (node.content || []).map((li, i) =>
        `${i + 1}. ${nodesToMd(li.content || []).trim()}`
      ).join('\n') + '\n\n'
    case 'listItem':
      return nodesToMd(node.content || [])
    case 'blockquote':
      return nodesToMd(node.content || [])
        .split('\n').filter(Boolean).map(l => `> ${l}`).join('\n') + '\n\n'
    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = node.content?.[0]?.text || ''
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
    }
    case 'image':
      return imageToMd(node.attrs || {})
    case 'embed':
      return embedToMd(node.attrs || {})
    case 'docLink':
      return `[[${node.attrs?.label || ''}]]`
    case 'table':
      return tableToMd(node)
    case 'sourcesList': {
      if (!fnSources.length) return ''
      const rows = fnSources.map((it) => {
        const body = it.url
          ? (it.note ? `[${it.note}](${it.url})` : it.url)
          : (it.note || '—')
        return `${it.number}. ${body}`
      })
      return `**Источники**\n\n${rows.join('\n')}\n\n`
    }
    case 'horizontalRule':
      return `---\n\n`
    case 'hardBreak':
      return '  \n'
    default:
      return nodesToMd(node.content || [])
  }
}

// ── Картинки и встройки ──────────────────────────────────────────────────────
// До этого обе ноды сваливались в default, тот обходил node.content — а у них
// его нет, — и картинка молча пропадала из .md, из HTML и из PDF заодно:
// markdown у Печатников не «ещё один формат», а промежуточный вид для всех
// трёх, да и «Сохранить» пишет на диск именно его.

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Адрес внутри `(…)`: пробелы и скобки такую ссылку рвут. Пробел кодируем,
// скобки честнее обойти угловыми скобками — их markdown для того и держит.
function mdUrl(url) {
  const u = String(url ?? '').trim().replace(/\s/g, '%20')
  return /[()]/.test(u) ? `<${u}>` : u
}

const px = (v) => (Number.isFinite(+v) && +v > 0 ? Math.round(+v) : null)

// Обычная картинка уходит стандартным `![alt](src "title")` — такой markdown
// прочитает кто угодно.
//
// Ширину и кадр записать этим синтаксисом нечем. Терять их вместе с картинкой
// не годится: и то, и другое человек задал руками. Поэтому такая картинка
// пишется тегом <img> — разметка внутри markdown законна, — а масштаб и окно
// кадра висят на нём атрибутами. Чужой просмотрщик покажет картинку целиком
// и в полную ширину: кадр он не поймёт, но это потеря вида, а не содержимого.
// Наши предпросмотр, HTML и PDF соберут по этим атрибутам то же окно, что
// в редакторе (см. layOutImages), а обратный разбор вернёт узел как был.
function imageToMd(attrs) {
  const src = attrs.src
  if (!src) return ''
  const width = px(attrs.width)
  const crop = { x: px(attrs.cropX), y: px(attrs.cropY), w: px(attrs.cropW), h: px(attrs.cropH) }
  const alt = String(attrs.alt || '')
  const title = attrs.title ? String(attrs.title) : ''

  if (width || crop.x || crop.y || crop.w || crop.h) {
    const tag = [
      `src="${escAttr(src)}"`,
      `alt="${escAttr(alt)}"`,
      title ? `title="${escAttr(title)}"` : '',
      width ? `width="${width}"` : '',
      crop.x ? `data-crop-x="${crop.x}"` : '',
      crop.y ? `data-crop-y="${crop.y}"` : '',
      crop.w ? `data-crop-w="${crop.w}"` : '',
      crop.h ? `data-crop-h="${crop.h}"` : '',
    ].filter(Boolean).join(' ')
    return `<img ${tag}>\n\n`
  }

  const label = alt.replace(/([[\]])/g, '\\$1')
  const cap = title ? ` "${title.replace(/"/g, '\\"')}"` : ''
  return `![${label}](${mdUrl(src)}${cap})\n\n`
}

// Встройка (YouTube, Google Slides, Figma) — это iframe с живым содержимым,
// и ни в markdown, ни на бумаге его нет. Остаётся адрес: название службы
// и сама ссылка, видимая целиком. Прятать адрес под словом «YouTube» было бы
// хуже — в PDF ссылка мёртвая, и кроме этого слова не осталось бы ничего.
function embedToMd(attrs) {
  const src = String(attrs.src ?? '').trim().replace(/\s/g, '%20')
  if (!src) return ''
  const label = attrs.title || 'Встроенный контент'
  return `**${label}** — <${src}>\n\n`
}

// TipTap-таблица → GFM-таблица. Блочное содержимое ячеек сплющивается в текст,
// разрывы строк заменяются на <br> (GFM их понимает), | экранируется.
function cellText(cell) {
  const md = nodesToMd(cell.content || []).trim().replace(/\n+/g, ' ')
  return md.replace(/\|/g, '\\|') || ' '
}

function tableToMd(node) {
  const rows = (node.content || []).filter(r => r.type === 'tableRow')
  if (!rows.length) return ''
  const cellsOf = (row) => (row.content || []).map(cellText)
  const width = Math.max(...rows.map(r => (r.content || []).length))
  const pad = (cells) => {
    const c = [...cells]
    while (c.length < width) c.push(' ')
    return c
  }
  const header = pad(cellsOf(rows[0]))
  const sep = header.map(() => '---')
  const body = rows.slice(1).map(r => pad(cellsOf(r)))
  const line = (cells) => `| ${cells.join(' | ')} |`
  return [line(header), line(sep), ...body.map(line)].join('\n') + '\n\n'
}

function inlinesToText(nodes = []) {
  return nodes.map(n => {
    if (n.type === 'footnote') {
      const num = fnMap.get(sourceKey(n.attrs?.note, n.attrs?.url)) || '?'
      return `[^${num}]`
    }
    let text = n.text || nodesToMd(n.content || [])
    const marks = n.marks || []
    for (const m of marks) {
      if (m.type === 'bold')   text = `**${text}**`
      if (m.type === 'italic') text = `_${text}_`
      if (m.type === 'strike') text = `~~${text}~~`
      if (m.type === 'code')   text = `\`${text}\``
      if (m.type === 'link')   text = `[${text}](${m.attrs?.href || ''})`
    }
    return text
  }).join('')
}
