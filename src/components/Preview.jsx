import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import TypografPanel from './TypografPanel'
import MarkdownSource from './MarkdownSource'
import { editorToMarkdown, markdownToHtml } from '../utils/markdown'
import { bindWidows } from '../utils/widows'
import { IconSettings, IconBack } from './icons'
import { pdfCss, splitPages, imagesReady, CONTENT_W, CONTENT_H } from '../utils/pdfLayout'
import { buildPdfBlob } from '../utils/pdfFile'
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
  /* Картинка из редактора шире колонки почти всегда — держим её в полосе.
     В кадре ужимать нельзя: уехало бы само окно (см. layOutImages) */
  img{display:block;max-width:100%;height:auto;margin:1.5em 0}
  .img-crop{margin:1.5em 0}
  .img-crop img{margin:0}
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
// Теперь поток режется на страницы — той же splitPages, которой режет его
// и сборка файла, так что предпросмотр и PDF совпадают постранично.

// Лист с содержимым. offset — на сколько целых страниц содержимое сдвинуто
// вверх: так показывается продолжение блока, который сам выше листа.
function makeSheet(body, offset) {
  const page = document.createElement('div')
  page.className = 'pdf-page'
  if (offset) body.style.marginTop = `-${offset * CONTENT_H}px`
  page.appendChild(body)
  return page
}

// Ждём картинок, поэтому асинхронно: без декодирования у <img> нулевая высота
// и страницы считаются по одному тексту (см. imagesReady). `alive` гасит
// разбивку, которую успел обогнать следующий прогон, — иначе две раскладки
// писали бы в один и тот же host.
async function paginate(host, html, alive) {
  host.textContent = ''

  const probe = document.createElement('div')
  probe.className = 'pdf-doc pdf-probe'
  probe.style.width = `${CONTENT_W}px`
  probe.innerHTML = html
  host.appendChild(probe)

  await imagesReady(probe)
  if (!alive()) { probe.remove(); return }

  const pages = splitPages(probe)

  probe.remove()

  // Сначала раскладываем, потом нумеруем: неделимый блок выше листа занимает
  // несколько страниц, и сколько их всего — известно только после раскладки.
  const sheets = []

  for (const blocks of pages) {
    const body = document.createElement('div')
    body.className = 'pdf-doc pdf-page__body'
    blocks.forEach(b => body.appendChild(b))

    const sheet = makeSheet(body, 0)
    host.appendChild(sheet)
    sheets.push(sheet)

    // Блок целиком не помещается никуда (длинный блок кода, большая таблица,
    // высокая картинка) — рвать его негде. Файл режет по высоте страницы
    // сам снимок, и предпросмотр показывает ровно то же: тот же блок,
    // сдвинутый вверх на целую страницу.
    //
    // Меряем здесь, а не при разбивке: у отсоединённого элемента offsetHeight
    // равен нулю, и «высокая» страница считалась обычной — предпросмотр молча
    // обрезал её по overflow, показывая три страницы там, где в файле шесть.
    const extra = Math.ceil(body.offsetHeight / CONTENT_H) - 1
    for (let k = 1; k <= extra; k++) {
      const tail = makeSheet(body.cloneNode(true), k)
      host.appendChild(tail)
      sheets.push(tail)
    }
  }

  sheets.forEach((sheet, i) => {
    const num = document.createElement('div')
    num.className = 'pdf-page__num'
    num.textContent = `${i + 1} / ${sheets.length}`
    sheet.appendChild(num)
  })
}

