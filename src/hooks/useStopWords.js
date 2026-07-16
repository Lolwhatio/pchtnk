import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const STOPWORDS_STORAGE_KEY = 'pechatniki-stopwords'
export const stopWordsKey = new PluginKey('stopWords')

export function loadStopPhrases() {
  try { return JSON.parse(localStorage.getItem(STOPWORDS_STORAGE_KEY) || '[]') } catch { return [] }
}

export function saveStopPhrases(phrases) {
  try { localStorage.setItem(STOPWORDS_STORAGE_KEY, JSON.stringify(phrases)) } catch { /* ignored */ }
}

function buildDecos(doc, phrases) {
  if (!phrases.length) return DecorationSet.empty
  const escaped = phrases.map(p =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
     .replace(/ +/g, '[  ]+') // обычный пробел и неразрывный (после типографа)
  )
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const decos = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    regex.lastIndex = 0
    let m
    while ((m = regex.exec(node.text)) !== null) {
      decos.push(
        Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
          class: 'stop-word',
        })
      )
    }
  })
  return DecorationSet.create(doc, decos)
}

export function createStopWordsPlugin(phrasesRef) {
  return new Plugin({
    key: stopWordsKey,
    state: {
      init(_, { doc }) { return buildDecos(doc, phrasesRef.current) },
      apply(tr, old, _, newState) {
        return tr.docChanged || tr.getMeta(stopWordsKey)
          ? buildDecos(newState.doc, phrasesRef.current)
          : old
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
