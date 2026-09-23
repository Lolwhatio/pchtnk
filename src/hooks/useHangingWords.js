import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { patchDecos, eachTextblock, blockText } from './decoUtils'
import { widowPair } from '../utils/widows'

export const hangingWordsKey = new PluginKey('hangingWords')

// Висячие предлоги: короткое слово не должно оставаться в конце строки, тире
// не должно уезжать в начало следующей, а абзац не должен заканчиваться
// одиноким словом на отдельной строке. Типограф решает это неразрывными
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

// Что угодно + пробелы + тире: тире остаётся на строке предыдущего слова.
//
// Раньше здесь стояло `\p{L}…` — требовалась буква вплотную к пробелу, и
// самый частый в русском случай не ловился: «…ничего достойного, — и появился»
// (перед тире запятая), «Квартал 1702 — дом» (цифра), «…свои Кузьминки» —
// тире съезжало в начало следующей строки. Берём любой непробельный хвост
// предыдущего слова, ограничив длину, чтобы неразрывным не стало полстроки.
const BEFORE_DASH = /([^\s\u00A0]{1,30})([ \u00A0]+)([—–])(?=[\s\u00A0]|$)/gu

// Висячая строка: последние два слова абзаца держим вместе, чтобы на
// отдельной строке не оставалось одинокое слово. Где проходит граница
// пары — в utils/widows.js: то же правило применяется к тексту по ⌘⇧T
// и в выгрузках, только там настоящим неразрывным пробелом.

function blockDecos(node, pos, out) {
  const { text, map } = blockText(node, pos)
  if (!text) return

  const matches = []
  for (const re of [SHORT_WORD, BEFORE_DASH]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(text)) !== null) {
      // У SHORT_WORD первая группа — граница слева, в пару она не входит
      const from = re === SHORT_WORD ? m.index + m[1].length : m.index
      matches.push([from, m.index + m[0].length])
    }
  }
  const widow = widowPair(text)
  if (widow) matches.push(widow)

  matches.sort((a, b) => a[0] - b[0])

  // Не даём парам сцепляться в цепочку: иначе неразрывным станет целое
  // предложение и оно вылезет за колонку.
  let lastEnd = -1
  for (const [from, to] of matches) {
    if (from < lastEnd) continue
    lastEnd = to
    out.push(Decoration.inline(map[from], map[to - 1] + 1, { class: 'nowrap-pair' }))
  }
}

function buildDecos(doc, from = 0, to = doc.content.size) {
  const out = []
  eachTextblock(doc, from, to, (node, pos) => blockDecos(node, pos, out))
  return out
}

export function createHangingWordsPlugin() {
  return new Plugin({
    key: hangingWordsKey,
    state: {
      init(_, { doc }) { return DecorationSet.create(doc, buildDecos(doc)) },
      apply(tr, old) {
        return tr.docChanged ? patchDecos(old, tr, buildDecos) : old
      },
    },
    props: {
      decorations(state) { return hangingWordsKey.getState(state) },
    },
  })
}
