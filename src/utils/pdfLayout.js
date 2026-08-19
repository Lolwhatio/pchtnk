// Вёрстка PDF — одна на предпросмотр и на сам файл.
//
// Раньше их было две: предпросмотр рисовался стилями приложения на белом
// прямоугольнике, а в файл уходил отдельный набор правил. Совпадать они
// не могли по определению, поэтому и «предпросмотр показывает не то».
// Здесь один источник: размеры страницы, поля и CSS. Предпросмотр режет
// поток на такие же страницы, какие получит html2pdf.

// A4 при 96 dpi.
//
// Кегль и поля подобраны вместе, и это принципиально: на A4 один кегль
// уменьшить нельзя. Лист широкий, и чем мельче шрифт, тем длиннее строка
// в знаках — 14 px при полях 20 мм давали 94 знака, а 12,5 px при тех же
// полях дают уже 106. Поэтому кегль опущен до 13 px (9,8 pt) вместе
// с расширением полей до 28 мм: строка садится к 84 знакам, а на странице
// помещается полсотни строк вместо сорока четырёх — полоса перестаёт
// выглядеть плакатной.
export const PAGE_W = 794
export const PAGE_H = 1123
export const MARGIN_X = 106  // 28 мм
export const MARGIN_Y = 76   // 20 мм

export const CONTENT_W = PAGE_W - MARGIN_X * 2   // 582
export const CONTENT_H = PAGE_H - MARGIN_Y * 2   // 971

// Поля для html2pdf задаются в мм и обязаны совпадать с теми, по которым
// предпросмотр считает разбиение
export const MARGIN_MM = [20, 28, 20, 28]

// ── Стили ────────────────────────────────────────────────────────────────────
// Чистый текст, чёрным по белому. Ни линеек под шапкой и над разделами,
// ни плашек у цитат, врезок и списка источников, ни цвета: иерархию держат
// кегль, начертание и воздух, как в наборной полосе.
//
// Заголовки были окрашены в цвет выбранной линии метро — на бумаге это
// оказалось лишним и от документа отвлекало.
//
// Выключка — влево, без переносов по слогам. Выключка по формату держится
// на переносах, а html2canvas, которым снимается страница для PDF, свою
// разбивку строк не согласует с браузерной: слово рвалось без дефиса,
// хвост вылезал за правое поле, а продолжение уходило с отступом.
// Ровный левый край честнее дыр в строках.
//
// Пара шрифтов та же, что в редакторе: Georgia для текста, системный
// гротеск для заголовков.

