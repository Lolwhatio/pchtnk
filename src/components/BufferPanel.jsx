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
      <div className="buffer-header">
        <span className="buffer-title">Буфер</span>
        <span className="buffer-hint" title="Форматирование снимается намеренно — только голый текст, без HTML-мусора из нейросети">не сохраняется · сбрасывает форматирование</span>
        <button className="buffer-clear" onClick={handleClear} title="Очистить"><IconTrash size={12} /> Очистить</button>
        <button className="buffer-close" onClick={onClose} title="Закрыть"><IconClose size={12} /></button>
      </div>
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
