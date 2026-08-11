// Единый набор пиктограмм. Правила набора — в README.md рядом.
//
// Коротко: сетка 16×16, обводка 1.5, скруглённые концы и стыки, только контур.
// Заливка допускается лишь для точек-маркеров, где контур превратился бы
// в пятно. Текстовых глифов в наборе нет — иначе они выпадают из ряда
// по оптическому весу и посадке на базовую линию.

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...S} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

// ── Навигация и панели ───────────────────────────────────────────────────────

// Лист с загнутым углом и строками текста.
// Два одинаковых прямоугольника внахлёст, стоявшие тут раньше, — это символ
// «копировать»; гамбургер до них читался как «главное меню».
export function IconDocs({ size }) {
  return (
    <Svg size={size}>
      <path d="M3.2 2.6a1.2 1.2 0 0 1 1.2-1.2h4.4l3.8 3.8v8.2a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2z" />
      <path d="M8.8 1.4v3.8h3.8" />
      <path d="M5.8 8.8h4.4" />
      <path d="M5.8 11.4h4.4" />
    </Svg>
  )
}

// Структура документа: ступенчатые строки. Не путать со списком —
// у списка есть маркеры, здесь их нет, зато есть отступы.
export function IconTOC({ size }) {
  return (
    <Svg size={size}>
      <path d="M2 3.4h12" />
      <path d="M5 8h9" />
      <path d="M8 12.6h6" />
    </Svg>
  )
}

// Дзен: пустой экран с одной строкой. Прежний незамкнутый круг читался
// как индикатор загрузки.
export function IconZen({ size }) {
  return (
    <Svg size={size}>
      <rect x="1.6" y="3" width="12.8" height="10" rx="1.6" />
      <path d="M5.2 8h5.6" />
    </Svg>
  )
}

// Настройки: ползунки. Прежняя шестерёнка была построена как солнце —
// две окружности и восемь отстоящих лучей — и сливалась с переключателем темы.
export function IconSettings({ size }) {
  return (
    <Svg size={size}>
      <path d="M1.8 4.6h12.4" />
      <path d="M1.8 11.4h12.4" />
      <circle cx="5.6" cy="4.6" r="1.7" />
      <circle cx="10.4" cy="11.4" r="1.7" />
    </Svg>
  )
}

// Инструменты — гаечный ключ.
export function IconTools({ size }) {
  return (
    <Svg size={size}>
      <path d="M10.7 1.6a3.1 3.1 0 0 0-2.3 5.1L2 13.1a.9.9 0 0 0 1.3 1.3l6.4-6.4a3.1 3.1 0 0 0 4.2-4.2l-1.8 1.8-1.2-1.2 1.8-1.8a3.1 3.1 0 0 0-2-1z" />
    </Svg>
  )
}

// Экспорт: лист со стрелкой наружу. Прежняя стрелка вниз в лоток обещала
// немедленное скачивание, а кнопка открывает экран.
export function IconExport({ size }) {
  return (
    <Svg size={size}>
      <path d="M8.6 13.6H3.4a1.2 1.2 0 0 1-1.2-1.2V3.4a1.2 1.2 0 0 1 1.2-1.2h4.4l3 3v2.2" />
      <path d="M7.8 2.2v3.2H11" />
      <path d="M9.4 11h4.8" />
      <path d="M12.2 9l2 2-2 2" />
    </Svg>
  )
}

// Поделиться заметкой — конверт: кнопка отправляет заметку адресату,
// и это ближе к письму, чем к системному «поделиться».
export function IconShare({ size }) {
  return (
    <Svg size={size}>
      <rect x="1.6" y="3.2" width="12.8" height="9.6" rx="1.4" />
      <path d="M2.2 4.4 8 8.8l5.8-4.4" />
    </Svg>
  )
}

// Буфер черновиков: слои. Не лоток входящих — там лежат не письма,
// а отложенные куски текста.
export function IconDrafts({ size }) {
  return (
    <Svg size={size}>
      <path d="M8 1.8 1.8 5 8 8.2 14.2 5z" />
      <path d="M1.8 8.5 8 11.7l6.2-3.2" />
      <path d="M1.8 11.6 8 14.8l6.2-3.2" />
    </Svg>
  )
}

