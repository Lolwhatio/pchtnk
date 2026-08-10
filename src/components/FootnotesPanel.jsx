import { useEffect, useState } from 'react'
import { IconClose, IconPencil } from './icons'
import { numberFootnotes } from '../utils/footnotes'
import './TOC.css'
import './FootnotesPanel.css'

// Список использованных сносок с номерами. Клик — переход к месту в тексте.
export default function FootnotesPanel({ editor, onEdit, onInsertSources, onClose }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!editor) return
    const extract = () => setItems(numberFootnotes(editor.state.doc).sources)
    editor.on('update', extract)
    extract()
    return () => editor.off('update', extract)
  }, [editor])

  const jumpTo = (pos) => editor.chain().focus().setTextSelection(pos + 1).run()

  return (
    <div className="toc fn-panel">
      <div className="toc-header">
        <span>Сноски</span>
        <button className="toc-close" onClick={onClose}><IconClose size={12} /></button>
      </div>

      <div className="toc-list">
        {items.length === 0 && (
          <p className="toc-empty">Сносок пока нет</p>
        )}
        {items.map((it) => (
          <div className="fn-item" key={`${it.number}-${it.pos}`}>
            <button
              className="fn-item__main"
              onClick={() => jumpTo(it.pos)}
              title="Перейти к первому упоминанию"
            >
              <span className="fn-item__num">{it.number}</span>
              <span className="fn-item__text">
                {it.note || it.url || 'Без описания'}
                {it.note && it.url && <span className="fn-item__url">{it.url}</span>}
              </span>
            </button>
            <button
              className="fn-item__edit"
              onClick={() => onEdit(it, it.number)}
              title="Изменить источник (обновит все ссылки)"
            >
              <IconPencil />
            </button>
          </div>
        ))}
      </div>

      <div className="fn-panel__footer">
        <button className="fn-panel__btn" onClick={onInsertSources}>
          Вставить список источников
        </button>
      </div>
    </div>
  )
}
