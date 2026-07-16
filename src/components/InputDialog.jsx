import { useState, useEffect, useRef } from 'react'
import { IconClose } from './icons'
import './InputDialog.css'

export default function InputDialog({ title, placeholder, defaultValue, onConfirm, onClose }) {
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
      <div className="input-dialog" role="dialog">
        <div className="input-dialog-header">
          <span className="input-dialog-title">{title}</span>
          <button className="input-dialog-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="input-dialog-body">
          <input
            ref={inputRef}
            className="input-dialog-field"
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder || ''}
            spellCheck={false}
            autoComplete="off"
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); confirm() }
              if (e.key === 'Escape') { e.preventDefault(); onClose() }
            }}
          />
        </div>

        <div className="input-dialog-footer">
          <button className="input-dialog-btn" onClick={onClose}>Отмена</button>
          <button
            className="input-dialog-btn input-dialog-btn--primary"
            onClick={confirm}
            disabled={!value.trim()}
          >Ок</button>
        </div>
      </div>
    </div>
  )
}
