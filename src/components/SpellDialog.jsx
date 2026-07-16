import { useState, useEffect } from 'react'
import { IconClose } from './icons'
import './SpellDialog.css'

export default function SpellDialog({ errors, idx, onFix, onFixAll, onSkip, onClose }) {
  const err = errors[idx]
  const [selIdx, setSelIdx] = useState(0)
  const [prevIdx, setPrevIdx] = useState(idx)

  // Сброс выбора при смене ошибки — через derived state вместо эффекта
  if (prevIdx !== idx) {
    setPrevIdx(idx)
    setSelIdx(0)
  }

  // перехват клавиш: Enter=заменить, Tab=пропустить, Esc=закрыть
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose(); e.preventDefault(); e.stopImmediatePropagation()
      } else if (e.key === 'Enter') {
        const s = err?.s?.[selIdx] ?? err?.s?.[0]
        if (s) { onFix(s); e.preventDefault(); e.stopImmediatePropagation() }
      } else if (e.key === 'Tab' && !e.shiftKey) {
        onSkip(); e.preventDefault(); e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [err, selIdx, onFix, onSkip, onClose])

  if (!err) return null
  const suggestions = (err.s || []).slice(0, 5)
  const chosen = suggestions[selIdx] ?? suggestions[0]

  return (
    <div className="spell-dialog" role="dialog" aria-label="Проверка орфографии">
      <div className="spell-header">
        <span className="spell-title">Орфография</span>
        <span className="spell-counter">{idx + 1} / {errors.length}</span>
        <button className="spell-close" onClick={onClose} title="Закрыть (Esc)"><IconClose size={12} /></button>
      </div>

      <div className="spell-word-row">
        <span className="spell-error-word">{err.word}</span>
        <span className="spell-arrow">→</span>
        <span className="spell-fix-word">{chosen}</span>
      </div>

      {suggestions.length > 1 && (
        <div className="spell-suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className={`spell-sugg${i === selIdx ? ' spell-sugg--active' : ''}`}
              onClick={() => setSelIdx(i)}
            >{s}</button>
          ))}
        </div>
      )}

      <div className="spell-footer">
        <button className="spell-btn" onClick={onSkip}>
          Пропустить <kbd>Tab</kbd>
        </button>
        {errors.length > 1 && (
          <button className="spell-btn spell-btn--fix-all" onClick={onFixAll} title="Заменить все ошибки первым предложением">
            Все ({errors.length})
          </button>
        )}
        <button className="spell-btn spell-btn--primary" onClick={() => onFix(chosen)}>
          Заменить <kbd>↵</kbd>
        </button>
      </div>
    </div>
  )
}
