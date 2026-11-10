import { numberFootnotesJson, sourceKey } from './footnotes'
import { bindWidows } from './widows'
import { typografy as runTypograf } from './typograf'

// ── HTML escape ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Plurals ───────────────────────────────────────────────────────────────────

function pluralDocs(n) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11)                        return 'страница'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'страницы'
  return 'страниц'
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
// Настраивается в диалоге «Скачать проект», как оформление страницы в Notion:
// шрифт, мелкий текст, ширина, тема, цвет, обложка, вид главной.

export const KB_FONTS = {
  serif: { label: 'С засечками', stack: "Georgia,'Iowan Old Style','Times New Roman',serif" },
  sans:  { label: 'Без засечек', stack: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" },
  mono:  { label: 'Моно',        stack: "ui-monospace,'SF Mono',Menlo,Consolas,monospace" },
}

export const KB_DEFAULTS = {
  font: 'serif',
  small: false,     // мелкий текст
  wide: false,      // во всю ширину
  theme: 'auto',    // light | dark | auto (как в системе у читателя)
  palette: null,    // null — та, что выбрана в приложении
  cover: true,      // цветная обложка над заголовком
  home: 'cards',    // cards | list
  dates: true,      // даты на главной и под заголовком
}

const UI_STACK = KB_FONTS.sans.stack

// Палитра выгрузки — из тех же токенов, что и приложение. Значения не
// копируем в отдельную таблицу (разъехалась бы с variables.css), а
// собираем из правил самой таблицы стилей: :root + [data-theme] +
// [data-palette] — те блоки, что сработали бы на <html> с выбранной
// темой и веткой. Так можно выгрузить светлую, не переключая приложение.
//
// Имена переменных внутри выгрузки остались прежними — стили файла ниже
// написаны на них. Акцент для текста — accent-ink: ссылки и заголовки
// там — текст, а салатовый на светлой бумаге не читается.
const KB_TOKENS = {
  'bg-primary':     'bg',
  'bg-secondary':   'surface',
  'bg-panel':       'surface',
  'bg-hover':       'row-active',
  'bg-active':      'row-active',
  'accent':         'accent-ink',
  'accent-hover':   'accent-ink',
  'accent-fill':    'accent',
  'on-accent':      'on-accent',
  'accent-dim':     'syntax',
  'text-primary':   'text',
  'text-heading':   'ink',
  'text-secondary': 'muted',
  'text-muted':     'faint',
  'border':         'border',
  'border-light':   'border-strong',
  'danger':         'error-ink',
}

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
  for (const token of new Set(Object.values(KB_TOKENS))) out[token] = cs.getPropertyValue('--' + token).trim()
  probe.remove()
  return out
}

function themeVars(theme, palette) {
  const cs = getComputedStyle(document.documentElement)
  const live = (t) => cs.getPropertyValue('--' + t).trim()
  const vals = collectThemeVars(theme, palette) || {}
  const val = (t, fallback) => vals[t] || live(t) || fallback
  const rows = Object.entries(KB_TOKENS).map(([name, token]) => `  --${name}:${val(token, '#000')};`).join('\n')
  // Подсветку выделения собираем из акцента: rgba в токенах не лежит
  const [r, g, b] = (val('accent', '#B0D23F').replace('#', '').match(/../g) || [])
    .map(h => parseInt(h, 16))
  return `${rows}\n  --selection:rgba(${r},${g},${b},.22);`
}

function kbCss(o) {
  const palette = o.palette || document.documentElement.getAttribute('data-palette') || null
  const light = themeVars('light', palette)
  const dark  = themeVars('dark', palette)
  const colors = o.theme === 'auto'
    ? `:root{\n${light}\n  color-scheme:light dark;\n}\n@media (prefers-color-scheme:dark){:root{\n${dark}\n}}`
    : `:root{\n${o.theme === 'dark' ? dark : light}\n  color-scheme:${o.theme};\n}`
  const font = (KB_FONTS[o.font] || KB_FONTS.serif).stack
  return `${colors}
:root{
  --font-text:${font};
  --font-ui:${UI_STACK};
  --measure:${o.wide ? 'none' : '680px'};
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:${o.small ? 15 : 17}px;-webkit-font-smoothing:antialiased}
::selection{background:var(--selection)}` + KB_CSS_REST
}

