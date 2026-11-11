import { numberFootnotesJson, sourceKey } from './footnotes'
import { bindWidows } from './widows'
import { typografy as runTypograf } from './typograf'

// ── HTML escape ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}


// ── TipTap JSON → HTML ────────────────────────────────────────────────────────

function nodesToHtml(nodes, ctx) {
  return (nodes || []).map(n => nodeToHtml(n, ctx)).join('')
}

function nodeToHtml(node, ctx) {
  const ch = (c) => nodesToHtml(c, ctx)
  switch (node.type) {
    case 'heading': {
      const l = node.attrs?.level || 1
      return `<h${l}>${inlinesToHtml(node.content, ctx)}</h${l}>\n`
    }
    case 'paragraph': {
      const inner = inlinesToHtml(node.content, ctx)
      return inner ? `<p>${inner}</p>\n` : `<p class="empty-p">&nbsp;</p>\n`
    }
    case 'bulletList':
      return `<ul>\n${(node.content || []).map(li => `<li>${ch(li.content)}</li>`).join('\n')}\n</ul>\n`
    case 'orderedList':
      return `<ol>\n${(node.content || []).map(li => `<li>${ch(li.content)}</li>`).join('\n')}\n</ol>\n`
    case 'listItem':
      return ch(node.content)
    case 'blockquote':
      return `<blockquote>${ch(node.content)}</blockquote>\n`
    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = esc(node.content?.[0]?.text || '')
      return `<pre><code${lang ? ` class="language-${esc(lang)}"` : ''}>${code}</code></pre>\n`
    }
    case 'horizontalRule': return '<hr>\n'
    case 'hardBreak':      return '<br>'
    case 'table': {
      const rows = (node.content || []).filter(r => r.type === 'tableRow').map(row => {
        const cells = (row.content || []).map(cell => {
          const tag = cell.type === 'tableHeader' ? 'th' : 'td'
          const cs = cell.attrs?.colspan > 1 ? ` colspan="${cell.attrs.colspan}"` : ''
          const rs = cell.attrs?.rowspan > 1 ? ` rowspan="${cell.attrs.rowspan}"` : ''
          return `<${tag}${cs}${rs}>${nodesToHtml(cell.content, ctx)}</${tag}>`
        }).join('')
        return `<tr>${cells}</tr>`
      }).join('\n')
      // Обёртка со скроллом — широкая таблица на узком экране не рвёт вёрстку
      return `<div class="table-scroll"><table>\n${rows}\n</table></div>\n`
    }
    case 'image': {
      const { src, alt, width, cropX, cropY, cropW, cropH } = node.attrs || {}
      if (!src) return ''
      const hasCrop = cropX || cropY || cropW || cropH
      const imgStyle = [
        width ? `width:${Number(width)}px` : '',
        hasCrop ? 'max-width:none' : 'max-width:100%',
        cropX ? `margin-left:-${Number(cropX)}px` : '',
        cropY ? `margin-top:-${Number(cropY)}px` : '',
      ].filter(Boolean).join(';')
      const img = `<img src="${esc(src)}" alt="${esc(alt || '')}" style="${imgStyle}">`
      if (hasCrop) {
        const boxStyle = [
          cropW ? `width:${Number(cropW)}px` : '',
          cropH ? `height:${Number(cropH)}px` : '',
          'max-width:100%',
          'overflow:hidden',
        ].filter(Boolean).join(';')
        return `<figure class="kb-img" style="${boxStyle}">${img}</figure>\n`
      }
      return `<figure class="kb-img">${img}</figure>\n`
    }
    // Живого iframe в сохранённом файле не будет: страница лежит на диске,
    // а содержимое встройки — на чужом сервере. Оставляем адрес целиком,
    // как и в markdown, — из него понятно, что и куда вело.
    case 'embed': {
      const { src, title } = node.attrs || {}
      if (!src) return ''
      const label = esc(title || 'Встроенный контент')
      return `<p class="kb-embed"><strong>${label}</strong> — <a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(src)}</a></p>\n`
    }
    case 'footnote': {
      // Один источник — один номер; повтор ведёт к той же записи.
      const key = sourceKey(node.attrs?.note, node.attrs?.url)
      const n = ctx.fnMap.get(key) || '?'
      const occ = (ctx.fnOcc.get(key) || 0) + 1  // отдельный id на каждое вхождение
      ctx.fnOcc.set(key, occ)
      const title = node.attrs?.note || node.attrs?.url || ''
      return `<sup class="fn-ref" id="fnref-${esc(ctx.docId)}-${n}-${occ}"><a href="#fn-${esc(ctx.docId)}-${n}" title="${esc(title)}">${n}</a></sup>`
    }
    case 'sourcesList': {
      const items = ctx.footnotes || []
      if (!items.length) return ''
      const rows = items.map((it) => {
        const n = it.number
        const label = esc(it.note || it.url || '—')
        const body = it.url
          ? `<a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : label
        return `<li id="fn-${esc(ctx.docId)}-${n}">${body} <a class="fn-back" href="#fnref-${esc(ctx.docId)}-${n}-1" title="Вернуться к тексту">↩</a></li>`
      }).join('\n')
      return `<section class="sources"><h2 class="sources-title">Источники</h2>\n<ol class="sources-items">\n${rows}\n</ol>\n</section>\n`
    }
    case 'docLink': {
      const { id, label } = node.attrs || {}
      const linked = id && ctx.docsById[id]
      if (linked) {
        return `<a href="${esc(ctx.hrefFor(linked))}" class="int-link">${esc(label || linked.title || id)}</a>`
      }
      return `<span class="int-link-broken">${esc(label || id || '')}</span>`
    }
    default: return ch(node.content)
  }
}

function inlinesToHtml(nodes, ctx) {
  return (nodes || []).map(node => {
    if (node.type === 'docLink') return nodeToHtml(node, ctx)
    if (node.type === 'hardBreak') return '<br>'

    let text = esc(node.text ?? '') || nodesToHtml(node.content, ctx)
    for (const m of (node.marks || [])) {
      switch (m.type) {
        case 'bold':   text = `<strong>${text}</strong>`; break
        case 'italic': text = `<em>${text}</em>`; break
        case 'strike': text = `<s>${text}</s>`; break
        case 'underline': text = `<u>${text}</u>`; break
        case 'code':   text = `<code>${text}</code>`; break
        case 'link':   text = `<a href="${esc(m.attrs?.href || '')}" target="_blank" rel="noopener noreferrer">${text}</a>`; break
      }
    }
    return text
  }).join('')
}

// Типографика applied к готовому HTML — так же, как в предпросмотре.
// Typograf прячет теги за служебными метками, поэтому атрибуты, data-URI
// картинок и id сносок он не трогает: правит только текст между тегами.
function typografy(html, ctx) {
  return ctx.typograf ? bindWidows(runTypograf(html)) : html
}

// Тело документа и его заголовок отдельно. Название страницы выгрузки —
// это первый заголовок первого уровня в самом тексте, как и в PDF
// (см. pdfBody в Preview). Раньше над текстом ставилось название документа,
// а следом шёл тот же H1 из текста — заголовок выходил дважды. Теперь H1
// уходит в шапку страницы, а если его в тексте нет — в шапку идёт
// название документа.
function docParts(doc, ctx) {
  ctx.footnotes = []
  ctx.fnMap = new Map()
  ctx.fnOcc = new Map()
  ctx.docId = doc.id
  if (!doc.content) return { titleHtml: null, bodyHtml: '' }

  if (typeof doc.content === 'string') { // старые документы — HTML-строкой
    const m = doc.content.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i)
    return m
      ? { titleHtml: m[1], bodyHtml: doc.content.slice(m[0].length) }
      : { titleHtml: null, bodyHtml: doc.content }
  }

  const content = doc.content.content || []
  // Академическая нумерация: один источник — один номер
  const { sources, map } = numberFootnotesJson(content)
  ctx.footnotes = sources   // уникальные источники для блока «Источники»
  ctx.fnMap = map           // ключ источника → номер

  // Пустые абзацы перед заголовком не в счёт — их оставляет Enter в начале
  let i = 0
  while (i < content.length && content[i].type === 'paragraph' && !content[i].content?.length) i++
  const first = content[i]
  if (first?.type === 'heading' && (first.attrs?.level || 1) === 1 && first.content?.length) {
    return {
      titleHtml: inlinesToHtml(first.content, ctx),
      bodyHtml: nodesToHtml(content.slice(i + 1), ctx),
    }
  }
  return { titleHtml: null, bodyHtml: nodesToHtml(content, ctx) }
}

// ── Оформление ───────────────────────────────────────────────────────────────
// Выгрузка набрана как сам редактор: те же шрифты (зашиты в файл, см.
// kbFonts.js), те же токены ветки, меню — линия со станциями, как
// «Структура», дата — число в кружке, главная — список, как «Продолжить».
// Шрифты одни, как в редакторе: Literata — текст, Onest — заголовки.
// Настраивается в диалоге «Скачать проект»: тема, ветка, шапка (нет, цвет
// ветки, своя картинка), вид главной, даты, кегль, ширина.

const LITERATA = "'PK Literata','Literata Variable',Georgia,serif"
const ONEST    = "'PK Onest','Onest Variable',system-ui,sans-serif"
const MONO     = "'PK Mono','JetBrains Mono Variable',ui-monospace,Menlo,monospace"

export const KB_DEFAULTS = {
  small: false,     // мелкий текст
  wide: false,      // во всю ширину
  theme: 'light',   // light | dark
  palette: null,    // null — та, что выбрана в приложении
  cover: 'none',    // none | color | image
  coverImage: null, // data-URI картинки для шапки
  home: 'list',     // list | cards
  dates: true,      // даты на главной и над заголовком
}

// Раньше обложка была галочкой
export function normalizeLook(o) {
  const look = { ...KB_DEFAULTS, ...o }
  if (look.cover === true) look.cover = 'color'
  if (look.cover === false) look.cover = 'none'
  if (look.cover === 'image' && !look.coverImage) look.cover = 'none'
  if (look.theme !== 'dark') look.theme = 'light'  // «как у читателя» убрано
  delete look.font                                  // выбор шрифта убран
  return look
}

// Токены приложения, которые нужны выгрузке, — под теми же именами.
// Значения не копируем в отдельную таблицу (разъехалась бы с variables.css),
// а собираем из правил самой таблицы стилей: :root + [data-theme] +
// [data-palette] — те блоки, что сработали бы на <html> с выбранной
// темой и веткой. Так можно выгрузить светлую, не переключая приложение.
const KB_TOKENS = [
  'bg', 'surface', 'border-soft', 'border', 'border-strong', 'rail-off',
  'faint', 'muted', 'text', 'ink', 'syntax', 'row-active',
  'accent', 'accent-ink', 'on-accent', 'transfer', 'transfer-ink', 'error-ink',
]

function specificity(sel) {
  return (sel.match(/\[/g) || []).length
}

function collectThemeVars(theme, palette) {
  const probe = document.createElement('div')
  probe.setAttribute('data-theme', theme)
  if (palette) probe.setAttribute('data-palette', palette)
  const hits = []
  let order = 0
  for (const sheet of document.styleSheets) {
    let rules
    try { rules = sheet.cssRules } catch { continue } // чужой домен
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue
      const sel = rule.selectorText || ''
      if (!/:root|data-theme|data-palette/.test(sel)) continue
      let ok
      try { ok = sel.trim() === ':root' || probe.matches(sel.replace(/:root/g, '*')) } catch { ok = false }
      if (!ok) continue
      // Только правила, где задаются токены, а не оформление элементов
      const vars = []
      for (const prop of rule.style) if (prop.startsWith('--')) vars.push([prop, rule.style.getPropertyValue(prop).trim()])
      if (vars.length) hits.push({ spec: sel.trim() === ':root' ? 0 : specificity(sel), order: order++, vars })
    }
  }
  if (!hits.length) return null
  hits.sort((a, b) => a.spec - b.spec || a.order - b.order)
  // Ссылки var() и color-mix() досчитывает браузер: кладём всё
  // на элемент-образец и снимаем вычисленные значения
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  for (const h of hits) for (const [k, v] of h.vars) probe.style.setProperty(k, v)
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const out = {}
  for (const token of KB_TOKENS) out[token] = cs.getPropertyValue('--' + token).trim()
  probe.remove()
  return out
}

function themeVars(theme, palette) {
  const cs = getComputedStyle(document.documentElement)
  const vals = collectThemeVars(theme, palette) || {}
  const val = (t) => vals[t] || cs.getPropertyValue('--' + t).trim() || '#888'
  const rows = KB_TOKENS.map(t => `  --${t}:${val(t)};`).join('\n')
  // Подсветку выделения собираем из акцента: rgba в токенах не лежит
  const [r, g, b] = (val('accent').replace('#', '').match(/../g) || []).map(h => parseInt(h, 16))
  return `${rows}\n  --selection:rgba(${r},${g},${b},.28);`
}

function kbCss(o) {
  const palette = o.palette || document.documentElement.getAttribute('data-palette') || null
  const colors = `:root{\n${themeVars(o.theme, palette)}\n  color-scheme:${o.theme};\n}`
  const cover = o.cover === 'image' && o.coverImage
    ? `\n.cover--image{background-image:url("${o.coverImage}")}`
    : ''
  return `${o.fontCss || ''}
${colors}
:root{
  --font-text:${LITERATA};
  --font-head:${ONEST};
  --font-ui:${ONEST};
  --font-mono:${MONO};
  --fs:${o.small ? 16 : 18}px;
  --measure:${o.wide ? 'none' : '720px'};
}
::selection{background:var(--selection)}` + KB_CSS_REST + cover
}

const KB_CSS_REST = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased;text-size-adjust:100%}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
body{
  display:flex;min-height:100vh;
  background:var(--bg);color:var(--text);
  font-family:var(--font-text);font-size:var(--fs);line-height:1.5;
}

/* ── Ветка: документы — станции на линии, как «Структура» ── */
.rail{
  flex:0 0 280px;position:sticky;top:0;height:100vh;overflow-y:auto;
  padding:34px 22px 34px 28px;
  border-right:1px solid var(--border-soft);
  display:flex;flex-direction:column;gap:22px;
}
.rail-brand{
  font-family:var(--font-ui);font-size:15px;font-weight:700;line-height:1.3;
  color:var(--ink);text-decoration:none;
}
.rail-brand:hover{color:var(--accent-ink)}
.rail-title{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--faint)}
.stations{position:relative;display:flex;flex-direction:column;gap:2px}
.stations::before{
  content:'';position:absolute;left:10px;top:15px;bottom:15px;width:4px;border-radius:2px;
  background:var(--rail-off);
}
.station{
  position:relative;display:flex;align-items:center;gap:14px;
  padding:6px 10px 6px 0;text-decoration:none;
}
.station .dot{
  flex:none;display:flex;justify-content:center;width:24px;z-index:1;
}
.station .dot::before{
  content:'';width:14px;height:14px;border-radius:50%;
  background:var(--rail-off);box-shadow:0 0 0 5px var(--bg);
}
.station .label{
  min-width:0;font-family:var(--font-ui);font-size:13px;font-weight:500;line-height:1.35;
  color:var(--text);overflow-wrap:anywhere;
}
.station:hover .label{color:var(--ink)}
.station.passed .dot::before,.station.active .dot::before{background:var(--accent)}
.station.active .label{color:var(--ink);font-weight:600}

/* ── Страница ── */
.main{flex:1;min-width:0}
.page{display:none;padding:56px 56px 96px}
.page.visible{display:block}
.article{max-width:var(--measure);margin:0 auto}

/* Шапка: цвет ветки или своя картинка, во всю ширину страницы */
.cover{height:clamp(140px,26vh,260px);margin:-56px -56px 40px;background:var(--accent)}
.cover--image{background-color:var(--surface);background-size:cover;background-position:center}

/* Дата над заголовком: число в кружке, рядом месяц и проект */
.meta{display:flex;align-items:center;gap:8px;margin-bottom:18px}
.meta__num{
  display:flex;align-items:center;justify-content:center;flex:none;
  width:20px;height:20px;border-radius:10px;
  background:var(--accent);color:var(--on-accent);
  font-family:var(--font-ui);font-size:10px;font-weight:700;line-height:1;
}
.meta__text{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--faint)}

/* ── Текст — как в редакторе ── */
.body>*+*{margin-top:26px}
.body>p+p{margin-top:1.25em}
h1,h2,h3,h4,h5,h6{font-family:var(--font-head);color:var(--ink);text-wrap:balance}
h1{font-size:38px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
h2{font-size:25px;font-weight:700;letter-spacing:-.01em;line-height:1.25}
h3{font-size:19px;font-weight:600;line-height:1.3}
h4,h5,h6{font-weight:600;line-height:1.35}
h4{font-size:17px}h5{font-size:15.5px}h6{font-size:14px;color:var(--muted)}
.page-title{margin-bottom:34px}
.empty-p{min-height:1em}
strong{font-weight:700;color:var(--ink)}
em{font-style:italic}
s{color:var(--faint)}
u{text-decoration:underline;text-underline-offset:3px}
a{color:var(--accent-ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
a:hover{text-decoration-thickness:2px}
/* Ссылка на другой документ — пересадка: кольцо и подчёркивание её цветом */
.int-link{
  color:var(--ink);white-space:nowrap;
  text-decoration-color:var(--transfer);text-decoration-thickness:1.5px;
}
.int-link::before{
  content:'';display:inline-block;width:.62em;height:.62em;margin-right:.3em;
  border:.17em solid var(--transfer);border-radius:50%;vertical-align:.02em;
}
.int-link:hover{text-decoration-thickness:2.5px}
.int-link-broken{color:var(--faint);text-decoration:line-through}
blockquote{
  padding:18px 20px;border-left:4px solid var(--transfer);
  border-radius:0 6px 6px 0;background:var(--surface);
  font-size:.92em;font-style:italic;line-height:1.7;color:var(--muted);
}
blockquote>*+*{margin-top:.6em}
code{font-family:var(--font-mono);font-size:.86em;color:var(--transfer-ink)}
pre{padding:14px 16px;background:var(--surface);border:1px solid var(--border-soft);border-radius:6px;overflow-x:auto}
pre code{font-size:12.5px;line-height:1.8;color:var(--text)}
ul,ol{padding-left:0}
li{line-height:1.7}
li>*{margin:0}
li+li,li>*+*{margin-top:11px}
ul{list-style:none}
ul>li{padding-left:21px}
ul>li>p:first-child::before{
  content:'-';display:inline-block;width:21px;margin-left:-21px;
  font-family:var(--font-mono);font-size:15px;font-style:normal;font-weight:400;color:var(--syntax);
}
ol{list-style:decimal;padding-left:30px}
ol>li::marker{font-family:var(--font-mono);font-size:15px;color:var(--syntax)}
hr{border:none;height:4px;border-radius:2px;background:var(--rail-off)}
.kb-img img{display:block;max-width:100%;height:auto;border-radius:6px}
.kb-embed{font-family:var(--font-ui);font-size:14px}
/* Таблицы: fixed — чтобы длинная ячейка не раздувала колонку */
.table-scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;table-layout:fixed}
.table-scroll table{min-width:520px}
th,td{border:1px solid var(--border);padding:.55em .8em;text-align:left;vertical-align:top}
th{background:var(--surface);font-family:var(--font-ui);font-size:.85em;font-weight:600}
td>*:last-child,th>*:last-child{margin-bottom:0}
/* Сноски */
.fn-ref{font-family:var(--font-ui);font-size:.62em;font-weight:700;vertical-align:super;line-height:1}
.fn-ref a{color:var(--accent-ink);text-decoration:none}
.sources{padding:18px 20px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
.sources-title{font-family:var(--font-ui);font-size:12px!important;font-weight:600;color:var(--faint);margin:0 0 10px}
.sources-items{margin:0;padding-left:1.4em;font-family:var(--font-ui);font-size:13.5px;line-height:1.6;color:var(--muted)}
.sources-items li{margin:.3em 0}
.fn-back{color:var(--faint);text-decoration:none;margin-left:4px}

/* ── Главная ── */
.subtitle{margin-top:10px;font-family:var(--font-ui);font-size:13px;font-weight:500;color:var(--faint)}
/* Список — как «Продолжить» под пустым листом */
.doc-list{
  list-style:none;display:flex;flex-direction:column;gap:2px;padding:6px;
  border:1px solid var(--border);border-radius:8px;background:var(--surface);
}
.doc-list li{margin:0;padding:0}
.doc-list li::before{content:none}
.doc-list a{
  display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:6px;
  font-family:var(--font-ui);text-decoration:none;
}
.doc-list a:hover{background:var(--row-active)}
.doc-list a::before{content:'';flex:none;width:8px;height:8px;border-radius:50%;background:var(--rail-off)}
.doc-list a:hover::before{background:var(--accent)}
.doc-title{flex:1;min-width:0;font-size:14px;font-weight:500;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.doc-date{flex:none;font-family:var(--font-ui);font-size:11px;color:var(--faint)}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.card{
  display:flex;flex-direction:column;gap:10px;min-height:92px;padding:16px 18px;
  border:1px solid var(--border);border-radius:8px;background:var(--surface);
  text-decoration:none;transition:border-color .15s ease;
}
.card:hover{border-color:var(--accent)}
.card .doc-title{white-space:normal;font-size:15px;font-weight:600;line-height:1.35}
.card .doc-date{margin-top:auto}

.page-footer{margin-top:56px;padding-top:18px;border-top:1px solid var(--border-soft);font-family:var(--font-ui);font-size:13px}
.page-footer a{color:var(--muted);text-decoration:none}
.page-footer a:hover{color:var(--ink)}

/* ── Узкий экран ── */
@media(max-width:780px){
  body{flex-direction:column}
  .rail{position:static;height:auto;flex:none;padding:22px 20px;border-right:none;border-bottom:1px solid var(--border-soft)}
  .page{padding:28px 20px 64px}
  .cover{margin:-28px -20px 28px}
  h1{font-size:30px}h2{font-size:22px}h3{font-size:18px}
}
`

// Мини-роутер: показывает одну страницу по location.hash, подсвечивает
// станцию в меню, а станции до неё — как пройденные. Всё внутри одного
// файла — работает с file:// без сервера. Якорь внутри страницы (сноска,
// «вернуться к тексту») открывает страницу, где он лежит.
export function kbRoute(doc, hash, scroll = true) {
  const id = (hash || '').replace(/^#/, '')
  const target = id && doc.getElementById(id)
  const page = (target && target.closest('.page')) || doc.getElementById('home')
  const pages = doc.querySelectorAll('.page')
  for (let i = 0; i < pages.length; i++) pages[i].classList.toggle('visible', pages[i] === page)
  const stations = doc.querySelectorAll('.station')
  let found = -1
  for (let j = 0; j < stations.length; j++) {
    if (stations[j].getAttribute('href') === '#' + page.id) found = j
  }
  for (let k = 0; k < stations.length; k++) {
    stations[k].classList.toggle('active', k === found)
    stations[k].classList.toggle('passed', found > -1 && k < found)
  }
  if (!scroll) return
  if (target && target !== page) target.scrollIntoView()
  else (doc.scrollingElement || doc.documentElement).scrollTop = 0
}

const KB_JS = `
var kbRoute = ${kbRoute.toString()};
function go(){ kbRoute(document, location.hash); }
window.addEventListener('hashchange', go);
go();
`

// ── Сборка единого файла ──────────────────────────────────────────────────────

// Заголовки типографим до экранирования: Typograf работает по тексту,
// а esc() потом безопасно закроет «&», «<» и кавычки.
function title(doc, ctx) {
  return esc(typografy(doc.title || 'Без названия', ctx))
}

function pluralDocsWord(n) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11)                          return 'документ'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'документа'
  return 'документов'
}

const shortDate = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\s*г\.$/, '')

// «(10) ноября · Проект» — как строка над текстом в редакторе
function metaLine(ts, project) {
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const month = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })
    .replace(/^\d+\s*/, '').replace(/\s*г\.$/, '')
  const text = project ? `${month} · ${esc(project)}` : month
  return `<div class="meta"><span class="meta__num">${d.getDate()}</span><span class="meta__text">${text}</span></div>`
}