export function pdfCss() {
  return `
.pdf-doc{
  font-family:Georgia,'Times New Roman',serif;
  font-size:13px;
  line-height:1.5;
  color:#111;
  text-align:left;
  -webkit-font-smoothing:antialiased;
}
.pdf-doc *,.pdf-doc *::before,.pdf-doc *::after{box-sizing:border-box}

/* ── Заголовки ───────────────────────────────────────────────────
   Гротеск, цвет выбранной линии метро и заметный шаг кегля: убрав
   линейки, иерархию больше держать нечем. Выключка влево — заголовок
   не растягивают по формату. */
.pdf-doc h1,.pdf-doc h2,.pdf-doc h3,.pdf-doc h4,.pdf-doc h5,.pdf-doc h6{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  color:#000;
  font-weight:700;
  text-align:left;
  line-height:1.24;
  break-after:avoid;page-break-after:avoid;
}
.pdf-doc h1{font-size:22px;letter-spacing:-.015em;margin:0 0 .8em}
.pdf-doc h2{font-size:16.5px;letter-spacing:-.005em;margin:1.9em 0 .5em}
.pdf-doc h3{font-size:14px;margin:1.55em 0 .38em}
.pdf-doc h4{font-size:13px;margin:1.4em 0 .32em}
.pdf-doc h5,.pdf-doc h6{
  font-size:11px;letter-spacing:.07em;text-transform:uppercase;
  margin:1.4em 0 .32em;
}
.pdf-doc > *:first-child{margin-top:0}

/* ── Текст ───────────────────────────────────────────────────────
   Отбивка 0.62em: при 0.35em, как было, абзацы сливались в полосу. */
.pdf-doc p{margin:0 0 .62em;orphans:2;widows:2}
.pdf-doc strong{font-weight:700}
.pdf-doc em{font-style:italic}
.pdf-doc s{text-decoration:line-through;color:#6a736b}
/* Ссылка — подчёркиванием, а не цветом: единственное цветное пятно
   на чёрно-белой полосе выглядело случайным */
.pdf-doc a{color:inherit;text-decoration:underline;text-underline-offset:2px}

.pdf-doc ul,.pdf-doc ol{margin:.5em 0 .85em;padding-left:1.45em}
.pdf-doc li{margin:0 0 .3em;padding-left:.15em}
.pdf-doc li > p{margin:0 0 .3em}

/* Цитата — отступом и курсивом, без вертикальной черты */
.pdf-doc blockquote{
  margin:1.15em 1.6em;padding:0;
  font-style:italic;color:#3f473f;
  break-inside:avoid;page-break-inside:avoid;
}
.pdf-doc blockquote p:last-child{margin-bottom:0}

/* Линейка — это знак из текста, а не украшение: оставляем, но тихой */
.pdf-doc hr{border:none;height:1px;background:#d5dad5;margin:1.9em 0}

.pdf-doc code{
  font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.85em;
  background:#f2f4f1;padding:.08em .34em;border-radius:3px;
}
.pdf-doc pre{
  background:#f5f7f4;border-radius:3px;padding:.8em 1em;margin:1.1em 0;
  white-space:pre-wrap;word-break:break-word;text-align:left;
  break-inside:avoid;page-break-inside:avoid;
}
.pdf-doc pre code{background:none;padding:0;font-size:11.5px;line-height:1.5}

/* ── Таблицы ─────────────────────────────────────────────────────
   Только горизонтальные линейки, и те служебные: без них таблица
   перестаёт читаться как таблица. */
.pdf-doc table{
  border-collapse:collapse;width:100%;margin:1.2em 0;
  table-layout:fixed;font-size:11.5px;text-align:left;
  break-inside:avoid;page-break-inside:avoid;
}
.pdf-doc th,.pdf-doc td{
  padding:.45em .6em;text-align:left;vertical-align:top;
  border-bottom:1px solid #dfe3dd;
}
.pdf-doc thead th,.pdf-doc tr:first-child th{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  font-size:11px;font-weight:700;border-bottom:1px solid #b6bdb5;
}
.pdf-doc td > *:last-child,.pdf-doc th > *:last-child{margin-bottom:0}
.pdf-doc tr{break-inside:avoid;page-break-inside:avoid}

/* ── Картинки ────────────────────────────────────────────────────*/
.pdf-doc figure{margin:1.3em 0;break-inside:avoid;page-break-inside:avoid}
.pdf-doc img{display:block;max-width:100%;height:auto}

/* ── Сноски и источники ──────────────────────────────────────────
   Список источников — обычный текст помельче под скромным заголовком,
   без плашки и без цветной полосы слева. */
.pdf-doc sup,.pdf-doc .fn-ref{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  font-size:.62em;font-weight:700;vertical-align:super;line-height:0;
}
.pdf-doc .sources{margin:2.2em 0 0;padding:0;background:none;border:none}
.pdf-doc .sources-title{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  font-size:11px!important;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  color:#000;margin:0 0 8px;padding:0;border:none;
}
.pdf-doc .sources-items{margin:0;padding-left:1.3em;font-size:11px;line-height:1.5;text-align:left}
.pdf-doc .sources-items li{margin:.25em 0}
.pdf-doc .fn-back{display:none}

/* Ссылка на другой документ базы: в файле она никуда не ведёт —
   отмечаем курсивом, а не кнопкой */
.pdf-doc span[data-doc-id],.pdf-doc .int-link{
  font-style:italic;color:inherit;text-decoration:none;border:none;
}
`
}
