import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const hangingWordsKey = new PluginKey('hangingWords')

// Висячие предлоги: короткое слово не должно оставаться в конце строки, а тире
// не должно уезжать в начало следующей. Типограф решает это неразрывными
// пробелами, но только по ⌘⇧T или в предпросмотре — пока текст набирают,
// предлоги висят. Здесь та же типографика, но декорацией: сам текст не
// меняется, запрещён только перенос внутри пары.

// Что считать коротким словом — ровно то же, что и Typograf, иначе живой вид
// разойдётся с результатом ⌘⇧T: слова до двух букв (common/nbsp/afterShortWord,
// lengthShortWord: 2) плюс список русских предлогов и союзов
// (common/nbsp/afterShortWordByList, данные ru/shortWord).
const RU_SHORT_WORDS = 'без|во|если|да|для|или|из|ко|как|на|но|не|ни|об|обо|от|по|про|при|под|со|то'

// Короткое слово + пробелы + следующее слово.
// Первая группа — граница слева, чтобы «то» в «это» не считалось предлогом,
// хвостовой lookahead — чтобы «в» не выдёргивалось из «время».
const SHORT_WORD = new RegExp(
  `(^|[^\\p{L}\\p{N}])((?:\\p{L}{1,2}|${RU_SHORT_WORDS})(?![\\p{L}\\p{N}]))([ \\u00A0]+)(\\p{L}[\\p{L}\\p{N}-]{0,30})`,
  'giu'
)

// Слово + пробелы + тире: «команды — годы», тире остаётся на своей строке.
const BEFORE_DASH = /(\p{L}[\p{L}\p{N}-]{0,30})([ \u00A0]+)([—–])/gu

function buildDecos(doc) {
  const decos = []

  doc.descendants((node, pos, parent) => {
    if (!node.isText) return
    // В коде типографика не нужна
    if (parent?.type.name === 'codeBlock') return false

    const text = node.text
    // Границы уже занятых кусков: не даём парам сцепляться в длинную цепочку,
    // иначе неразрывным станет целое предложение и оно вылезет за колонку.
    let lastEnd = -1

    const push = (from, to) => {
      if (from < lastEnd) return
      lastEnd = to
      decos.push(Decoration.inline(pos + from, pos + to, { class: 'nowrap-pair' }))
    }

    const matches = []
    for (const re of [SHORT_WORD, BEFORE_DASH]) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(text)) !== null) {
        const from = re === SHORT_WORD ? m.index + m[1].length : m.index
        matches.push([from, m.index + m[0].length])
      }
    }
    matches.sort((a, b) => a[0] - b[0])
    for (const [from, to] of matches) push(from, to)
  })

  return DecorationSet.create(doc, decos)
}

export function createHangingWordsPlugin() {
  return new Plugin({
    key: hangingWordsKey,
    state: {
      init(_, { doc }) { return buildDecos(doc) },
      apply(tr, old, _, newState) {
        return tr.docChanged ? buildDecos(newState.doc) : old
      },
    },
    props: {
      decorations(state) { return hangingWordsKey.getState(state) },
    },
  })
}