const coverHtml = (o) => o.cover === 'color' ? '\n    <div class="cover"></div>'
  : o.cover === 'image' && o.coverImage ? '\n    <div class="cover cover--image"></div>' : ''

function buildRail(docs, hrefFor, kbTitle, ctx) {
  const stations = docs.map(doc =>
    `      <a class="station" href="${esc(hrefFor(doc))}"><span class="dot"></span><span class="label">${title(doc, ctx)}</span></a>`
  ).join('\n')
  return `<aside class="rail">
  <a class="rail-brand" href="#">${esc(typografy(kbTitle, ctx))}</a>
  <div class="rail-title">Документы</div>
  <nav class="stations">
${stations}
  </nav>
</aside>`
}

function buildHomePage(docs, hrefFor, kbTitle, ctx, o) {
  const date = (doc) => o.dates ? `<span class="doc-date">${shortDate(doc.updatedAt || doc.createdAt || Date.now())}</span>` : ''
  const items = o.home === 'cards'
    ? `<div class="card-grid">${docs.map(doc => `
        <a href="${esc(hrefFor(doc))}" class="card"><span class="doc-title">${title(doc, ctx)}</span>${date(doc)}</a>`).join('')}
      </div>`
    : `<ul class="doc-list">${docs.map(doc => `
        <li><a href="${esc(hrefFor(doc))}"><span class="doc-title">${title(doc, ctx)}</span>${date(doc)}</a></li>`).join('')}
      </ul>`
  return `
  <section class="page visible" id="home">${coverHtml(o)}
    <article class="article">
      <header class="page-title">
        <h1>${esc(typografy(kbTitle, ctx))}</h1>
        <p class="subtitle">${docs.length}&nbsp;${pluralDocsWord(docs.length)}</p>
      </header>
      ${items}
    </article>
  </section>`
}

