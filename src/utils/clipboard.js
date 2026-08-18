// Что уезжает в буфер обмена.
//
// ProseMirror по умолчанию собирает простой текст через textBetween с
// разделителем «\n\n», и разделитель этот ставится на каждой блочной границе:
// у пункта списка их три (ul → li → p), поэтому между двумя строчками списка
// оказывалось шесть переводов строки, а маркеры пропадали совсем. HTML он
// отдаёт как есть — вместе с <p> внутри <li> (лишний абзац почти везде, куда
// вставляют) и с пустым абзацем в хвосте, который ловит ⌘A.
//
// Поэтому обе версии собираем сами: текст — из структуры документа, HTML —
// правкой того, что отдал штатный сериализатор.

// ── Простой текст ────────────────────────────────────────────────────────────

function inlineText(node) {
  let out = ''
  node.forEach(child => {
    if (child.isText) { out += child.text; return }
    const name = child.type.name
    if (name === 'hardBreak') { out += '\n'; return }
    if (name === 'docLink')   { out += child.attrs?.label || ''; return }
    if (name === 'image')     { out += child.attrs?.alt || ''; return }
    // Сноска — надстрочный знак без собственного текста, в простом тексте её нет
    if (child.isLeaf) return
    out += inlineText(child)
  })
  return out
}

const indent = (text, pad) => text.split('\n').map(l => pad + l).join('\n')

function listToText(node) {
  const ordered = node.type.name === 'orderedList'
  const start   = ordered ? (node.attrs?.start ?? 1) : 1
  const lines   = []
  let i = 0
  node.forEach(item => {
    const marker = ordered ? `${start + i}. ` : '• '
    const pad    = ' '.repeat(marker.length)
    const body   = blocksToText(item.content).join('\n')
    // Первая строка идёт за маркером, продолжение — под ним
    lines.push(marker + indent(body, pad).slice(pad.length))
    i++
  })
  return lines.join('\n')
}

function tableToText(node) {
  const rows = []
  node.forEach(row => {
    const cells = []
    row.forEach(cell => cells.push(blocksToText(cell.content).join(' ').replace(/\s+/g, ' ').trim()))
    rows.push(cells.join('\t'))
  })
  return rows.join('\n')
}

// Каждый блок — отдельная строка списка; пустые отбрасываем, иначе пустой
// абзац в документе превращался бы во вставке в две пустые строки подряд.
function blocksToText(fragment) {
  const out = []
  const push = (t) => { if (t) out.push(t) }

  fragment.forEach(node => {
    const name = node.type.name
    if (name === 'bulletList' || name === 'orderedList') { push(listToText(node)); return }
    if (name === 'table')          { push(tableToText(node)); return }
    if (name === 'horizontalRule') { push('———'); return }
    if (name === 'codeBlock')      { push(node.textContent); return }
    if (node.isTextblock)          { push(inlineText(node).trim()); return }
    if (node.isLeaf) return
    // Контейнеры без собственного представления — разворачиваем
    out.push(...blocksToText(node.content))
  })

  return out
}

export function sliceToText(slice) {
  return blocksToText(slice.content).join('\n\n')
}

// ── HTML ─────────────────────────────────────────────────────────────────────

const isEmptyParagraph = (el) =>
  el.tagName === 'P' && !el.textContent.trim() && !el.querySelector('img, table, ul, ol')

// Правки поверх штатного сериализатора: разворачиваем абзацы внутри пунктов
// списка и срезаем пустые абзацы в конце выделения.
export function cleanClipboardDom(root, doc) {
  root.querySelectorAll('li').forEach(li => {
    for (const child of [...li.children]) {
      if (child.tagName !== 'P') continue
      // Второй и следующие абзацы пункта склеились бы с предыдущим — отбиваем
      if (child.previousElementSibling) child.before(doc.createElement('br'))
      child.replaceWith(...child.childNodes)
    }
  })

  while (root.lastElementChild && isEmptyParagraph(root.lastElementChild)) {
    root.lastElementChild.remove()
  }

  return root
}