export function IconBack({ size }) {
  return (
    <Svg size={size}>
      <path d="M9.6 2.8 4.4 8l5.2 5.2" />
    </Svg>
  )
}

// ── Тема ─────────────────────────────────────────────────────────────────────

export function IconSun({ size }) {
  return (
    <Svg size={size}>
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 1v1.6" /><path d="M8 13.4V15" />
      <path d="M1 8h1.6" /><path d="M13.4 8H15" />
      <path d="M3.05 3.05 4.2 4.2" /><path d="M11.8 11.8l1.15 1.15" />
      <path d="M12.95 3.05 11.8 4.2" /><path d="M4.2 11.8l-1.15 1.15" />
    </Svg>
  )
}

export function IconMoon({ size }) {
  return (
    <Svg size={size}>
      <path d="M13.4 10.1A6.1 6.1 0 0 1 5.9 2.6a6.4 6.4 0 1 0 7.5 7.5z" />
    </Svg>
  )
}

// ── Обработка текста ─────────────────────────────────────────────────────────

// Типограф — настоящие кавычки-ёлочки шрифтом Georgia.
//
// Единственный текстовый глиф в наборе, и это осознанное исключение:
// нарисованные шевроны выходят угловатыми и похожими на «Код», а здесь
// нужен именно типографский знак — тот, что кнопка и расставляет.
export function IconTypograf({ size = 15 }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1,
    }}>«»</span>
  )
}

// Орфография: буква с волнистым подчёркиванием. Прежняя одинокая галочка
// в меню читалась как «опция включена».
export function IconSpellcheck({ size }) {
  return (
    <Svg size={size}>
      <path d="M2.6 9.4 5.9 2.4l3.3 7" />
      <path d="M3.8 7.2h4.2" />
      <path d="M10.6 5.2l1.8 1.8 3.1-3.4" />
      <path d="M1.6 13.2c1-1.4 2-1.4 3 0s2 1.4 3 0 2-1.4 3 0 2 1.4 3 0" />
    </Svg>
  )
}

// Деёизация: замена одного другим.
export function IconSwapLetter({ size }) {
  return (
    <Svg size={size}>
      <path d="M2 5.6h9.4" />
      <path d="M8.9 3.1 11.4 5.6 8.9 8.1" />
      <path d="M14 10.4H4.6" />
      <path d="M7.1 12.9 4.6 10.4 7.1 7.9" />
    </Svg>
  )
}

// ── Форматирование ───────────────────────────────────────────────────────────

// Жирный — «Ж», нарисованная вектором. Раньше это была латинская «B»,
// набранная шрифтом Georgia: другой оптический вес и посадка на базовую линию.
export function IconBold({ size }) {
  return (
    <Svg size={size}>
      <path d="M8 2.6v10.8" />
      <path d="M8 8 3.4 2.9" /><path d="M8 8 3.4 13.1" />
      <path d="M8 8l4.6-5.1" /><path d="M8 8l4.6 5.1" />
    </Svg>
  )
}

export function IconItalic({ size }) {
  return (
    <Svg size={size}>
      <path d="M6 2.4h6.4" />
      <path d="M3.6 13.6H10" />
      <path d="M10 2.4 6 13.6" />
    </Svg>
  )
}

export function IconStrike({ size }) {
  return (
    <Svg size={size}>
      <path d="M11.4 4.4c-.7-1.2-2-1.9-3.5-1.9-2 0-3.4 1-3.4 2.5 0 1.2 1 2 2.7 2.4" />
      <path d="M4.6 11.6c.7 1.2 2 1.9 3.5 1.9 2 0 3.4-1 3.4-2.5 0-.6-.2-1.1-.7-1.5" />
      <path d="M1.8 8h12.4" />
    </Svg>
  )
}

export function IconLink({ size }) {
  return (
    <Svg size={size}>
      <path d="M6.8 9.2a3.4 3.4 0 0 0 5 .3l2-2a3.4 3.4 0 0 0-4.8-4.8l-1.1 1.1" />
      <path d="M9.2 6.8a3.4 3.4 0 0 0-5-.3l-2 2a3.4 3.4 0 0 0 4.8 4.8l1.1-1.1" />
    </Svg>
  )
}

export function IconCode({ size }) {
  return (
    <Svg size={size}>
      <path d="M5.6 2.8 1.4 8l4.2 5.2" />
      <path d="M10.4 2.8 14.6 8l-4.2 5.2" />
    </Svg>
  )
}

