import { useState, useMemo, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import TypografPanel from './TypografPanel'
import { editorToMarkdown, markdownToHtml } from '../utils/markdown'
import { IconSettings } from './icons'
import './Preview.css'

const PRINT_STYLES = `
  *,*::before,*::after{box-sizing:border-box}
  body{
    font-family:Georgia,'Times New Roman',serif;
    font-size:18px;line-height:1.6;
    max-width:600px;margin:56px auto;
    color:#1a2a1c;background:#fff;
    padding:0 32px;
    -webkit-font-smoothing:antialiased;
  }
  /* Та же шкала, что в редакторе. В экспорте меток H1–H6 нет,
     поэтому иерархия должна держаться на самих размерах. */
  h1{font-family:system-ui,sans-serif;font-size:2em;font-weight:800;
     line-height:1.2;margin:0 0 .5em;color:#0f1c10}
  h2{font-family:system-ui,sans-serif;font-size:1.6em;font-weight:700;
     margin:2em 0 .5em;color:#182818}
  h3{font-family:system-ui,sans-serif;font-size:1.32em;font-weight:600;
     margin:1.6em 0 .4em}
  h4{font-family:system-ui,sans-serif;font-size:1.15em;font-weight:600;margin:1.3em 0 .3em}
  h5{font-family:system-ui,sans-serif;font-size:1em;font-weight:600;margin:1.3em 0 .3em}
  h6{font-family:system-ui,sans-serif;font-size:.9em;font-weight:600;margin:1.3em 0 .3em;
     text-transform:uppercase;letter-spacing:.06em;color:#3a5a3c}
  p{margin:0 0 1.2em}
  a{color:#3a7828;text-decoration:underline}
  blockquote{
    border-left:3px solid #62a030;
    margin:1.5em 0;padding:.6em 0 .6em 1.4em;
    color:#3a5a3c;font-style:italic;
  }
  code{
    font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.875em;
    background:#e8f0e4;color:#1a3a1c;padding:.15em .4em;border-radius:4px;
  }
  pre{
    background:#e8f0e4;border:1px solid #c8d8c0;
    border-radius:8px;padding:1.25em 1.5em;margin:1.5em 0;overflow-x:auto;
  }
  pre code{background:none;padding:0}
  ul,ol{margin:.5em 0 1em 1.5em}
  li{margin-bottom:.3em}
  hr{border:none;border-top:1px solid #c0d4b8;margin:2.5em 0}
  strong{font-weight:700}
  em{font-style:italic}
  s{text-decoration:line-through;opacity:.6}
  table{border-collapse:collapse;width:100%;margin:1.5em 0;table-layout:fixed}
  th,td{border:1px solid #c0d4b8;padding:.5em .7em;text-align:left;vertical-align:top}
  th{background:#e8f0e4;font-family:system-ui,sans-serif;font-size:.9em;font-weight:600}
  td>*:last-child,th>*:last-child{margin-bottom:0}
  span[data-doc-id]{
    font-style:italic;color:#3a7828;
    background:rgba(98,160,48,.08);padding:0 .25em;border-radius:3px;
  }
`

// Стили печатной версии — отдельно, чтобы html2canvas не схватил тёмную тему
const PDF_INLINE_STYLE = `
  *,*::before,*::after{box-sizing:border-box}
  *{color:#1a2a1c !important;background:transparent !important;box-shadow:none !important}
  body{font-family:Georgia,serif;font-size:16px;line-height:1.6}
  h1{font-family:system-ui,sans-serif;font-size:2em;font-weight:800;
     line-height:1.2;margin:0 0 .5em;color:#0f1c10 !important}
  h2{font-family:system-ui,sans-serif;font-size:1.6em;font-weight:700;
     margin:1.8em 0 .45em}
  h3{font-family:system-ui,sans-serif;font-size:1.32em;font-weight:600;
     margin:1.4em 0 .35em}
  h4{font-family:system-ui,sans-serif;font-size:1.15em;font-weight:600;margin:1.2em 0 .3em}
  h5{font-family:system-ui,sans-serif;font-size:1em;font-weight:600;margin:1.2em 0 .3em}
  h6{font-family:system-ui,sans-serif;font-size:.9em;font-weight:600;margin:1.2em 0 .3em;
     text-transform:uppercase;letter-spacing:.06em}
  p{margin:0 0 1.2em}
  a{color:#2d5a1b !important;text-decoration:underline}
  blockquote{border-left:3px solid #62a030 !important;margin:1.4em 0;
             padding:.5em 0 .5em 1.3em;font-style:italic}
  code{background:#e8f0e4 !important;color:#1a3a1c !important;
       padding:.1em .35em;border-radius:3px;font-size:.875em;font-family:monospace}
  pre{background:#e8f0e4 !important;border:1px solid #c8d8c0 !important;
      border-radius:6px;padding:1em 1.25em;margin:1.2em 0}
  pre code{background:none !important;padding:0}
  ul,ol{margin:.4em 0 .85em 1.5em}
  li{margin-bottom:.25em}
  hr{border:none;border-top:1px solid #c0d4b8 !important;margin:2.2em 0}
  strong{font-weight:700}
  em{font-style:italic}
  s{text-decoration:line-through;opacity:.6}
  /* Рамки задаём с !important — их сносит общее правило * выше */
  table{border-collapse:collapse;width:100%;margin:1.4em 0;table-layout:fixed}
  th,td{border:1px solid #9db894 !important;padding:.45em .65em;
        text-align:left;vertical-align:top}
  th{background:#e8f0e4 !important;font-family:system-ui,sans-serif;
     font-size:.9em;font-weight:600}
  td>*:last-child,th>*:last-child{margin-bottom:0}
  tr{page-break-inside:avoid}
`

export default function Preview({ editor, fileName, typograf, typografEnabled, onTypografToggle, onClose }) {
  const [showTypograf, setShowTypograf] = useState(false)
  const [building, setBuilding] = useState(false)
  const [done, setDone] = useState(null)       // что скачали — подтверждение под шапкой

  const html = useMemo(() => {
    if (!editor) return ''
    const raw = editorToMarkdown(editor)
    const rendered = markdownToHtml(raw)
    return typografEnabled && typograf ? typograf.execute(rendered) : rendered
  }, [editor, typografEnabled, typograf])

  // Все три кнопки экспорта ведут себя одинаково: собирают файл и скачивают,
  // а затем показывают, что именно скачалось. Раньше MD и HTML качали молча,
  // а PDF открывал ещё один предпросмотр поверх этого же экрана.
  const doneTimer = useRef(null)
  const flashDone = (name) => {
    setDone(name)
    if (doneTimer.current) clearTimeout(doneTimer.current)
    doneTimer.current = setTimeout(() => setDone(null), 3000)
  }
  useEffect(() => () => { if (doneTimer.current) clearTimeout(doneTimer.current) }, [])

  const handleExportPDF = async () => {
    setBuilding(true)
    try {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'font-family:Georgia,serif;font-size:17px;line-height:1.75;color:#111;background:#fff'
      const style = document.createElement('style')
      style.textContent = PDF_INLINE_STYLE
      wrapper.appendChild(style)
      const content = document.createElement('div')
      content.innerHTML = html
      wrapper.appendChild(content)

      const blob = await html2pdf().set({
        margin: [15, 20, 15, 20],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] },
      }).from(wrapper).outputPdf('blob')

      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: fileName + '.pdf' })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flashDone(fileName + '.pdf')
    } finally {
      setBuilding(false)
    }
  }

  const handleExportHTML = () => {
    const full = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<title>${fileName}</title>\n<style>\n${PRINT_STYLES}\n</style>\n</head>\n<body>\n${html}\n</body>\n</html>`
    download(full, fileName + '.html', 'text/html')
    flashDone(fileName + '.html')
  }

  const handleExportMarkdown = () => {
    const md = editorToMarkdown(editor)
    download(md, fileName + '.md', 'text/markdown')
    flashDone(fileName + '.md')
  }

  return (
    <div className="preview">
      <div className="preview-header">
        <button className="preview-close" onClick={onClose}>← Назад</button>
        <span className="preview-title">{fileName}</span>
        <div className="preview-actions">
          <button
            className="preview-btn"
            onClick={handleExportMarkdown}
            title="Скачать .md"
          >
            MD
          </button>
          <button
            className="preview-btn"
            onClick={handleExportHTML}
            title="Скачать .html"
          >
            HTML
          </button>
          <button
            className="preview-btn preview-btn--primary"
            onClick={handleExportPDF}
            disabled={building}
            title="Скачать PDF"
          >
            {building ? 'Собираем…' : 'PDF'}
          </button>
          <button
            className={`preview-btn preview-btn--icon${showTypograf ? ' active' : ''}`}
            onClick={() => setShowTypograf(s => !s)}
            title="Настройки типографа"
          >
            <IconSettings />
          </button>
        </div>
      </div>

      {done && (
        <div className="preview-done" role="status">Скачан файл {done}</div>
      )}

      <div className="preview-body">
        <div
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {showTypograf && (
        <TypografPanel
          typograf={typograf}
          enabled={typografEnabled}
          onToggle={onTypografToggle}
          onClose={() => setShowTypograf(false)}
        />
      )}

    </div>
  )
}

function download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
