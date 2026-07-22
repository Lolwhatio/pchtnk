import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

// marked пропускает сырой HTML внутри markdown как есть — санитизируем результат,
// иначе текст вроде `<img src=x onerror="...">` выполнится при рендере в Preview/экспорте.
const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'strong', 'em', 's', 'br', 'hr', 'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th']
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan']

export function markdownToHtml(md) {
  const html = marked.parse(md)
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}

// Санитизация произвольного HTML (импорт .docx через mammoth, .html-файлы).
// Тот же белый список тегов/атрибутов, что и для markdown.
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}

export function editorToMarkdown(editor) {
  const json = editor.getJSON()
  return nodesToMd(json.content || [])
}

export function jsonToMarkdown(json) {
  return nodesToMd((json || {}).content || [])
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