export function IconListUl({ size }) {
  return (
    <Svg size={size}>
      <path d="M6 3.6h8.2" /><path d="M6 8h8.2" /><path d="M6 12.4h8.2" />
      <circle cx="2.6" cy="3.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="12.4" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Нумерованный список: цифры нарисованы обводкой, а не набраны кеглем 4,5 —
// прежние «1. 2. 3.» превращались в шум около четырёх пикселей высотой.
export function IconListOl({ size }) {
  return (
    <Svg size={size}>
      <path d="M6.4 3.6h7.8" /><path d="M6.4 8h7.8" /><path d="M6.4 12.4h7.8" />
      <path d="M1.9 2.4h.9v3" /><path d="M1.6 5.4h1.9" />
      <path d="M1.7 10.4a1 1 0 0 1 1.8.6c0 .8-1.8 1.3-1.8 2.4h2" />
    </Svg>
  )
}

// ── Вставка ──────────────────────────────────────────────────────────────────

export function IconImage({ size }) {
  return (
    <Svg size={size}>
      <rect x="2.4" y="3.2" width="11.2" height="9.6" rx="1.5" />
      <circle cx="5.9" cy="6.4" r="1" />
      <path d="M2.8 11.4 6.2 8.4l4.2 3.8" />
    </Svg>
  )
}

// Встроенный объект: окно с угловыми скобками. Прежний треугольник Play
// обещал видео, хотя встраиваются ещё Slides, Docs и Figma.
export function IconEmbed({ size }) {
  return (
    <Svg size={size}>
      <rect x="2.4" y="3" width="11.2" height="10" rx="1.5" />
      <path d="M2.4 5.8h11.2" />
      <path d="M7 8.6 5.4 10.2 7 11.8" />
      <path d="M9 8.6l1.6 1.6L9 11.8" />
    </Svg>
  )
}

// Таблица: без второй внутренней колонки — прежняя сетка 3×3 давала
// самое плотное пятно в наборе (45,5% против медианных 25%).
export function IconTable({ size }) {
  return (
    <Svg size={size}>
      <rect x="2.4" y="3.2" width="11.2" height="9.6" rx="1.5" />
      <path d="M2.4 6.6h11.2" />
      <path d="M6.8 3.2v9.6" />
    </Svg>
  )
}

export function IconSmiley({ size }) {
  return (
    <Svg size={size}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M5.9 6.3v.5" /><path d="M10.1 6.3v.5" />
      <path d="M5.4 9.5a3.4 3.4 0 0 0 5.2 0" />
    </Svg>
  )
}

// Сноска: строки и надстрочный знак. Раньше здесь была цифра кеглем 7,
// то есть около шести пикселей при отрисовке.
export function IconFootnote({ size }) {
  return (
    <Svg size={size}>
      <path d="M2 4.6h6.6" /><path d="M2 8h6.6" /><path d="M2 11.4h4.4" />
      <circle cx="12.2" cy="4.8" r="1.4" />
    </Svg>
  )
}

// ── Документы и проекты ──────────────────────────────────────────────────────

export function IconFolder({ size }) {
  return (
    <Svg size={size}>
      <path d="M1.8 4.2a1.2 1.2 0 0 1 1.2-1.2h3.2l1.4 2h6.6a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2z" />
    </Svg>
  )
}

// Новый проект: папка с плюсом. Раньше «Новый проект» и «Переместить в проект»
// были одной и той же папкой в тридцати пикселях друг от друга.
export function IconFolderPlus({ size }) {
  return (
    <Svg size={size}>
      <path d="M1.8 4.2a1.2 1.2 0 0 1 1.2-1.2h3.2l1.4 2h6.6a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2z" />
      <path d="M8 7.4v3.4" /><path d="M6.3 9.1h3.4" />
    </Svg>
  )
}

// Переместить в проект: папка со стрелкой внутрь.
export function IconFolderIn({ size }) {
  return (
    <Svg size={size}>
      <path d="M1.8 4.2a1.2 1.2 0 0 1 1.2-1.2h3.2l1.4 2h6.6a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2z" />
      <path d="M8 6.8v3.8" /><path d="M6.4 9l1.6 1.6L9.6 9" />
    </Svg>
  )
}

// ── Служебные ────────────────────────────────────────────────────────────────

export function IconClose({ size }) {
  return (
    <Svg size={size}>
      <path d="M3.6 3.6l8.8 8.8" />
      <path d="M12.4 3.6l-8.8 8.8" />
    </Svg>
  )
}

export function IconPlus({ size }) {
  return (
    <Svg size={size}>
      <path d="M8 2.8v10.4" /><path d="M2.8 8h10.4" />
    </Svg>
  )
}

export function IconTrash({ size }) {
  return (
    <Svg size={size}>
      <path d="M2.6 4.4h10.8" />
      <path d="M6.2 4.4V2.9a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.5" />
      <path d="M3.9 4.4l.7 8.7a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.7-8.7" />
      <path d="M6.4 7v3.8" /><path d="M9.6 7v3.8" />
    </Svg>
  )
}

export function IconPencil({ size }) {
  return (
    <Svg size={size}>
      <path d="M11.4 2.1a1.6 1.6 0 0 1 2.5 2.5L5.6 12.9l-3.2.8.8-3.2z" />
    </Svg>
  )
}

export function IconChevronRight({ size }) {
  return (
    <Svg size={size}>
      <path d="M6 3.2 10.8 8 6 12.8" />
    </Svg>
  )
}

export function IconArrowUpRight({ size }) {
  return (
    <Svg size={size}>
      <path d="M4 12 12 4" />
      <path d="M5.4 4H12v6.6" />
    </Svg>
  )
}

export function IconUpload({ size }) {
  return (
    <Svg size={size}>
      <path d="M8 10.4V1.8" />
      <path d="M4.8 5 8 1.8 11.2 5" />
      <path d="M1.8 11.6v1.6a1.2 1.2 0 0 0 1.2 1.2h10a1.2 1.2 0 0 0 1.2-1.2v-1.6" />
    </Svg>
  )
}

export function IconKeyboard({ size }) {
  return (
    <Svg size={size}>
      <rect x="1.4" y="3.6" width="13.2" height="8.8" rx="1.5" />
      <path d="M4.2 6.6h.01" /><path d="M7 6.6h.01" /><path d="M9.8 6.6h.01" /><path d="M12.6 6.6h.01" />
      <path d="M4.6 9.6h6.8" />
    </Svg>
  )
}

export function IconDots({ size }) {
  return (
    <Svg size={size}>
      <circle cx="3" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="13" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// ── Типы встраиваемых объектов (диалог вставки) ──────────────────────────────

export function IconEmbedSlides({ size }) {
  return (
    <Svg size={size}>
      <rect x="1.6" y="2.6" width="12.8" height="8.6" rx="1.2" />
      <path d="M5.4 14h5.2" /><path d="M8 11.2V14" />
    </Svg>
  )
}

export function IconEmbedSheets({ size }) {
  return (
    <Svg size={size}>
      <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="1.2" />
      <path d="M1.8 5.9h12.4" /><path d="M1.8 10.1h12.4" />
      <path d="M6 1.8v12.4" />
    </Svg>
  )
}

export function IconEmbedDocs({ size }) {
  return (
    <Svg size={size}>
      <path d="M3.4 2.4a1 1 0 0 1 1-1h4.4l3.8 3.8v8.4a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1z" />
      <path d="M8.8 1.4v3.8h3.8" />
      <path d="M5.6 9h4.8" /><path d="M5.6 11.4h4.8" />
    </Svg>
  )
}

export function IconEmbedYoutube({ size }) {
  return (
    <Svg size={size}>
      <rect x="1.4" y="3" width="13.2" height="10" rx="2.2" />
      <path d="M6.8 6.2 10.2 8l-3.4 1.8z" />
    </Svg>
  )
}

export function IconEmbedFigma({ size }) {
  return (
    <Svg size={size}>
      <circle cx="10.6" cy="8" r="2.6" />
      <rect x="2.4" y="2.4" width="5.4" height="5.4" rx="1.2" />
      <rect x="2.4" y="8.8" width="5.4" height="4.4" rx="1.2" />
    </Svg>
  )
}

export function IconEmbedGeneric({ size }) {
  return (
    <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 16 16"
      {...S} strokeDasharray="2.4 2.2" aria-hidden="true" focusable="false">
      <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="1.6" />
    </svg>
  )
}
