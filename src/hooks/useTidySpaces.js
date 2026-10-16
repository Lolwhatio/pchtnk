import { Plugin } from 'prosemirror-state'

// Пробел в начале абзаца.
//
// В markdown он ничего не значит, но на экране сдвигает первую строку —
// выходит красная строка, которую никто не ставил. Чаще всего он берётся
// не из набора: Enter, нажатый перед пробелом, уносит этот пробел
// в начало нового абзаца, и дальше он там живёт.
//
// Смотрим только абзац с курсором: и набор пробела, и перенос по Enter,
// и вставка заканчиваются тем, что курсор стоит именно в нём. Остальные
// абзацы чистит типограф (utils/typograf.js), когда его зовут.
// В коде пробел в начале строки осмыслен — код не трогаем.

const LEADING = /^[ \u00A0]+/

export function createTidySpacesPlugin() {
  return new Plugin({
    appendTransaction(trs, _old, state) {
      if (!trs.some(tr => tr.docChanged)) return null
      const { $from } = state.selection
      const block = $from.parent
      if (!block.isTextblock || block.type.spec.code) return null
      const lead = block.textContent.match(LEADING)
      if (!lead) return null
      const start = $from.start()
      return state.tr.delete(start, start + lead[0].length)
    },
  })
}
