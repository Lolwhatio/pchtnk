import { useState, useEffect, useRef } from 'react'
import { IconClose } from './icons'

// Оболочка, поле и кнопки — общие классы из styles/controls.css
export default function InputDialog({
  title, placeholder, defaultValue, description, error,
  type = 'text', confirmLabel = 'Ок',
  onConfirm, onClose,
}) {
  const [value, setValue] = useState(defaultValue || '')
  const inputRef = useRef(null)

  useEffect(() => {
    // небольшой таймаут, чтобы редактор успел отпустить фокус
    const t = setTimeout(() => {
      inputRef.current?.focus()
      if (defaultValue) inputRef.current?.select()
    }, 30)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  // После неверного пароля возвращаем фокус в поле и выделяем введённое
  useEffect(() => {
    if (!error) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [error])

  const confirm = () => {
    const trimmed = value.trim()
    if (trimmed) onConfirm(trimmed)
    else onClose()
  }

  return (
    <div
      className="dialog-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog__header">
          <span className="dialog__title">{title}</span>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть"><IconClose /></button>
        </div>

        <div className="dialog__body">
          {description && <p className="dialog__desc">{description}</p>}
          <input
            ref={inputRef}
            className="field"
            type={type}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder || ''}
            spellCheck={false}
            autoComplete={type === 'password' ? 'current-password' : 'off'}
            aria-invalid={!!error}
            aria-describedby={error ? 'input-dialog-error' : undefined}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); confirm() }
              if (e.key === 'Escape') { e.preventDefault(); onClose() }
            }}
          />
          {/* Красным только сообщение. Рамка, текст и подпись разом — это три
              сигнала об одной ошибке, и они кричат громче всего на экране. */}
          {error && <p className="dialog__error" id="input-dialog-error" role="alert">{error}</p>}
        </div>

        <div className="dialog__footer">
          <button className="btn btn--ghost" onClick={onClose}>Отмена</button>
          <button
            className="btn btn--primary"
            onClick={confirm}
            disabled={!value.trim()}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
