import { useState, useEffect } from 'react'
import html2pdf from 'html2pdf.js'
import TypografPanel from './TypografPanel'
import { editorToMarkdown, markdownToHtml } from '../utils/markdown'
import './Preview.css'

const PRINT_STYLES = `
  body { font-family: Georgia, serif; font-size: 17px; line-height: 1.75;
         max-width: 680px; margin: 40px auto; color: #111; padding: 0 24px; }
  h1,h2,h3,h4,h5,h6 { font-family: system-ui, sans-serif; margin: 1.2em 0 0.4em; }
  blockquote { border-left: 3px solid #3d6520; padding-left: 1em;
               color: #3d5232; font-style: italic; margin: 1em 0; }
  code { background: #eef5e8; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.875em; }
  pre { background: #eef5e8; padding: 1em; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid #b8d4aa; margin: 2em 0; }
  a { color: #3d6520; }
`

export default function Preview({ editor, fileName, typograf, typografEnabled, onTypografToggle, onClose }) {
  const [showTypograf, setShowTypograf] = useState(false)
  const [html, setHtml] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!editor) return
    const raw = editorToMarkdown(editor)
    const rendered = markdownToHtml(raw)
    setHtml(typografEnabled && typograf ? typograf.execute(rendered) : rendered)
  }, [editor, typografEnabled, typograf])

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      // Создаём изолированный элемент с явными чёрно-белыми стилями
      // чтобы html2canvas не захватил CSS-переменные тёмной темы
      const wrapper = document.createElement('div')
      wrapper.style.cssText = [
        'font-family: Georgia, serif',
        'font-size: 17px',
        'line-height: 1.75',
        'color: #111',
        'background: #ffffff',
        'padding: 0',
      ].join(';')

      const style = document.createElement('style')
      style.textContent = `
        * { color: #111 !important; background: transparent !important; box-shadow: none !important; }
        h1,h2,h3,h4,h5,h6 { font-family: system-ui,sans-serif; color: #000 !important; margin: 1.2em 0 0.4em; line-height: 1.3; }
        h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
        p { margin: 0 0 0.75em; }
        a { color: #2d5a1b !important; text-decoration: underline; }
        blockquote { border-left: 3px solid #3d6520 !important; padding-left: 1em; font-style: italic; margin: 1em 0; }
        code { background: #eef5e8 !important; color: #333 !important; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.875em; font-family: monospace; }
        pre { background: #eef5e8 !important; padding: 1em; border-radius: 6px; margin: 1em 0; }
        pre code { background: transparent !important; padding: 0; }
        ul,ol { padding-left: 1.5em; margin: 0.5em 0 0.75em; }
        hr { border: none; border-top: 1px solid #ccc !important; margin: 2em 0; }
        strong { font-weight: 700; }
        em { font-style: italic; }
      `
      wrapper.appendChild(style)

      const content = document.createElement('div')
      content.innerHTML = html
      wrapper.appendChild(content)

      await html2pdf().set({
        margin: [15, 20, 15, 20],
        filename: fileName + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] },
      }).from(wrapper).save()
    } finally {
      setExporting(false)
    }
  }

  const handleExportHTML = () => {
    const full = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<title>${fileName}</title>\n<style>\n${PRINT_STYLES}\n</style>\n</head>\n<body>\n${html}\n</body>\n</html>`
    download(full, fileName + '.html', 'text/html')
  }

  const handleExportMarkdown = () => {
    const md = editorToMarkdown(editor)
    download(md, fileName + '.md', 'text/markdown')
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
            disabled={exporting}
            title="Скачать .pdf"
          >
            {exporting ? '…' : 'PDF'}
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

function IconSettings() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 1.5a3 3 0 0 0-2.2 5L2 12.8a.85.85 0 0 0 1.2 1.2L9.5 7.7a3 3 0 0 0 4.1-4.1L11.8 5.4 10.6 4.2l1.8-1.8a3 3 0 0 0-1.9-.9z"/></svg>
}