const KB_CSS_REST = `
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border-light)}
body{
  font-family:var(--font-text);
  background:var(--bg-primary);
  color:var(--text-primary);
  display:flex;
  min-height:100vh;
  line-height:1.7;
}

/* ── Боковое меню ─────────── */
.sidebar{
  width:256px;flex-shrink:0;
  background:var(--bg-panel);
  border-right:1px solid var(--border);
  position:sticky;top:0;height:100vh;
  overflow-y:auto;
  display:flex;flex-direction:column;
}
.sidebar-brand{
  display:flex;align-items:center;gap:10px;
  font-family:var(--font-ui);
  font-size:14px;font-weight:650;line-height:1.3;
  color:var(--text-heading);
  padding:20px 20px 18px;
  border-bottom:1px solid var(--border);
  text-decoration:none;
}
.sidebar-brand::before{
  content:'';flex:none;width:10px;height:10px;border-radius:50%;
  background:var(--accent-fill);
}
.sidebar-brand:hover{color:var(--accent)}
.nav-list{list-style:none;padding:10px 0;flex:1}
.nav-list li a{
  display:block;
  font-family:var(--font-ui);font-size:13px;line-height:1.45;
  color:var(--text-secondary);text-decoration:none;
  padding:6px 20px;
  border-left:2px solid transparent;
  transition:background .15s ease,color .15s ease;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.nav-list li a:hover{background:var(--bg-hover);color:var(--text-primary)}
.nav-list li a.active{
  border-left-color:var(--accent-fill);
  color:var(--text-heading);
  background:var(--bg-active);
  font-weight:600;
}

/* ── Страница ─────────────── */
.main{flex:1;min-width:0}
.page{display:none;padding:56px 72px 80px}
.page.visible{display:block}
/* По центру свободного места, как колонка в редакторе */
.article{max-width:var(--measure);margin:0 auto}

/* Обложка — полоса цвета ветки над заголовком, во всю ширину страницы */
.cover{
  height:clamp(120px,22vh,200px);
  margin:-56px -72px 40px;
  background:
    radial-gradient(120% 140% at 100% 0%,color-mix(in srgb,var(--accent-fill) 55%,var(--bg-primary)) 0%,transparent 60%),
    linear-gradient(120deg,var(--accent-fill) 0%,color-mix(in srgb,var(--accent-fill) 35%,var(--bg-primary)) 100%);
}

h1,h2,h3,h4,h5,h6{
  font-family:var(--font-text);font-weight:700;
  color:var(--text-heading);line-height:1.25;
  text-wrap:balance;
}
h1{font-size:2.1em;margin-bottom:.4em}
h2{font-size:1.5em;margin:1.4em 0 .4em}
h3{font-size:1.25em;margin:1.4em 0 .4em}
h4{font-size:1.1em;margin:1.3em 0 .3em}
h5,h6{font-size:1em;margin:1.3em 0 .3em}

p{margin-bottom:.85em}
.empty-p{margin-bottom:.4em}

a{color:var(--accent);text-decoration:underline;text-underline-offset:2px;transition:color .15s ease}
a:hover{color:var(--accent-hover)}
.int-link{
  display:inline-block;font-style:normal;text-decoration:none;
  color:var(--accent);background:var(--bg-active);
  padding:0 6px 0 4px;border-radius:4px;font-size:.9em;white-space:nowrap;
  transition:background .15s ease;
}
.int-link::before{content:'↗ ';font-size:.8em;opacity:.65}
.int-link:hover{background:var(--bg-hover)}
.int-link-broken{color:var(--text-muted);font-style:italic;text-decoration:line-through}

blockquote{border-left:3px solid var(--accent-fill);margin:1em 0;
           padding:.3em 0 .3em 1.2em;color:var(--text-secondary);font-style:italic}
code{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:.875em;
     background:var(--bg-active);color:var(--accent);padding:.1em .35em;border-radius:3px}
pre{background:var(--bg-panel);border:1px solid var(--border);border-radius:6px;
    padding:1em 1.2em;margin:1em 0;overflow-x:auto}
pre code{background:none;padding:0;font-size:.875em;color:var(--text-primary)}
ul,ol{padding-left:1.5em;margin:.5em 0 .75em}
li{margin:.2em 0}
li::marker{color:var(--accent-dim)}
hr{border:none;border-top:1px solid var(--border);margin:2em 0}
/* Сноски */
.fn-ref{font-family:var(--font-ui);font-size:.62em;font-weight:600;vertical-align:super;line-height:1}
.fn-ref a{color:var(--accent);text-decoration:none;background:var(--bg-active);border-radius:3px;padding:1px 3px}
.fn-ref a:hover{background:var(--bg-hover)}
.sources{margin:2.5em 0 1em;padding:18px 20px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel)}
.sources-title{font-family:var(--font-ui);font-size:11px!important;font-weight:600;letter-spacing:.07em;
  text-transform:uppercase;color:var(--text-muted);margin:0 0 10px}
.sources-items{margin:0;padding-left:1.4em;font-family:var(--font-ui);font-size:13.5px;line-height:1.6;color:var(--text-secondary)}
.sources-items li{margin:.3em 0}
.sources-items li::marker{color:var(--accent);font-variant-numeric:tabular-nums}
.fn-back{color:var(--text-muted);text-decoration:none;margin-left:4px}
.fn-back:hover{color:var(--accent)}
.kb-img{margin:1.5em 0;border-radius:8px}
.kb-img img{display:block;max-width:100%;height:auto;border-radius:8px}
strong{font-weight:700;color:var(--text-heading)}
em{font-style:italic}
s{color:var(--text-muted);text-decoration:line-through}
/* Таблицы: fixed — чтобы длинная ячейка не раздувала колонку;
   у последнего блока в ячейке гасим нижний отступ абзаца */
.table-scroll{overflow-x:auto;margin:1.4em 0}
table{border-collapse:collapse;width:100%;table-layout:fixed;margin:1.4em 0}
.table-scroll table{margin:0;min-width:520px}
th,td{border:1px solid var(--border-light);padding:.55em .8em;
      text-align:left;vertical-align:top}
th{background:var(--bg-panel);font-family:var(--font-ui);font-size:.875em;font-weight:600}
td>*:last-child,th>*:last-child{margin-bottom:0}

/* ── Шапка страницы ───────── */
.page-header{margin-bottom:2em}
.page-header h1{margin-bottom:.2em}
.subtitle{color:var(--text-muted);font-family:var(--font-ui);font-size:13px}

/* ── Главная: карточки ────── */
.card-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:14px;margin-top:1.5em;
}
.card{
  background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
  padding:18px 20px;text-decoration:none;
  display:flex;flex-direction:column;gap:6px;min-height:96px;
  transition:background .15s ease,border-color .15s ease,transform .15s ease;
}
.card::before{content:'';width:22px;height:4px;border-radius:2px;background:var(--accent-fill);margin-bottom:6px}
.card:hover{border-color:var(--border-light);transform:translateY(-2px)}
.card-title{font-family:var(--font-text);font-weight:700;font-size:15px;
            color:var(--text-heading);line-height:1.35}
.card-date{margin-top:auto;font-size:12px;color:var(--text-muted);font-family:var(--font-ui)}

/* ── Главная: список ──────── */
.doc-list{list-style:none;padding:0;margin:1em 0 0;border-top:1px solid var(--border)}
.doc-list li{margin:0}
.doc-list a{
  display:flex;align-items:baseline;gap:16px;
  padding:14px 4px;border-bottom:1px solid var(--border);
  text-decoration:none;color:var(--text-heading);
  transition:background .15s ease;
}
.doc-list a:hover{background:var(--bg-hover)}
.doc-list .card-title{flex:1;min-width:0;font-size:1em}
.doc-list .card-date{margin:0;white-space:nowrap}

/* ── Подвал ───────────────── */
.page-footer{margin-top:4em;padding-top:1.4em;border-top:1px solid var(--border);
             font-family:var(--font-ui);font-size:13px}
.page-footer a{color:var(--text-secondary);text-decoration:none}
.page-footer a:hover{color:var(--accent)}

/* ── Узкий экран ──────────── */
@media(max-width:780px){
  body{flex-direction:column}
  .sidebar{width:100%;height:auto;position:static;border-right:none;border-bottom:1px solid var(--border)}
  .page{padding:32px 20px 60px}
  .cover{margin:-32px -20px 28px}
}
`

