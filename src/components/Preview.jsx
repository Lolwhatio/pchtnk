import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import html2pdf from 'html2pdf.js'
import TypografPanel from './TypografPanel'
import { editorToMarkdown, markdownToHtml } from '../utils/markdown'
import { IconSettings } from './icons'
import { pdfCss, CONTENT_W, CONTENT_H, MARGIN_MM } from '../utils/pdfLayout'
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
  p{margin:0 0 .35em}
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

// Печатная вёрстка живёт в utils/pdfLayout — одна и на предпросмотр, и на файл.

// Тело документа для PDF. Никакой отдельной шапки: название документа —
// это его же заголовок первого уровня, набранный как все остальные.
// Дописываем заголовок сами только тогда, когда в тексте его нет, — иначе
// файл уходил бы вообще без названия на первой странице.
function pdfBody(html, fileName) {
  const box = document.createElement('div')
  box.innerHTML = html
  const first = box.firstElementChild
  if (!first || first.tagName !== 'H1') {
    return `<h1>${escapeHtml(fileName)}</h1>${html}`
  }
  return html
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Предпросмотр PDF: настоящие страницы ─────────────────────────────────────
// Раньше здесь был один белый прямоугольник ростом ровно в A4, а текст,
// который в него не влез, вываливался наружу и дочитывался тёмным по тёмному.
// Теперь поток режется на страницы по тем же размерам, по которым его режет
// html2pdf: блок целиком уходит на следующую страницу, если не помещается.
function paginate(host, html) {
  host.textContent = ''

  const probe = document.createElement('div')
  probe.className = 'pdf-doc pdf-probe'
  probe.style.width = `${CONTENT_W}px`
  probe.innerHTML = html
  host.appendChild(probe)

  // Считаем по offsetTop, а не по высоте: так учитываются схлопнутые отступы
  const pages = [[]]
  let pageTop = 0
  for (const block of [...probe.children]) {
    const bottom = block.offsetTop + block.offsetHeight
    const current = pages[pages.length - 1]
    if (current.length && bottom - pageTop > CONTENT_H) {
      pageTop = block.offsetTop
      pages.push([block])
    } else {
      current.push(block)
    }
  }

  probe.remove()

  pages.forEach((blocks, i) => {
    const page = document.createElement('div')
    // Блок выше страницы (большая картинка, длинная таблица) целиком
    // не помещается никуда — такой странице разрешаем вырасти, иначе
    // предпросмотр молча обрезал бы содержимое
    const tall = blocks.some(b => b.offsetHeight > CONTENT_H)
    page.className = `pdf-page${tall ? ' pdf-page--tall' : ''}`

    const body = document.createElement('div')
    body.className = 'pdf-doc pdf-page__body'
    blocks.forEach(b => body.appendChild(b))
    page.appendChild(body)

    const num = document.createElement('div')
    num.className = 'pdf-page__num'
    num.textContent = `${i + 1} / ${pages.length}`
    page.appendChild(num)

    host.appendChild(page)
  })
}

function PdfPaper({ html, fileName }) {
  const hostRef = useRef(null)
  const styleRef = useRef(null)

  useLayoutEffect(() => {
    if (styleRef.current) styleRef.current.textContent = pdfCss()
  }, [])

  useLayoutEffect(() => {
    if (hostRef.current) paginate(hostRef.current, pdfBody(html, fileName))
  }, [html, fileName])

  return (
    <>
      <style ref={styleRef} />
      <div className="pdf-sheets" ref={hostRef} />
    </>
  )
}

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

  // MD / HTML / PDF выбирают формат и показывают его в предпросмотре,
  // скачивает отдельная кнопка. Раньше эти три кнопки выглядели как
  // переключатель, а работали как «скачать немедленно»: файл падал в загрузки
  // от одного клика по вкладке, и посмотреть, что именно уедет, было негде.
  const [format, setFormat] = useState('html')

  const markdown = useMemo(() => (editor ? editorToMarkdown(editor) : ''), [editor])

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
      // Обёртку обязательно кладём в документ — здесь и была причина
      // «плакатного» кегля.
      //
      // html2pdf снимает элемент по его собственным размерам и по ним же
      // считает переносы страниц. У элемента, которого нет в документе,
      // размеры нулевые: текст верстался в колонку шириной чуть ли не
      // в слово, каждый неразрывный блок выглядел вылезающим за страницу
      // и получал перенос — девять страниц вместо двух, файл на 5 МБ
      // и растянутый на всю ширину листа шрифт.
      //
      // Прячем за экраном хост, а обёртка внутри него лежит обычным блоком:
      // у position:fixed высота родителю не достаётся, и снимок выходил
      // нулевой высоты.
      const host = document.createElement('div')
      host.style.cssText = `position:fixed;left:-100000px;top:0;width:${CONTENT_W}px`

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `width:${CONTENT_W}px;background:#ffffff`
      host.appendChild(wrapper)
      document.body.appendChild(host)

      const style = document.createElement('style')
      style.textContent = pdfCss()
      wrapper.appendChild(style)

      const content = document.createElement('div')
      content.className = 'pdf-doc'
      content.innerHTML = pdfBody(html, fileName)
      wrapper.appendChild(content)

      const blob = await html2pdf().set({
        margin: MARGIN_MM,
        // 0.98 на почти белой странице давал мегабайты ни за что
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // html2pdf режет один длинный снимок по высоте страницы — где придётся,
        // хоть посередине строки. Поэтому перечисляем всё, что рвать нельзя,
        // и абзац с пунктом списка здесь обязательны: без них низ страницы
        // приходился на середину строки, а её вторая половина уезжала наверх
        // следующей. Тот же список блоков, что переносит предпросмотр, —
        // страницы обязаны совпасть.
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'li', 'blockquote', 'pre',
            'table', 'tr', 'figure', 'img', '.sources',
          ],
        },
      }).from(wrapper).outputPdf('blob')

      host.remove()

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
    download(markdown, fileName + '.md', 'text/markdown')
    flashDone(fileName + '.md')
  }

  const FORMATS = [
    { id: 'md',   label: 'MD',   ext: '.md',   hint: 'Исходник markdown — для гита, заметок, других редакторов' },
    { id: 'html', label: 'HTML', ext: '.html', hint: 'Готовая веб-страница со стилями' },
    { id: 'pdf',  label: 'PDF',  ext: '.pdf',  hint: 'Постранично, для печати и отправки' },
  ]
  const current = FORMATS.find(f => f.id === format)

  const handleDownload = () => {
    if (format === 'md')   return handleExportMarkdown()
    if (format === 'html') return handleExportHTML()
    return handleExportPDF()
  }

  return (
    <div className="preview">
      <div className="preview-header">
        <button className="preview-close" onClick={onClose}>← Назад</button>
        <span className="preview-title">{fileName}</span>
        <div className="preview-actions">
          <div className="preview-formats" role="radiogroup" aria-label="Формат">
            {FORMATS.map(f => (
              <button
                key={f.id}
                className={`preview-format${format === f.id ? ' preview-format--on' : ''}`}
                role="radio"
                aria-checked={format === f.id}
                onClick={() => setFormat(f.id)}
                title={f.hint}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            className="preview-btn preview-btn--primary"
            onClick={handleDownload}
            disabled={building}
            title={`Сохранить ${fileName}${current.ext}`}
          >
            {building ? 'Собираем…' : `Скачать ${current.ext}`}
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

      {/* Предпросмотр показывает выбранный формат: markdown — исходником,
          PDF — на белой странице, как он и напечатается. Иначе вкладки
          переключались бы, а на экране ничего не менялось. */}
      <div className={`preview-body${format === 'pdf' ? ' preview-body--paper' : ''}`}>
        {format === 'md' ? (
          <pre className="preview-source">{markdown}</pre>
        ) : format === 'pdf' ? (
          <PdfPaper html={html} fileName={fileName} />
        ) : (
          <div
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
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
