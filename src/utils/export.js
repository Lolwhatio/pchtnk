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
    case 'image': {
      const { src, alt, width, cropW } = node.attrs || {}
      if (!src) return ''
      const img = `<img src="${esc(src)}" alt="${esc(alt || '')}"${width ? ` style="width:${Number(width)}px;${cropW ? 'max-width:none' : 'max-width:100%'}"` : ''}>`
      if (cropW) {
        return `<figure class="kb-img" style="width:${Number(cropW)}px;max-width:100%;overflow:hidden">${img}</figure>\n`
      }
      return `<figure class="kb-img">${img}</figure>\n`
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
  return nodesToHtml(doc.content.content || [], ctx)
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const KB_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-font-smoothing:antialiased}
body{
  font-family:Georgia,'Times New Roman',serif;
  background:#f2f6ee;
  color:#1a2a1c;
  display:flex;
  min-height:100vh;
  line-height:1.75;
}

/* ── Sidebar ─────────────── */
.sidebar{
  width:256px;flex-shrink:0;
  background:#0f1c12;color:#9abf9e;
  padding:0;
  position:sticky;top:0;height:100vh;
  overflow-y:auto;
  display:flex;flex-direction:column;
}
.sidebar-brand{
  display:block;
  font-family:system-ui,sans-serif;
  font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:#62a030;
  padding:24px 20px 20px;
  border-bottom:1px solid #1a3020;
  text-decoration:none;
}
.sidebar-brand:hover{color:#7acc40}
.nav-list{list-style:none;padding:10px 0;flex:1}
.nav-list li a{
  display:block;
  font-family:system-ui,sans-serif;font-size:13px;
  color:#8ab890;text-decoration:none;
  padding:6px 20px;
  border-left:2px solid transparent;
  transition:background .1s,color .1s;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.nav-list li a:hover{background:rgba(255,255,255,.04);color:#b8d8bc}
.nav-list li a.active{
  border-left-color:#62a030;
  color:#82c840;
  background:rgba(98,160,48,.12);
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

h1{font-family:system-ui,sans-serif;font-size:2.25em;font-weight:800;line-height:1.2;
   margin-bottom:.5em;color:#0f1c10}
h2{font-family:system-ui,sans-serif;font-size:1.5em;font-weight:700;
   margin:2em 0 .5em;color:#182818}
h3{font-family:system-ui,sans-serif;font-size:1.2em;font-weight:600;
   margin:1.6em 0 .4em;color:#1e3020}
h4,h5,h6{font-family:system-ui,sans-serif;font-weight:600;margin:1.3em 0 .3em}

p{margin-bottom:.85em}
.empty-p{margin-bottom:.4em}

a{color:#3a7828;text-decoration:none;border-bottom:1px solid rgba(58,120,40,.3);transition:border-color .1s}
a:hover{border-bottom-color:#3a7828}
.int-link{font-style:italic;color:#2d6622;background:rgba(98,160,48,.08);
          padding:0 .25em;border-radius:3px;border-bottom:1px solid rgba(98,160,48,.3)}
.int-link:hover{background:rgba(98,160,48,.15);border-bottom-color:#62a030}
.int-link-broken{color:#999;font-style:italic;text-decoration:line-through}

blockquote{border-left:3px solid #62a030;margin:1.5em 0;
           padding:.6em 0 .6em 1.4em;color:#3a5a3c;font-style:italic}
code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.875em;
     background:#e4eede;color:#1a3a1c;padding:.15em .4em;border-radius:4px}
pre{background:#e4eede;border:1px solid #c8d8c0;border-radius:8px;
    padding:1.25em 1.5em;margin:1.5em 0;overflow-x:auto}
pre code{background:none;padding:0;font-size:.875em}
ul,ol{margin:.5em 0 1em 1.5em}
li{margin-bottom:.3em}
hr{border:none;border-top:1px solid #c0d4b8;margin:2.5em 0}
.kb-img{margin:1.5em 0;border-radius:8px}
.kb-img img{display:block;max-width:100%;height:auto;border-radius:8px}
strong{font-weight:700}
em{font-style:italic}
s{text-decoration:line-through;opacity:.6}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{border:1px solid #c8d8c0;padding:.5em .8em;text-align:left}
th{background:#ddebd5;font-family:system-ui,sans-serif;font-size:.875em;font-weight:600}

/* ── Page header ─────────── */
.page-header{margin-bottom:2.5em;padding-bottom:1.5em;border-bottom:1px solid #c0d4b8}
.page-header h1{margin-bottom:.2em}
.subtitle{color:#5a8a5c;font-family:system-ui,sans-serif;font-size:.95em}

/* ── Cards (index) ────────── */
.card-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:16px;margin-top:1.5em;
}
.card{
  background:#fff;border:1px solid #c8d8c0;border-radius:10px;
  padding:20px 22px;text-decoration:none;border-bottom:none;
  display:block;
  transition:box-shadow .15s,transform .15s;
}
.card:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);transform:translateY(-2px)}
.card-title{font-family:system-ui,sans-serif;font-weight:600;font-size:14.5px;
            color:#1a2a1c;margin-bottom:6px;line-height:1.35}
.card-date{font-size:12px;color:#7a9a7c;font-family:system-ui,sans-serif}

/* ── Footer ──────────────── */
.page-footer{margin-top:4em;padding-top:1.5em;border-top:1px solid #c0d4b8;
             font-family:system-ui,sans-serif;font-size:13px}
.page-footer a{color:#5a8a5c;border-bottom:none}
.page-footer a:hover{color:#3a7828}

/* ── Responsive ──────────── */
@media(max-width:780px){
  body{flex-direction:column}
  .sidebar{width:100%;height:auto;position:static}
  .main{padding:32px 24px 60px}
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
  return `    <li><a href="#">🏠 Главная</a></li>\n${items}`
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
