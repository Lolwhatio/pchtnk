import { useState, useEffect, useRef } from 'react'
import { IconClose } from './icons'
import './InputDialog.css'

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
      className="input-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="input-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="input-dialog-header">
          <span className="input-dialog-title">{title}</span>
          <button className="input-dialog-close" onClick={onClose} aria-label="Закрыть"><IconClose size={12} /></button>
        </div>

        <div className="input-dialog-body">
          {description && <p className="input-dialog-desc">{description}</p>}
          <input
            ref={inputRef}
            className={`input-dialog-field${error ? ' input-dialog-field--error' : ''}`}
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
          {error && <p className="input-dialog-error" id="input-dialog-error" role="alert">{error}</p>}
        </div>

        <div className="input-dialog-footer">
          <button className="input-dialog-btn" onClick={onClose}>Отмена</button>
          <button
            className="input-dialog-btn input-dialog-btn--primary"
            onClick={confirm}
            disabled={!value.trim()}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
