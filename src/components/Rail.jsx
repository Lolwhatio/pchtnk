import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { paletteById } from '../utils/palettes'
import './Rail.css'

// Ветка — структура документа как схема линии метро.
//
// Станции — заголовки #, ## и ### по порядку, уровень задаёт размер точки
// и отступ. Линия до станции, в которой стоит курсор, — цветом ветки:
// это пройденный участок. Ниже — пересадки, то есть ссылки [[…]] на другие
// документы: щелчок переводит туда, как и щелчок по ссылке в тексте.
//
// Заменила оглавление: то же самое, только видно, где ты сейчас.

const MAX_LEVEL = 3
const TRANSFERS_DELAY = 300

// Состав меняется куда реже, чем документ: набор внутри абзаца заголовков
// не трогает. Поэтому сверяем подпись и обновляем состояние, только когда
// она другая, — иначе React перерисовывал бы ветку на каждое нажатие.
const signature = (items, keys) =>
  items.map(it => keys.map(k => it[k]).join('\u0000')).join('\n')

function readStations(doc) {
  const out = []
  doc.forEach((node, offset) => {
    if (node.type.name === 'heading' && node.attrs.level <= MAX_LEVEL) {
      out.push({ level: node.attrs.level, text: node.textContent, pos: offset })
    }
  })
  return out
}

// Ссылки на документы могут стоять где угодно в тексте — это полный обход,
// поэтому его откладываем, как счётчик слов в тулбаре
function readTransfers(doc) {
  const out = []
  const seen = new Set()
  doc.descendants((node) => {
    if (node.type.name !== 'docLink') return
    const id = node.attrs.id
    if (!id || seen.has(id)) return
    seen.add(id)
    out.push({ id, label: node.attrs.label })
  })
  return out
}

function activeIndex(stations, pos) {
  let idx = -1
  for (let i = 0; i < stations.length; i++) {
    if (stations[i].pos <= pos) idx = i
    else break
  }
  return idx
}

export default function Rail({ editor, docs, palette, onTransfer }) {
  const [stations, setStations] = useState([])
  const [active, setActive] = useState(-1)
  const [transfers, setTransfers] = useState([])

  useEffect(() => {
    if (!editor) return
    let stationsSig = null
    let transfersSig = null
    let current = []
    let timer = null

    const syncActive = () => {
      setActive(activeIndex(current, editor.state.selection.from))
    }

    const syncStations = () => {
      const next = readStations(editor.state.doc)
      const sig = signature(next, ['level', 'pos', 'text'])
      if (sig !== stationsSig) {
        stationsSig = sig
        current = next
        setStations(next)
      }
      syncActive()
    }

    const syncTransfers = () => {
      const next = readTransfers(editor.state.doc)
      const sig = signature(next, ['id', 'label'])
      if (sig === transfersSig) return
      transfersSig = sig
      setTransfers(next)
    }

    const onUpdate = () => {
      syncStations()
      clearTimeout(timer)
      timer = setTimeout(syncTransfers, TRANSFERS_DELAY)
    }

    editor.on('update', onUpdate)
    editor.on('selectionUpdate', syncActive)
    syncStations()
    syncTransfers()
    return () => {
      clearTimeout(timer)
      editor.off('update', onUpdate)
      editor.off('selectionUpdate', syncActive)
    }
  }, [editor])

  // ── Линия ───────────────────────────────────────────────────────────────
  // Спека считает прогресс долей индекса, но это верно, только пока все
  // станции в одну строку: длинный заголовок переносится, и доля
  // промахивается мимо точки. Поэтому меряем сами точки: линия идёт
  // от центра первой до центра последней, пройденный участок — до активной.
  const listRef = useRef(null)
  const trackRef = useRef(null)
  const progressRef = useRef(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      const dots = list.querySelectorAll('.rail__dot')
      const track = trackRef.current
      const progress = progressRef.current
      if (!track || !progress) return
      if (dots.length < 2) {
        track.style.height = progress.style.height = '0px'
        return
      }
      const box = list.getBoundingClientRect()
      const center = (el) => {
        const r = el.getBoundingClientRect()
        return r.top + r.height / 2 - box.top
      }
      const first = center(dots[0])
      const last = center(dots[dots.length - 1])
      track.style.top = progress.style.top = `${first}px`
      track.style.height = `${last - first}px`
      progress.style.height = active > 0 ? `${center(dots[active]) - first}px` : '0px'
    }

    measure()
    // Ширина колонки и загрузка шрифта меняют переносы — а с ними и точки
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [stations, active])

  // Переход к станции: курсор в начало заголовка, заголовок — к верху
  // полосы набора. Прокрутка мгновенная: кроме капсулы, в интерфейсе
  // ничего не движется.
  const go = (pos) => {
    editor.chain().focus().setTextSelection(pos + 1).run()
    const dom = editor.view.nodeDOM(pos)
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start' })
  }

  const line = paletteById(palette)
  const known = new Set(docs.map(d => d.id))

  return (
    <nav className="rail" aria-label="Структура документа">
      <div className="rail__inner">
        <div className="rail__head">
          <span className="rail__num" aria-hidden="true">{line.num}</span>
          <span className="rail__title">Структура</span>
        </div>

        {stations.length === 0 ? (
          <p className="rail__empty">
            Заголовков пока нет. Строка, начатая с&nbsp;#, станет первой станцией
          </p>
        ) : (
          <div className="rail__stations" ref={listRef}>
            <span className="rail__track" ref={trackRef} aria-hidden="true" />
            <span className="rail__progress" ref={progressRef} aria-hidden="true" />
            {stations.map((s, i) => (
              <button
                key={`${s.pos}-${i}`}
                type="button"
                className={
                  `rail__station rail__station--h${s.level}` +
                  (i === active ? ' rail__station--active' : '') +
                  (i < active ? ' rail__station--passed' : '')
                }
                aria-current={i === active ? 'location' : undefined}
                onClick={() => go(s.pos)}
              >
                <span className="rail__dotcol" aria-hidden="true">
                  <span className="rail__dot" />
                </span>
                <span className="rail__label">{s.text || 'Без названия'}</span>
              </button>
            ))}
          </div>
        )}

        <div className="rail__transfers">
          <span className="rail__title">Пересадки</span>
          {transfers.length === 0 ? (
            <p className="rail__empty">
              Наберите [[ и название — здесь появится ссылка на другой документ
            </p>
          ) : transfers.map(t => {
            const alive = known.has(t.id)
            return (
              <button
                key={t.id}
                type="button"
                className="rail__transfer"
                disabled={!alive}
                title={alive ? 'Перейти к документу' : 'Документ удален'}
                onClick={() => onTransfer(t.id)}
              >
                <span className="glyph-ring" aria-hidden="true" />
                <span className="rail__transfer-label">{t.label || 'Без названия'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
