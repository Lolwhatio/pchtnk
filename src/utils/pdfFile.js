// Сборка PDF: постранично, по одной странице за раз.
//
// Раньше файл собирал html2pdf: он снимал весь документ одним холстом, а потом
// резал этот холст по высоте страницы. На длинном тексте холст выходил
// чудовищным — 58 страниц дают 1166 × 110 946 точек, это полгигабайта в одном
// куске плюс столько же на JPEG и строку base64. Chrome такой холст не заводит
// вовсе (предел стороны — 65 535 точек) и молча отдавал пустой файл на 37 КБ,
// а Safari честно пытался его выделить — и перезагружал вкладку с сообщением
// «для страницы требовалось слишком много памяти».
//
// Здесь холст ровно один на страницу: 1164 × 1942 точки, около девяти
// мегабайт независимо от длины документа. Разбивку берём ту же, что рисует
// предпросмотр (splitPages), поэтому файл и предпросмотр совпадают
// постранично по построению, а не по совпадению настроек.

import {
  pdfCss, splitPages,
  CONTENT_W, CONTENT_H, CONTENT_W_MM, MARGIN_X_MM, MARGIN_Y_MM,
} from './pdfLayout'

// Плотность снимка. Двойная — текст на бумаге не должен выглядеть мыльным;
// выше двух смысла нет, вес растёт быстрее видимой чёткости.
const SCALE = 2

// 0,98 на почти белой странице давали мегабайты ни за что
const JPEG_QUALITY = 0.92

// Холст держит свои точки вне кучи JS, и сборщик доходит до него не сразу.
// Обнуляя стороны, отдаём память в тот же момент — на длинном документе
// разница между «девять мегабайт» и «девять на каждую страницу».
function release(canvas) {
  canvas.width = 0
  canvas.height = 0
}

// Полоса снимка высотой в страницу. Нужна только там, где один неделимый блок
// (большая картинка, длинная таблица) выше листа: разрезать его негде,
// поэтому режем сам снимок.
function stripOf(canvas, top, height) {
  const part = document.createElement('canvas')
  part.width = canvas.width
  part.height = height
  part.getContext('2d').drawImage(canvas, 0, -top)
  return part
}

export async function buildPdfBlob(html, { onProgress } = {}) {
  // Обе библиотеки нужны только здесь и весят больше всего остального
  // приложения — подгружаем их в момент экспорта, а не при запуске.
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Хост за экраном. Снимаем не его, а вложенные листы: у position:fixed
  // высота родителю не достаётся, и снимок выходил нулевой высоты.
  const host = document.createElement('div')
  host.style.cssText =
    `position:fixed;left:-100000px;top:0;width:${CONTENT_W}px;background:#ffffff`

  const style = document.createElement('style')
  style.textContent = pdfCss()
  host.appendChild(style)
  document.body.appendChild(host)

  try {
    // Меряем поток целиком и раскладываем по страницам
    const probe = document.createElement('div')
    probe.className = 'pdf-doc'
    probe.style.width = `${CONTENT_W}px`
    probe.innerHTML = html
    host.appendChild(probe)
    const pages = splitPages(probe)
    probe.remove() // блоки живы — сейчас разойдутся по листам

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    let first = true

    for (let i = 0; i < pages.length; i++) {
      onProgress?.(i, pages.length)

      const sheet = document.createElement('div')
      sheet.style.cssText = `width:${CONTENT_W}px;background:#ffffff;overflow:hidden`
      const body = document.createElement('div')
      body.className = 'pdf-doc'
      pages[i].forEach(block => body.appendChild(block))
      sheet.appendChild(body)
      host.appendChild(sheet)

      // Обычная страница — ровно в полосу набора, даже если текст кончился
      // выше: иначе последняя строка прижималась бы к нижнему полю.
      // Блок выше листа растит страницу, и её снимок разрежется на полосы.
      sheet.style.height = `${Math.max(CONTENT_H, body.offsetHeight)}px`

      const canvas = await html2canvas(sheet, {
        scale: SCALE,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        // Клон снимается со всего документа, а в нём лежит редактор со всем
        // текстом — на длинном документе это дороже самой отрисовки страницы.
        // Приложение в снимок не попадает, пропускаем его целиком.
        ignoreElements: el => el.id === 'root',
      })

      const stripHeight = CONTENT_H * SCALE
      for (let top = 0; top < canvas.height; top += stripHeight) {
        const height = Math.min(stripHeight, canvas.height - top)
        // Целую страницу перерисовывать незачем — снимок и так по её размеру
        const whole = top === 0 && height === canvas.height
        const part = whole ? canvas : stripOf(canvas, top, height)

        if (!first) pdf.addPage()
        first = false
        pdf.addImage(
          part.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG',
          MARGIN_X_MM, MARGIN_Y_MM,
          CONTENT_W_MM, (height / SCALE / 96) * 25.4,
        )
        if (!whole) release(part)
      }

      release(canvas)
      sheet.remove()
    }

    onProgress?.(pages.length, pages.length)
    return pdf.output('blob')
  } finally {
    host.remove()
  }
}
