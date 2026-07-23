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
  'data-footnote', 'data-note', 'data-url']

export function markdownToHtml(md) {
  const html = marked.parse(md)
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
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
