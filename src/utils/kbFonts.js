// Шрифты Печатников внутри выгрузки проекта.
//
// Выгрузка — один файл, который открывают двойным кликом, часто без
// интернета, поэтому шрифты зашиты в него data-URI. Берём только кириллицу
// и латиницу в вариативном начертании (ось веса): ~260 КБ на файл вместо
// мегабайта всех поднаборов. Остальные знаки браузер доберёт из системных.
//
// Те же шрифты, что в редакторе: Literata — текст, Onest — заголовки
// и интерфейс, JetBrains Mono — код и маркеры списков. Все три — OFL,
// их можно класть в файл. Шрифт знака (Unifix SP) не кладём: лицензия
// на распространение — отдельный вопрос, а в выгрузке знака нет.
//
// Грузится лениво, при открытии диалога: в основной сборке этих
// трёхсот килобайт быть не должно.

const CYR = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

// Предпросмотр в диалоге живёт внутри приложения и подчиняется его CSP:
// шрифт из data: там запрещён (font-src не задан → default-src 'self').
// Поэтому для предпросмотра те же файлы подключаются обычными ссылками
// со своего же адреса, а data-URI — только в скачанный файл.
const FILES = [
  ['PK Literata', 'normal', '200 900', CYR,
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-cyrillic-wght-normal.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-cyrillic-wght-normal.woff2?url')],
  ['PK Literata', 'normal', '200 900', LAT,
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?url')],
  ['PK Literata', 'italic', '200 900', CYR,
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-cyrillic-wght-italic.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-cyrillic-wght-italic.woff2?url')],
  ['PK Literata', 'italic', '200 900', LAT,
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-italic.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-italic.woff2?url')],
  ['PK Onest', 'normal', '100 900', CYR,
    () => import('../../node_modules/@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2?url')],
  ['PK Onest', 'normal', '100 900', LAT,
    () => import('../../node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2?url')],
  ['PK Mono', 'normal', '100 800', CYR,
    () => import('../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-cyrillic-wght-normal.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-cyrillic-wght-normal.woff2?url')],
  ['PK Mono', 'normal', '100 800', LAT,
    () => import('../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline'),
    () => import('../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url')],
]

function faces(urls) {
  return FILES.map(([family, style, weight, range], i) =>
    `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;` +
    `src:url(${urls[i]}) format('woff2-variations');unicode-range:${range}}`
  ).join('\n')
}

let cache = null

// { file, preview } — @font-face для скачанного файла и для предпросмотра
export function loadKbFonts() {
  if (cache) return cache
  cache = Promise.all([
    Promise.all(FILES.map(f => f[4]())),
    Promise.all(FILES.map(f => f[5]())),
  ]).then(([inline, url]) => ({
    file:    faces(inline.map(m => m.default)),
    preview: faces(url.map(m => new URL(m.default, location.href).href)),
  })).catch(err => {
    cache = null  // не вышло — попробуем при следующем открытии
    throw err
  })
  return cache
}
