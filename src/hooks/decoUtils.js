// Пересборка декораций только там, где документ изменился.
//
// Раньше оба плагина (стоп-слова и висячие предлоги) на каждую правку
// перебирали документ целиком и складывали новый DecorationSet. На тексте
// в 890 тыс. знаков это 48 тысяч декораций заново на каждое нажатие клавиши —
// 400 мс на символ, редактор переставал успевать за набором.
//
// Здесь то же самое, но инкрементально: старые декорации переносим через
// mapping транзакции, а пересобираем только те абзацы, которых правка
// коснулась. Стоимость нажатия перестаёт зависеть от длины документа.

// Диапазоны, затронутые транзакцией, в координатах нового документа.
function changedRanges(tr) {
  const out = []
  tr.mapping.maps.forEach((map, i) => {
    const rest = tr.mapping.slice(i + 1)
    map.forEach((_oldFrom, _oldTo, newFrom, newTo) => {
      out.push([rest.map(newFrom, -1), rest.map(newTo, 1)])
    })
  })
  return out
}

// Граница текстового блока, внутри которого лежит позиция. Правило смотрит
// на абзац целиком (последние два слова, предлог у края), поэтому пересобирать
// нужно блок, а не отдельный узел текста.
function blockEdge(doc, pos, dir) {
  const at = Math.max(0, Math.min(pos, doc.content.size))
  const $p = doc.resolve(at)
  for (let d = $p.depth; d > 0; d--) {
    if ($p.node(d).isTextblock) return dir < 0 ? $p.start(d) : $p.end(d)
  }
  // Позиция пришлась на стык блоков — так бывает, когда абзац удаляют
  // целиком. Расширяемся на соседний блок, а не на весь документ: иначе
  // самое обычное удаление выделенного абзаца пересобирало бы всё разом.
  if (dir < 0) {
    const before = $p.nodeBefore
    return before ? Math.max(0, at - before.nodeSize) : 0
  }
  const after = $p.nodeAfter
  return after ? Math.min(doc.content.size, at + after.nodeSize) : doc.content.size
}

// Слипшиеся и соседние диапазоны объединяем: правка обычно попадает
// в один абзац, и незачем обходить его дважды.
function blockRanges(tr) {
  const spans = changedRanges(tr)
    .map(([from, to]) => [blockEdge(tr.doc, from, -1), blockEdge(tr.doc, to, 1)])
    .sort((a, b) => a[0] - b[0])

  const merged = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1])
    else merged.push([...span])
  }
  return merged
}

// build(doc, from, to) → Decoration[] для блоков, попавших в диапазон.
export function patchDecos(old, tr, build) {
  let set = old.map(tr.mapping, tr.doc)
  const ranges = blockRanges(tr)
  if (!ranges.length) return set

  const added = []
  for (const [from, to] of ranges) {
    // remove работает по пересечению, поэтому старые декорации блока
    // уходят целиком, даже если правка задела только их край
    set = set.remove(set.find(from, to))
    added.push(...build(tr.doc, from, to))
  }
  return added.length ? set.add(tr.doc, added) : set
}

// Обход текстовых блоков диапазона. В коде типографика и стоп-слова не нужны.
export function eachTextblock(doc, from, to, fn) {
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true
    if (node.type.name !== 'codeBlock') fn(node, pos)
    return false // внутрь блока не спускаемся — его текст уже собран целиком
  })
}

// Текст блока одной строкой + карта «индекс символа → позиция в документе».
// Собираем через марки: раньше правила разбирали каждый узел текста отдельно,
// и пара «на **важное**» не склеивалась, потому что предлог и слово лежали
// в разных узлах. Нетекстовые вставки (сноска, картинка) занимают один символ
// U+FFFC (объектная заглушка), чтобы соседние слова не слиплись в одно.
export function blockText(node, pos) {
  let text = ''
  const map = []
  node.forEach((child, offset) => {
    if (child.isText) {
      for (let i = 0; i < child.text.length; i++) map.push(pos + 1 + offset + i)
      text += child.text
    } else {
      map.push(pos + 1 + offset)
      text += '\uFFFC'
    }
  })
  return { text, map }
}