function buildDocPage(doc, ctx, o) {
  const { titleHtml, bodyHtml } = docParts(doc, ctx)
  const h1 = titleHtml != null ? typografy(titleHtml, ctx) : title(doc, ctx)
  const ts = doc.createdAt || doc.updatedAt
  return `
  <section class="page" id="d-${esc(doc.id)}">${coverHtml(o)}
    <article class="article">
      <header class="page-title">
        ${o.dates && ts ? metaLine(ts, doc.projectTitle) : ''}
        <h1>${h1}</h1>
      </header>
      <div class="body">
      ${typografy(bodyHtml, ctx)}
      </div>
      <footer class="page-footer">
        <a href="#">← К содержанию</a>
      </footer>
    </article>
  </section>`
}

// ── Public export ─────────────────────────────────────────────────────────────
// База знаний — ОДИН самодостаточный HTML-файл: открывается двойным
// кликом, внутри главная, меню-ветка и все документы с рабочими ссылками
// между ними.

// `typograf` — экземпляр Typograf с настройками пользователя или null,
// если типографику отключили. Прогоняется по тем же правилам, что и предпросмотр.
// options.fontCss — @font-face со шрифтами (loadKbFonts); без него файл
// набирается тем, что найдётся в системе.
export function buildKnowledgeBaseHtml(docs, kbTitle = 'База знаний', typograf = null, options = {}) {
  const o = normalizeLook(options)
  const hrefFor  = (doc) => `#d-${doc.id}`
  const docsById = Object.fromEntries(docs.map(d => [d.id, d]))
  // Порядок — тот, что задан в панели документов: раз пользователь выстроил
  // документы вручную, оглавление выгрузки должно идти так же, а не по дате
  const ctx      = { docsById, hrefFor, typograf }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(kbTitle)}</title>
