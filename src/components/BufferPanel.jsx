import { useRef } from 'react'
import { IconClose, IconTrash } from './icons'
import './BufferPanel.css'

export default function BufferPanel({ onClose }) {
  const textareaRef = useRef(null)

  const handleClear = () => {
    if (textareaRef.current) textareaRef.current.value = ''
    textareaRef.current?.focus()
  }

  return (
    <div className="buffer-panel">
      <div className="panel-head">
        <span className="panel-head__title">Черновик</span>
        <button className="btn-icon" onClick={handleClear} title="Очистить" aria-label="Очистить"><IconTrash /></button>
        <button className="btn-icon" onClick={onClose} title="Закрыть" aria-label="Закрыть"><IconClose /></button>
      </div>
      {/* Пояснение — отдельной строкой под заголовком: в одну строку с
          кнопками оно ужималось в три и ломало шапку */}
      <p className="buffer-hint" title="Форматирование снимается намеренно — только голый текст, без HTML-мусора из нейросети">
        Не сохраняется, форматирование сбрасывается
      </p>
      <textarea
        ref={textareaRef}
        className="buffer-textarea"
        placeholder="Сюда можно скидывать черновики, варианты из нейросети, обрывки мыслей…"
        spellCheck={false}
        autoFocus
      />
    </div>
  )
}
