import { numberFootnotesJson, sourceKey } from './footnotes'

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
      return `<table>\n${rows}\n</table>\n`
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

function docToHtml(doc, ctx) {
  if (!doc.content) return ''
  if (typeof doc.content === 'string') return doc.content // legacy HTML string
  const content = doc.content.content || []
  // Академическая нумерация: один источник — один номер
  const { sources, map } = numberFootnotesJson(content)
  ctx.footnotes = sources   // уникальные источники для блока «Источники»
  ctx.fnMap = map           // ключ источника → номер
  ctx.fnOcc = new Map()     // счётчик вхождений на источник (для уникальных id)
  ctx.docId = doc.id
  return nodesToHtml(content, ctx)
}

// ── CSS ───────────────────────────────────────────────────────────────────────
// Палитра и типографика — те же, что в рабочем экране Печатников
// (см. src/styles/variables.css): тёмный лес, Georgia для текста,
// системный шрифт для интерфейса.

const KB_CSS = `
:root{
  --bg-primary:#0f1810;
  --bg-panel:#0c1510;
  --bg-hover:#182618;
  --bg-active:#1e3020;
  --accent:#62a030;
  --accent-hover:#73bb38;
  --accent-dim:#38601a;
  --text-primary:#cce0cc;
  --text-secondary:#6d9470;
  --text-muted:#374f38;
  --border:#1a2e1c;
  --border-light:#243828;
  --font-editor:Georgia,'Times New Roman',serif;
  --font-ui:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:17px;-webkit-font-smoothing:antialiased}
::selection{background:rgba(98,160,48,.22)}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border-light)}
body{
  font-family:var(--font-editor);
  background:var(--bg-primary);
  color:var(--text-primary);
  display:flex;
  min-height:100vh;
  line-height:1.75;
}

/* ── Sidebar ─────────────── */
.sidebar{
  width:256px;flex-shrink:0;
  background:var(--bg-panel);
  border-right:1px solid var(--border);
  position:sticky;top:0;height:100vh;
  overflow-y:auto;
  display:flex;flex-direction:column;
}
.sidebar-brand{
  display:block;
  font-family:var(--font-ui);
  font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;
  color:var(--accent);
  padding:22px 20px 18px;
  border-bottom:1px solid var(--border);
  text-decoration:none;
}
.sidebar-brand:hover{color:var(--accent-hover)}
.nav-list{list-style:none;padding:10px 0;flex:1}
.nav-list li a{
  display:block;
  font-family:var(--font-ui);font-size:13px;
  color:var(--text-secondary);text-decoration:none;
  padding:6px 20px;
  border-left:2px solid transparent;
  transition:background .15s ease,color .15s ease;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.nav-list li a:hover{background:var(--bg-hover);color:var(--text-primary)}
.nav-list li a.active{
  border-left-color:var(--accent);
  color:var(--accent);
  background:var(--bg-active);
  font-weight:600;
}

/* ── Main ────────────────── */
.main{
  flex:1;min-width:0;
  padding:56px 72px 80px;
}
.article{max-width:680px}

/* Страницы: видна только одна */
.page{display:none}
.page.visible{display:block}

h1,h2,h3,h4,h5,h6{
  font-family:var(--font-ui);font-weight:600;
  color:var(--text-primary);line-height:1.3;
}
h1{font-size:2em;margin-bottom:.4em}
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

blockquote{border-left:3px solid var(--accent-dim);margin:1em 0;
           padding:.5em 0 .5em 1.2em;color:var(--text-secondary);font-style:italic}
code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.875em;
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
strong{font-weight:700;color:var(--text-primary)}
em{font-style:italic}
s{color:var(--text-muted);text-decoration:line-through}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{border:1px solid var(--border-light);padding:.5em .8em;text-align:left}
th{background:var(--bg-panel);font-family:var(--font-ui);font-size:.875em;font-weight:600}

/* ── Page header ─────────── */
.page-header{margin-bottom:2.2em;padding-bottom:1.3em;border-bottom:1px solid var(--border)}
.page-header h1{margin-bottom:.15em}
.subtitle{color:var(--text-secondary);font-family:var(--font-ui);font-size:.8em}

/* ── Cards (index) ────────── */
.card-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:14px;margin-top:1.5em;
}
.card{
  background:var(--bg-panel);border:1px solid var(--border-light);border-radius:10px;
  padding:18px 20px;text-decoration:none;
  display:block;
  transition:background .15s ease,border-color .15s ease,transform .15s ease;
}
.card:hover{background:var(--bg-hover);border-color:var(--accent-dim);transform:translateY(-2px)}
.card-title{font-family:var(--font-ui);font-weight:600;font-size:14px;
            color:var(--text-primary);margin-bottom:6px;line-height:1.35}
.card-date{font-size:11.5px;color:var(--text-secondary);font-family:var(--font-ui)}

/* ── Footer ──────────────── */
.page-footer{margin-top:4em;padding-top:1.4em;border-top:1px solid var(--border);
             font-family:var(--font-ui);font-size:13px}
.page-footer a{color:var(--text-secondary);text-decoration:none}
.page-footer a:hover{color:var(--accent)}

/* ── Responsive ──────────── */
@media(max-width:780px){
  body{flex-direction:column}
  .sidebar{width:100%;height:auto;position:static;border-right:none;border-bottom:1px solid var(--border)}
  .main{padding:32px 20px 60px}
}
`