<style>${kbCss(o)}</style>
</head>
<body>
${buildRail(docs, hrefFor, kbTitle, ctx)}
<main class="main">
${buildHomePage(docs, hrefFor, kbTitle, ctx, o)}
${docs.map(doc => buildDocPage(doc, ctx, o)).join('\n')}
</main>
<script>${KB_JS}</script>
</body>
</html>`
}

export function kbFileName(kbTitle) {
  return (kbTitle.replace(/[\\/:*?"<>|]/g, '-').trim() || 'База знаний') + '.html'
}

// Где есть системный «Сохранить как» — через него (так же, как экспорт
// документа из предпросмотра), иначе обычным скачиванием.
// Отмена в диалоге бросает AbortError наверх.
export async function exportKnowledgeBase(docs, kbTitle = 'База знаний', typograf = null, options = {}) {
  if (!docs?.length) return
  const name = kbFileName(kbTitle)
  // Файл собираем до await: системному диалогу нужен свежий клик
  const blob = new Blob([buildKnowledgeBaseHtml(docs, kbTitle, typograf, options)], { type: 'text/html;charset=utf-8' })

  if (window.showSaveFilePicker) {
    let handle = null
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'Страница HTML', accept: { 'text/html': ['.html'] } }],
      })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
    }
    if (handle) {
      const w = await handle.createWritable()
      await w.write(blob)
      await w.close()
      return 'saved'
    }
  }
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