function PdfPaper({ html, fileName }) {
  const hostRef = useRef(null)
  const styleRef = useRef(null)

  useLayoutEffect(() => {
    if (styleRef.current) styleRef.current.textContent = pdfCss()
  }, [])

  useLayoutEffect(() => {
    if (!hostRef.current) return
    let alive = true
    paginate(hostRef.current, pdfBody(html, fileName), () => alive)
    return () => { alive = false }
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
  const [progress, setProgress] = useState(null) // { done, total } — сборка PDF постранично
  const [failed, setFailed] = useState(null)   // текст ошибки сборки
  const [done, setDone] = useState(null)       // что скачали — подтверждение под шапкой

  const html = useMemo(() => {
    if (!editor) return ''
    const raw = editorToMarkdown(editor)
    const rendered = markdownToHtml(raw)
    return typografEnabled && typograf ? bindWidows(typograf.execute(rendered)) : rendered
  }, [editor, typografEnabled, typograf])

  // MD / HTML / PDF выбирают формат и показывают его в предпросмотре,
  // скачивает отдельная кнопка. Раньше эти три кнопки выглядели как
  // переключатель, а работали как «скачать немедленно»: файл падал в загрузки
  // от одного клика по вкладке, и посмотреть, что именно уедет, было негде.
  const [format, setFormat] = useState('html')

  const markdown = useMemo(() => (editor ? editorToMarkdown(editor) : ''), [editor])

  const doneTimer = useRef(null)
  const flashDone = (text) => {
    setDone(text)
    if (doneTimer.current) clearTimeout(doneTimer.current)
    doneTimer.current = setTimeout(() => setDone(null), 3000)
  }
  useEffect(() => () => { if (doneTimer.current) clearTimeout(doneTimer.current) }, [])

  const FORMATS = [
    { id: 'md',   label: 'MD',   ext: '.md',   mime: 'text/markdown',   kind: 'Markdown', hint: 'Исходник markdown — для гита, заметок, других редакторов' },
    { id: 'html', label: 'HTML', ext: '.html', mime: 'text/html',       kind: 'HTML',     hint: 'Готовая веб-страница со стилями' },
    { id: 'pdf',  label: 'PDF',  ext: '.pdf',  mime: 'application/pdf', kind: 'PDF',      hint: 'Постранично, для печати и отправки' },
  ]
  const current = FORMATS.find(f => f.id === format)

  const htmlFile = () =>
    `<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<title>${fileName}</title>\n<style>\n${PRINT_STYLES}\n</style>\n</head>\n<body>\n${html}\n</body>\n</html>`

  // Подтверждение под шапкой: сохранили в выбранное место или отдали браузеру
  const finish = (how, name) => flashDone(how === 'saved' ? `Файл ${name} сохранен` : `Скачан файл ${name}`)

  // Место для файла спрашиваем сразу по нажатию: диалог открывается только
  // в ответ на действие человека, а PDF собирается секунды — к концу сборки
  // разрешение открыть диалог уже истекло бы. Поэтому сначала «куда»,
  // потом сборка и запись.
  const handleDownload = async () => {
    const f = current
    const name = fileName + f.ext
    let target
    try {
      target = await pickSaveTarget(name, f)
    } catch {
      return // передумали в диалоге — ничего не сохраняем
    }

    if (f.id === 'md')   return finish(await saveFile(new Blob([markdown], { type: f.mime }), name, target), name)
    if (f.id === 'html') return finish(await saveFile(new Blob([htmlFile()], { type: f.mime }), name, target), name)

    setBuilding(true)
    setProgress(null)
    setFailed(null)
    try {
      const blob = await buildPdfBlob(pdfBody(html, fileName), {
        // Страницы снимаются по одной, и на длинном тексте это секунды.
        // Молчащая кнопка «Собираем…» в такой паузе выглядит как зависшая.
        onProgress: (done, total) => setProgress(total > 1 ? { done, total } : null),
      })
      finish(await saveFile(blob, name, target), name)
    } catch (err) {
      // Молчать нельзя: кнопка вернётся в исходное, файла не будет,
      // и человек решит, что просто не попал по ней
      setFailed(err?.message || 'неизвестная ошибка')
    } finally {
      setBuilding(false)
      setProgress(null)
    }
  }

  return (
    <div className="preview">
      <div className="preview-header">
        <button className="chip" onClick={onClose} title="Вернуться к тексту (Esc)">
          <IconBack size={14} />
          Назад
        </button>
        <span className="preview-title">{fileName}</span>
        <div className="preview-actions">
          <div className="seg" role="radiogroup" aria-label="Формат">
            {FORMATS.map(f => (
              <button
                key={f.id}
                className="seg__opt"
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
            className="btn-icon btn-icon--outline"
            onClick={() => setShowTypograf(s => !s)}
            title="Настройки типографа"
            aria-label="Настройки типографа"
            aria-pressed={showTypograf}
          >
            <IconSettings />
          </button>
          {/* Единственная primary-кнопка экрана */}
          <button
            className="btn btn--primary btn--sm preview-download"
            onClick={handleDownload}
            disabled={building}
            title={`Сохранить ${fileName}${current.ext}`}
          >
            {building
              ? (progress ? `Собираем… ${progress.done} / ${progress.total}` : 'Собираем…')
              : `Скачать ${current.ext}`}
          </button>
        </div>
      </div>

      {done && (
        <div className="preview-done" role="status">{done}</div>
      )}

      {failed && (
        <div className="preview-done preview-done--error" role="alert">
          Не удалось собрать PDF: {failed}
          <button className="btn btn--sm btn--ghost preview-done__close" onClick={() => setFailed(null)}>Скрыть</button>
        </div>
      )}

      {/* Предпросмотр показывает выбранный формат: markdown — исходником,
          PDF — на белой странице, как он и напечатается. Иначе вкладки
          переключались бы, а на экране ничего не менялось. */}
      <div className={`preview-body${format === 'pdf' ? ' preview-body--paper' : ''}`}>
        {format === 'md' ? (
          <MarkdownSource markdown={markdown} fileName={fileName} />
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
          enabled={typografEnabled}
          onToggle={onTypografToggle}
          onClose={() => setShowTypograf(false)}
        />
      )}

    </div>
  )
}

// ── Сохранение файла ────────────────────────────────────────────────────────
// Где есть системный диалог «Сохранить как» (Chrome, Edge, десктопная
// версия) — через него: так же работает ⌘S, и человек видит, куда кладёт
// файл. Где нет (Safari, Firefox) — обычным скачиванием. Встроенный браузер
// некоторых приложений скачивание по ссылке молча глотает, а диалог
// показывает — раньше в нём «Скачан файл» появлялось, а файла не было.

// null — диалога нет или его не пустили: тогда скачиваем.
// Отмена в диалоге бросает AbortError наверх — сохранять нечего.
async function pickSaveTarget(name, f) {
  if (!window.showSaveFilePicker) return null
  try {
    return await window.showSaveFilePicker({
      suggestedName: name,
      types: [{ description: f.kind, accept: { [f.mime]: [f.ext] } }],
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    return null
  }
}

// 'saved' — записали туда, куда показал человек; 'downloaded' — скачали
async function saveFile(blob, name, target) {
  if (target) {
    const writable = await target.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'saved'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