// Мини-роутер: показывает одну страницу по location.hash, подсвечивает
// пункт меню. Всё внутри одного файла — работает с file:// без сервера.
const KB_JS = `
function kbRoute(){
  var id = location.hash.slice(1) || 'home';
  if (!document.getElementById(id)) id = 'home';
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.toggle('visible', pages[i].id === id);
  }
  var links = document.querySelectorAll('.nav-list a, .sidebar-brand');
  for (var j = 0; j < links.length; j++) {
    var href = links[j].getAttribute('href') || '';
    links[j].classList.toggle('active', href === '#' + id || (id === 'home' && href === '#'));
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', kbRoute);
kbRoute();
`

// ── Сборка единого файла ──────────────────────────────────────────────────────

function buildSidebar(docs, hrefFor) {
  const items = docs.map(doc =>
    `      <li><a href="${esc(hrefFor(doc))}">${esc(doc.title || 'Без названия')}</a></li>`
  ).join('\n')
  return `    <li><a href="#">Главная</a></li>\n${items}`
}

function buildHomePage(docs, hrefFor, kbTitle) {
  const fmt = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const cards = docs.map(doc => `
    <a href="${esc(hrefFor(doc))}" class="card">
      <div class="card-title">${esc(doc.title || 'Без названия')}</div>
      <div class="card-date">${fmt(doc.updatedAt || doc.createdAt || Date.now())}</div>
    </a>`).join('')
  return `
  <article class="article page" id="home">
    <header class="page-header">
      <h1>${esc(kbTitle)}</h1>
      <p class="subtitle">${docs.length}&nbsp;${pluralDocs(docs.length)}</p>
    </header>
    <div class="card-grid">${cards}
    </div>
  </article>`
}

function buildDocPage(doc, ctx) {
  return `
  <article class="article page" id="d-${esc(doc.id)}">
    <header class="page-header">
      <h1>${esc(doc.title || 'Без названия')}</h1>
    </header>
    ${docToHtml(doc, ctx)}
    <footer class="page-footer">
      <a href="#">← К содержанию</a>
    </footer>
  </article>`
}

// ── Public export ─────────────────────────────────────────────────────────────
// База знаний — ОДИН самодостаточный HTML-файл: открывается двойным
// кликом, внутри главная с карточками, боковое меню и все документы
// с рабочими ссылками между ними.

export function exportKnowledgeBase(docs, kbTitle = 'База знаний') {
  if (!docs?.length) return

  const hrefFor  = (doc) => `#d-${doc.id}`
  const docsById = Object.fromEntries(docs.map(d => [d.id, d]))
  const sorted   = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)
  const ctx      = { docsById, hrefFor }

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(kbTitle)}</title>
<style>${KB_CSS}</style>
</head>
<body>
<aside class="sidebar">
  <a class="sidebar-brand" href="#">${esc(kbTitle)}</a>
  <nav>
    <ul class="nav-list">
${buildSidebar(sorted, hrefFor)}
    </ul>
  </nav>
</aside>
<main class="main">
${buildHomePage(sorted, hrefFor, kbTitle)}
${sorted.map(doc => buildDocPage(doc, ctx)).join('\n')}
</main>
<script>${KB_JS}</script>
</body>
</html>`

  const safeName = kbTitle.replace(/[\\/:*?"<>|]/g, '-').trim() || 'База знаний'
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${safeName}.html` })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
