import { IconClose } from './icons'
import './ShortcutsDialog.css'

const GENERAL = [
  { keys: '⌘⇧D', label: 'Дзен-режим' },
  { keys: '⌘⇧T', label: 'Применить типограф' },
  { keys: '⌘⇧Y', label: 'Яндекс.Спеллер' },
  { keys: '⌘⇧N', label: 'Новый документ' },
  { keys: '⌘⇧S', label: 'Сохранить в файл' },
  { keys: '⌘/', label: 'Этот список' },
  { keys: 'Esc', label: 'Закрыть панель / выйти из режима' },
]

const EDITOR = [
  { keys: '⌘B', label: 'Жирный' },
  { keys: '⌘I', label: 'Курсив' },
  { keys: '⌘K', label: 'Ссылка' },
  { keys: '⌘⌥0', label: 'Обычный текст' },
  { keys: '⌘⌥1…6', label: 'Заголовок 1–6' },
  { keys: '⌘⇧-', label: 'Зачёркнутый' },
  { keys: '⌘⇧⌫', label: 'Очистить форматирование' },
  { keys: '⌘⇧L', label: 'Маркированный список' },
  { keys: '⌘⇧O', label: 'Нумерованный список' },
  { keys: '⌘⇧B', label: 'Цитата' },
  { keys: '⌘⇧P', label: 'Код-блок' },
]

export default function ShortcutsDialog({ onClose }) {
  return (
    <div className="input-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shortcuts-dialog" role="dialog" aria-label="Горячие клавиши">
        <div className="input-dialog-header">
          <span className="input-dialog-title">Горячие клавиши</span>
          <button className="input-dialog-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="shortcuts-body">
          <div className="shortcuts-group">
            <div className="shortcuts-group-label">Общие</div>
            {GENERAL.map(s => (
              <div className="shortcuts-row" key={s.label}>
                <span className="shortcuts-row-label">{s.label}</span>
                <kbd className="shortcuts-row-keys">{s.keys}</kbd>
              </div>
            ))}
          </div>

          <div className="shortcuts-group">
            <div className="shortcuts-group-label">Редактор</div>
            {EDITOR.map(s => (
              <div className="shortcuts-row" key={s.label}>
                <span className="shortcuts-row-label">{s.label}</span>
                <kbd className="shortcuts-row-keys">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
