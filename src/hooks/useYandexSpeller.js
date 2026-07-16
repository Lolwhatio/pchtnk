const SPELLER_URL = 'https://speller.yandex.net/services/spellservice.json/checkText'

// Маппинг: индекс символа в getText() → позиция ProseMirror
// Воспроизводит алгоритм TipTap v3 getText() с blockSeparator='\n\n':
//   • перед каждым не-первым дочерним блоком doc добавляется '\n\n' (2 позиции)
//   • hardBreak и другие инлайн-листья добавляют 1 позицию (без записи в map)
export function buildPosMap(doc) {
  const map = []
  let textPos = 0
  let firstBlock = true

  doc.nodesBetween(0, doc.content.size, (node, pos, parent) => {
    if (node.type.name === 'hardBreak') {
      textPos++
      return false
    }
    if (node.isText) {
      for (let i = 0; i < node.text.length; i++) map[textPos++] = pos + i
    } else if (node.isBlock && parent === doc) {
      if (!firstBlock) textPos += 2
      firstBlock = false
    }
  })

  return map
}

export async function fetchSpellerErrors(text) {
  const params = new URLSearchParams({ text, lang: 'ru,en', format: 'plain' })
  const res = await fetch(`${SPELLER_URL}?${params}`)
  if (!res.ok) throw new Error('Speller unavailable')
  const data = await res.json()
  return data.filter(e => e.s?.length > 0)
}
