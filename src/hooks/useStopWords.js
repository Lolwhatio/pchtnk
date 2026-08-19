import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { patchDecos, eachTextblock, blockText } from './decoUtils'

export const STOPWORDS_STORAGE_KEY = 'pechatniki-stopwords'
export const stopWordsKey = new PluginKey('stopWords')

export function loadStopPhrases() {
  try { return JSON.parse(localStorage.getItem(STOPWORDS_STORAGE_KEY) || '[]') } catch { return [] }
}

export function saveStopPhrases(phrases) {
  try { localStorage.setItem(STOPWORDS_STORAGE_KEY, JSON.stringify(phrases)) } catch { /* ignored */ }
}

// Фразу ищем по тексту блока целиком, а не по отдельным узлам: стоп-фраза
// с выделенным словом внутри («на самом деле», где «самом» жирное) лежит
// в двух узлах и по-старому не находилась.
function makeRegex(phrases) {
  if (!phrases.length) return null
  const escaped = phrases.map(p =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
     .replace(/ +/g, '[  ]+') // обычный пробел и неразрывный (после типографа)
  )
  return new RegExp(`(${escaped.join('|')})`, 'gi')
}

function collect(doc, phrases, from = 0, to = doc.content.size) {
  const regex = makeRegex(phrases)
  if (!regex) return []
  const decos = []
  eachTextblock(doc, from, to, (node, pos) => {
    const { text, map } = blockText(node, pos)
    regex.lastIndex = 0
    let m
    while ((m = regex.exec(text)) !== null) {
      decos.push(
        Decoration.inline(map[m.index], map[m.index + m[0].length - 1] + 1, {
          class: 'stop-word',
        })
      )
    }
  })
  return decos
}

function buildDecos(doc, phrases) {
  return DecorationSet.create(doc, collect(doc, phrases))
}

export function createStopWordsPlugin(phrasesRef) {
  return new Plugin({
    key: stopWordsKey,
    state: {
      init(_, { doc }) { return buildDecos(doc, phrasesRef.current) },
      apply(tr, old, _, newState) {
        // Смена списка фраз — пересобираем всё; обычная правка — только
        // затронутые абзацы (decoUtils): цена нажатия не должна зависеть
        // от длины документа
        if (tr.getMeta(stopWordsKey)) return buildDecos(newState.doc, phrasesRef.current)
        if (!tr.docChanged) return old
        return patchDecos(old, tr, (doc, from, to) => collect(doc, phrasesRef.current, from, to))
      },
    },
    props: {
      decorations(state) { return stopWordsKey.getState(state) },
      handleClick(view, pos, event) {
        if (!event.target.classList.contains('stop-word')) return false
        const decos = stopWordsKey.getState(view.state).find(pos, pos + 1)
        if (!decos.length) return false
        const { from, to } = decos[0]
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)))
        view.focus()
        return true
      },
    },
  })
}
