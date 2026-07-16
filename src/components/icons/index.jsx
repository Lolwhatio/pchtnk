// Общая библиотека SVG-иконок — переиспользуется в 2+ местах или заменяет
// голые unicode-символы/буквы. Локальные иконки, нужные только в одном
// компоненте (Toolbar.jsx, App.jsx и т.д.), остаются там же.

export function IconClose({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="2" x2="12" y2="12" />
      <line x1="12" y1="2" x2="2" y2="12" />
    </svg>
  )
}

export function IconTrash({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4h9" />
      <path d="M5.5 4V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1V4" />
      <path d="M3.5 4l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8" />
      <line x1="5.5" y1="6.5" x2="5.5" y2="10" />
      <line x1="8.5" y1="6.5" x2="8.5" y2="10" />
    </svg>
  )
}

export function IconChevronRight({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 1.5L7 5l-3.5 3.5" />
    </svg>
  )
}

export function IconArrowUpRight({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L9 3" />
      <path d="M4 3h5v5" />
    </svg>
  )
}

export function IconUpload({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V1" />
      <path d="M4 4l3-3 3 3" />
      <path d="M1 10v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
    </svg>
  )
}

export function IconSpellcheck({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5l3 3 7-7" />
    </svg>
  )
}

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

export function IconBold({ size = 14 }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1,
    }}>B</span>
  )
}

export function IconItalic({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="8.5" y1="2" x2="5" y2="2" />
      <line x1="7" y1="10" x2="3.5" y2="10" />
      <line x1="7" y1="2" x2="4" y2="10" />
    </svg>
  )
}

export function IconStrike({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M3 3.6c0-1.1 1-1.9 2.5-1.9S8 2.5 8 3.5" />
      <path d="M4 9.5c0 1.1 1 1.9 2.5 1.9S9 10.6 9 9.6" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  )
}

export function IconEmbedSlides({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="12" height="8" rx="1" />
      <line x1="4" y1="12" x2="10" y2="12" />
      <line x1="7" y1="10" x2="7" y2="12" />
    </svg>
  )
}

export function IconEmbedSheets({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="12" height="12" rx="1" />
      <line x1="1" y1="5" x2="13" y2="5" />
      <line x1="1" y1="9" x2="13" y2="9" />
      <line x1="5" y1="1" x2="5" y2="13" />
      <line x1="9" y1="1" x2="9" y2="13" />
    </svg>
  )
}

export function IconEmbedDocs({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1.5h5l3 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
      <path d="M8 1.5v3h3" />
      <line x1="4" y1="8" x2="10" y2="8" />
      <line x1="4" y1="10.5" x2="10" y2="10.5" />
    </svg>
  )
}

export function IconEmbedYoutube({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2.5" width="12" height="9" rx="2" />
      <path d="M6 5.5l3 2-3 2z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconEmbedFigma({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="7" r="2.5" />
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="8" width="5" height="4" rx="1" />
    </svg>
  )
}

export function IconEmbedGeneric({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" />
    </svg>
  )
}

export function IconSwapLetter({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h9" />
      <path d="M8.5 3.5 11 6l-2.5 2.5" />
      <path d="M14 10H5" />
      <path d="M7.5 12.5 5 10l2.5-2.5" />
    </svg>
  )
}

export function IconTray({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 9.5h3.8l1 2h3.4l1-2h3.8" />
      <path d="M1.5 9.5 3 3a1 1 0 0 1 1-.8h8a1 1 0 0 1 1 .8l1.5 6.5" />
      <path d="M1.5 9.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
    </svg>
  )
}

export function IconKeyboard({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3.5" width="14" height="9" rx="1.5" />
      <line x1="4" y1="6.5" x2="4" y2="6.5" strokeWidth="1.8" />
      <line x1="7" y1="6.5" x2="7" y2="6.5" strokeWidth="1.8" />
      <line x1="10" y1="6.5" x2="10" y2="6.5" strokeWidth="1.8" />
      <line x1="13" y1="6.5" x2="13" y2="6.5" strokeWidth="1.8" />
      <line x1="4" y1="9.5" x2="12" y2="9.5" />
    </svg>
  )
}

export function IconDots({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="currentColor">
      <circle cx="2.5" cy="7.5" r="1.4" />
      <circle cx="7.5" cy="7.5" r="1.4" />
      <circle cx="12.5" cy="7.5" r="1.4" />
    </svg>
  )
}