// Мини-роутер: показывает одну страницу по location.hash, подсвечивает
// пункт меню. Всё внутри одного файла — работает с file:// без сервера.
// Якорь внутри страницы (сноска, «вернуться к тексту») открывает страницу,
// где он лежит, — раньше он прятал все страницы разом.
export function kbRoute(doc, hash, scroll = true) {
  const id = (hash || '').replace(/^#/, '')
  const target = id && doc.getElementById(id)
  const page = (target && target.closest('.page')) || doc.getElementById('home')
  const pages = doc.querySelectorAll('.page')
  for (let i = 0; i < pages.length; i++) pages[i].classList.toggle('visible', pages[i] === page)
  const links = doc.querySelectorAll('.nav-list a, .sidebar-brand')
  for (let j = 0; j < links.length; j++) {
    const href = links[j].getAttribute('href') || ''
    links[j].classList.toggle('active', href === '#' + page.id || (page.id === 'home' && href === '#'))
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

const fmtDate = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

function buildSidebar(docs, hrefFor, ctx) {
  return docs.map(doc =>
    `      <li><a href="${esc(hrefFor(doc))}">${title(doc, ctx)}</a></li>`
  ).join('\n')
}

function buildHomePage(docs, hrefFor, kbTitle, ctx, o) {
  const date = (doc) => o.dates
    ? `<div class="card-date">${fmtDate(doc.updatedAt || doc.createdAt || Date.now())}</div>` : ''
  const items = o.home === 'list'
    ? `<ul class="doc-list">${docs.map(doc => `
      <li><a href="${esc(hrefFor(doc))}"><span class="card-title">${title(doc, ctx)}</span>${date(doc)}</a></li>`).join('')}
    </ul>`
    : `<div class="card-grid">${docs.map(doc => `
      <a href="${esc(hrefFor(doc))}" class="card">
        <div class="card-title">${title(doc, ctx)}</div>${date(doc)}
      </a>`).join('')}
    </div>`
  return `
  <section class="page visible" id="home">${o.cover ? '\n    <div class="cover"></div>' : ''}
    <article class="article">
      <header class="page-header">
        <h1>${esc(typografy(kbTitle, ctx))}</h1>
        <p class="subtitle">${docs.length}&nbsp;${pluralDocs(docs.length)}</p>
      </header>
      ${items}
    </article>
  </section>`
}

function buildDocPage(doc, ctx, o) {
  const { titleHtml, bodyHtml } = docParts(doc, ctx)
  const h1 = titleHtml != null ? typografy(titleHtml, ctx) : title(doc, ctx)
  const ts = doc.updatedAt || doc.createdAt
  return `
  <section class="page" id="d-${esc(doc.id)}">${o.cover ? '\n    <div class="cover"></div>' : ''}
    <article class="article">
      <header class="page-header">
        <h1>${h1}</h1>${o.dates && ts ? `\n        <p class="subtitle">${fmtDate(ts)}</p>` : ''}
      </header>
      ${typografy(bodyHtml, ctx)}
      <footer class="page-footer">
        <a href="#">← К содержанию</a>
      </footer>
    </article>
  </section>`
}

// ── Public export ─────────────────────────────────────────────────────────────
// База знаний — ОДИН самодостаточный HTML-файл: открывается двойным
// кликом, внутри главная с карточками, боковое меню и все документы
// с рабочими ссылками между ними.

// `typograf` — экземпляр Typograf с настройками пользователя или null,
// если типографику отключили. Прогоняется по тем же правилам, что и предпросмотр.
export function buildKnowledgeBaseHtml(docs, kbTitle = 'База знаний', typograf = null, options = {}) {
  const o = { ...KB_DEFAULTS, ...options }
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
<aside class="sidebar">
  <a class="sidebar-brand" href="#">${esc(typografy(kbTitle, ctx))}</a>
  <nav>
    <ul class="nav-list">
${buildSidebar(docs, hrefFor, ctx)}
    </ul>
  </nav>
</aside>
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
