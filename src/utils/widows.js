// Висячее слово: последняя строка абзаца, в которой стоит одно слово.
//
// Типограф расставляет неразрывные пробелы, но последнее слово связывает
// только короткое: «вышел вон» — да, «длинным словом впечатление» — нет.
//
// Здесь то же правило и тем же порогом, но настоящим неразрывным пробелом:
// применяется там же, где типограф, — по ⌘⇧T, в предпросмотре и в выгрузках.
// В самом наборе висячее слово не трогаем: текст в редакторе не должен
// перестраиваться сам.

// Пару шире 24 знаков не склеиваем — перенос двух длинных слов оставил бы
// дыру больше висячей строки
const MAX_PAIR = 24
const MIN_WORDS = 4

/**
 * Границы последних двух слов абзаца: [начало предпоследнего, конец
 * последнего] или null, если склеивать нечего.
 */
export function widowPair(text) {
  const end = text.replace(/[\s\u00A0]+$/, '').length
  if (!end) return null
  const head = text.slice(0, end)
  if (head.split(/[\s\u00A0]+/).filter(Boolean).length < MIN_WORDS) return null

  // Начало предпоследнего слова: пропускаем последнее слово и пробелы перед ним
  const lastWord = head.search(/[^\s\u00A0]+$/)
  if (lastWord <= 0) return null
  const gap = head.slice(0, lastWord).search(/[\s\u00A0]+$/)
  if (gap <= 0) return null
  const prevWord = head.slice(0, gap).search(/[^\s\u00A0]+$/)
  if (prevWord < 0) return null

  return end - prevWord <= MAX_PAIR ? [prevWord, end] : null
}

// Абзацы, у которых бывает висячая строка. Ячейки таблиц и код не в счёт:
// в ячейке колонка узкая, а в коде перенос значит другое.
const BLOCKS = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, figcaption'

function bindBlock(block) {
  const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const map = []
  let text = ''
  let node
  while ((node = walk.nextNode())) {
    for (let i = 0; i < node.nodeValue.length; i++) map.push([node, i])
    text += node.nodeValue
  }

  const pair = widowPair(text)
  if (!pair) return

  // Пробел между последними двумя словами — внутри пары ровно один.
  // Двойной не трогаем: его поставили нарочно, и неразрывными оба делать
  // незачем
  const inner = text.slice(pair[0], pair[1])
  const space = inner.search(/[ \u00A0]/)
  if (space < 0 || /[ \u00A0]{2}/.test(inner)) return

  const [target, offset] = map[pair[0] + space]
  if (target.nodeValue[offset] === '\u00A0') return
  target.nodeValue = `${target.nodeValue.slice(0, offset)}\u00A0${target.nodeValue.slice(offset + 1)}`
}

/** Связать последние два слова в каждом абзаце html неразрывным пробелом. */
export function bindWidows(html) {
  if (!html || !/<\w/.test(html)) return html
  const box = document.createElement('div')
  box.innerHTML = html
  for (const block of box.querySelectorAll(BLOCKS)) {
    // Абзац с вложенным списком: склеивать надо в самом списке, а не вокруг
    if (block.querySelector(BLOCKS)) continue
    bindBlock(block)
  }
  return box.innerHTML
}
