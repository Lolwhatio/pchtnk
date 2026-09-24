// Жёсткая вёрстка строк во вставленном тексте.
//
// Письма, переписка и ответы нейросетей часто приходят разбитыми по 60–80
// знаков: перенос стоит не там, где кончилась мысль, а там, где кончилась
// строка в чужом окне. В колонке редактора такой текст рвётся посреди
// предложения, и никакая ширина окна это не исправит — переносы лежат
// в самом тексте.
//
// Здесь они распознаются и снимаются. Осторожно: список покупок, подпись
// и стихи тоже состоят из коротких строк, но там перенос — замысел автора.
// Поэтому сначала смотрим на вставку целиком (строки длинные и их много —
// значит, это свёрстанный абзац), и только потом на каждый перенос
// отдельно.

// Меньше трёх строк — не вёрстка, а просто короткий текст
const MIN_LINES = 3

// Медиана длины строки. Почта и чаты верстают по 60–80 знаков, стихи
// и списки обычно короче
const WRAP_WIDTH = 45

// Строка кончилась предложением: точка, вопрос, восклицание, многоточие —
// возможно, с закрывающей кавычкой или скобкой
const SENTENCE_END = /[.!?…]["»”')\]]?$/

// Следующая строка начинается со строчной буквы или со знака, с которого
// предложение начаться не может
const CONTINUES = /^[\p{Ll}]|^[,;:—–)\]]/u

/** Похоже ли, что текст свёрстан по ширине чужого окна. */
export function looksHardWrapped(lines) {
  const body = lines.map(l => l.trim()).filter(Boolean)
  if (body.length < MIN_LINES) return false
  // Последняя строка абзаца короткая всегда — на медиану её не пускаем
  const lengths = body.slice(0, -1).map(l => l.length).sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)]
  return median >= WRAP_WIDTH
}

/** Перенос между двумя строками — вёрстка источника, а не замысел автора. */
export function isHardWrap(before, after) {
  const prev = before.replace(/\s+$/, '')
  const next = after.replace(/^\s+/, '')
  if (!prev || !next) return false
  return CONTINUES.test(next) || !SENTENCE_END.test(prev)
}

// Текст блока до и после каждого <br>. Обход, а не children: перенос может
// лежать внутри <strong> или ссылки.
function breakLines(block) {
  const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  const marks = []
  let text = ''
  let node
  while ((node = walk.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue
    else if (node.tagName === 'BR') marks.push({ br: node, at: text.length })
  }
  return { text, marks }
}

// Пустая строка приходит парой <br><br>: в почте так отбивают абзац.
// Абзацем она и должна стать, иначе всё письмо остаётся одним абзацем
// с дырами внутри. Режем только p и div — списки и заголовки на абзацы
// делить нечего.
function splitBlankLines(block) {
  const groups = [[]]
  let brs = []
  for (const node of [...block.childNodes]) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') { brs.push(node); continue }
    if (node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim() && brs.length) continue
    if (brs.length > 1 && groups[groups.length - 1].length) groups.push([])
    else groups[groups.length - 1].push(...brs)
    brs = []
    groups[groups.length - 1].push(node)
  }
  if (groups.length < 2) return

  for (const group of groups) {
    if (!group.length) continue
    const part = document.createElement(block.tagName)
    part.append(...group)
    block.before(part)
  }
  block.remove()
}

/**
 * Снять жёсткие переносы во вставленном html (DOM правится на месте).
 * Переносы, поставленные осмысленно, остаются: между предложениями,
 * в коротких строках подписи, в стихах.
 */
export function unwrapHtmlBreaks(container) {
  for (const block of [...container.querySelectorAll('p, div')]) {
    if (block.querySelector('br')) splitBlankLines(block)
  }

  const blocks = [...container.querySelectorAll('p, div, li, blockquote, h1, h2, h3, h4, h5, h6')]
    .filter(el => el.querySelector('br'))
  if (!blocks.length) return

  const measured = blocks.map(block => {
    const { text, marks } = breakLines(block)
    const lines = []
    let from = 0
    for (const m of marks) { lines.push(text.slice(from, m.at)); from = m.at }
    lines.push(text.slice(from))
    return { marks, lines }
  })

  if (!looksHardWrapped(measured.flatMap(b => b.lines))) return

  for (const { marks, lines } of measured) {
    marks.forEach((m, i) => {
      if (!isHardWrap(lines[i], lines[i + 1])) return
      // Перенос сам был пробелом между словами — пробелом и остаётся
      m.br.replaceWith(document.createTextNode(' '))
    })
  }
}

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }
const escape = (s) => s.replace(/[&<>]/g, c => ESCAPE[c])

/**
 * Простой текст, свёрстанный по ширине, — в абзацы.
 * Возвращает html или null, если вёрстки нет и вставку трогать не нужно.
 */
export function unwrapPlainText(text) {
  const normalized = text.replace(/\r\n?/g, '\n')
  if (!normalized.includes('\n')) return null
  const lines = normalized.split('\n')
  if (!looksHardWrapped(lines)) return null

  // Пустая строка — граница абзаца, остальные переносы решаются по месту.
  // Несклеенный перенос остаётся отдельным абзацем: так вставку разбирал
  // редактор и до этого, а в markdown такой абзац и уедет.
  const paragraphs = []
  let current = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { if (current) { paragraphs.push(current); current = '' } continue }
    if (!current) { current = line; continue }
    if (isHardWrap(current, line)) current += ` ${line}`
    else { paragraphs.push(current); current = line }
  }
  if (current) paragraphs.push(current)

  return paragraphs.map(p => `<p>${escape(p)}</p>`).join('')
}
