import { useMemo } from 'react'
import './MarkdownSource.css'

// Предпросмотр .md — исходник как он есть, знак в знак, но набранный.
//
// Раньше здесь был <pre> одним цветом, и файл выглядел технической
// распечаткой. Теперь — как блок кода в справочнике дизайна: символы
// разметки приглушены, заголовки и жирный выделены, код — цветом
// пересадки, адреса ссылок — третьим планом. Сам текст не меняется:
// что на экране, то и в файле.
//
// Разбор нарочно простой — построчный, с одним уровнем вложенности
// в строке. Задача — подсветка, а не второй парсер markdown.

// Строка целиком: заголовок, цитата, пункт списка, линейка, строка таблицы
const HEADING = /^(#{1,6})(\s+)(.*)$/
const QUOTE = /^(\s*(?:>\s?)+)(.*)$/
const LIST = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/
const TABLE = /^\s*\|.*\|\s*$/
const FENCE = /^\s*```/

// Внутри строки: код, ссылка или картинка, ссылка на документ, сноска,
// жирный, курсив, зачёркнутый, адрес в угловых скобках, html-тег
const INLINE = /(?<code>`+)(?<codeText>[^`]+?)\k<code>|(?<bang>!?)\[(?<linkText>[^\]]*)\]\((?<url>[^)\s]*)(?<title>\s+"[^"]*")?\)|\[\[(?<doc>[^\]]*)\]\]|\[\^(?<fn>[^\]]+)\]|(?<b>\*\*|__)(?<bText>.+?)\k<b>|(?<i>\*|_)(?<iText>[^*_\s](?:[^*_]*[^*_\s])?)\k<i>|~~(?<sText>.+?)~~|<(?<auto>https?:\/\/[^>\s]+)>|(?<tag><\/?[a-zA-Z][^>]*>)/g

// Картинка, вставленная из буфера, лежит в файле строкой base64 на сотни
// килобайт. В предпросмотре от неё остаётся начало и вес — в файле она целиком
function shortUrl(url) {
  const m = url.match(/^(data:[^;,]+;base64,)(.*)$/)
  if (!m) return url
  const kb = Math.max(1, Math.round(m[2].length * 0.75 / 1024))
  return `${m[1]}… (${kb.toLocaleString('ru')} КБ)`
}

const syntax = (text, key) => <span key={key} className="md-syntax">{text}</span>

// 1 строка, 2 строки, 5 строк, 21 строка
function pluralLines(n) {
  const d = n % 10, h = n % 100
  if (d === 1 && h !== 11) return 'строка'
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'строки'
  return 'строк'
}

function inline(text, keyBase = '') {
  const out = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    const g = m.groups
    const k = `${keyBase}${n++}`
    if (m.index > last) out.push(text.slice(last, m.index))
    last = m.index + m[0].length

    if (g.code) {
      out.push(syntax(g.code, k + 'a'), <span key={k} className="md-code">{g.codeText}</span>, syntax(g.code, k + 'b'))
    } else if (g.url !== undefined) {
      out.push(
        syntax(`${g.bang}[`, k + 'a'),
        <span key={k} className={g.bang ? 'md-image' : 'md-link'}>{inline(g.linkText, k + '.')}</span>,
        syntax('](', k + 'b'),
        <span key={k + 'u'} className="md-url">{shortUrl(g.url)}{g.title || ''}</span>,
        syntax(')', k + 'c'),
      )
    } else if (g.doc !== undefined) {
      out.push(syntax('[[', k + 'a'), <span key={k} className="md-doc">{g.doc}</span>, syntax(']]', k + 'b'))
    } else if (g.fn) {
      out.push(<span key={k} className="md-fn">{m[0]}</span>)
    } else if (g.b) {
      out.push(syntax(g.b, k + 'a'), <strong key={k} className="md-bold">{inline(g.bText, k + '.')}</strong>, syntax(g.b, k + 'b'))
    } else if (g.i) {
      out.push(syntax(g.i, k + 'a'), <em key={k} className="md-italic">{inline(g.iText, k + '.')}</em>, syntax(g.i, k + 'b'))
    } else if (g.sText !== undefined) {
      out.push(syntax('~~', k + 'a'), <s key={k} className="md-strike">{inline(g.sText, k + '.')}</s>, syntax('~~', k + 'b'))
    } else if (g.auto) {
      out.push(syntax('<', k + 'a'), <span key={k} className="md-url">{g.auto}</span>, syntax('>', k + 'b'))
    } else if (g.tag) {
      out.push(<span key={k} className="md-tag">{g.tag.replace(/src="(data:[^"]+)"/, (_, u) => `src="${shortUrl(u)}"`)}</span>)
    }
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function renderLine(line, state) {
  if (state.fence) {
    if (FENCE.test(line)) { state.fence = false; return syntax(line) }
    return <span className="md-code">{line}</span>
  }
  if (FENCE.test(line)) { state.fence = true; return syntax(line) }

  let m
  if ((m = line.match(HEADING))) {
    // Пробел после решёток — тоже моноширинный: пробел Literata рядом
    // с мелкой решёткой почти не виден, и # прилипал к заголовку
    return [syntax(m[1] + m[2], 'h'), <span key="t" className={`md-heading md-heading--${m[1].length}`}>{inline(m[3])}</span>]
  }
  if ((m = line.match(QUOTE))) {
    return [syntax(m[1], 'q'), <span key="t" className="md-quote">{inline(m[2])}</span>]
  }
  if (RULE.test(line)) return syntax(line)
  if ((m = line.match(LIST))) {
    return [m[1], syntax(m[2], 'l'), m[3], ...inline(m[4])]
  }
  if (TABLE.test(line)) {
    // Строка-разделитель таблицы | --- | целиком разметка
    if (/^[\s|:-]+$/.test(line)) return syntax(line)
    return line.split(/(\\?\|)/).map((part, i) =>
      part === '|' ? syntax(part, i) : <span key={i}>{inline(part, `${i}.`)}</span>
    )
  }
  return inline(line)
}

export default function MarkdownSource({ markdown, fileName }) {
  const lines = useMemo(() => {
    const state = { fence: false }
    // Хвостовые пустые строки файла на экране ни к чему
    return markdown.replace(/\n+$/, '').split('\n').map(l => ({
      table: !state.fence && TABLE.test(l),
      body: renderLine(l, state),
    }))
  }, [markdown])

  const kb = Math.max(1, Math.round(new Blob([markdown]).size / 1024))

  return (
    <div className="md-file">
      <div className="md-file__head">
        <span className="md-file__badge" aria-hidden="true">MD</span>
        <span className="md-file__name">{fileName}.md</span>
        <span className="md-file__meta">{lines.length.toLocaleString('ru')} {pluralLines(lines.length)} · {kb.toLocaleString('ru')} КБ</span>
      </div>
      <div className="md-file__body">
        {lines.map((l, i) => <div key={i} className={`md-line${l.table ? ' md-line--table' : ''}`}>{l.body}</div>)}
      </div>
    </div>
  )
}
