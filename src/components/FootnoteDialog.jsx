import { useState, useRef, useEffect } from 'react'
import { IconClose } from './icons'
import './InputDialog.css'
import './FootnoteDialog.css'

// Диалог сноски: описание источника + необязательная ссылка.
// existing — { note, url } при редактировании, null при вставке новой.
export default function FootnoteDialog({ existing, number, sources = [], onConfirm, onDelete, onClose }) {
  const [note, setNote] = useState(existing?.note || '')
  const [url,  setUrl]  = useState(existing?.url  || '')
  const [reuseOpen, setReuseOpen] = useState(false)
  const noteRef = useRef(null)
  const reuseRef = useRef(null)

  useEffect(() => { setTimeout(() => noteRef.current?.focus(), 30) }, [])

  useEffect(() => {
    if (!reuseOpen) return
    const h = (e) => { if (!reuseRef.current?.contains(e.target)) setReuseOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [reuseOpen])

  const pickSource = (s) => {
    setNote(s.note); setUrl(s.url); setReuseOpen(false)
    setTimeout(() => noteRef.current?.focus(), 0)
  }

  const confirm = () => {
    const n = note.trim(), u = url.trim()
    if (!n && !u) return
    onConfirm({ note: n, url: u })
    onClose()
  }

  const onKeyDown = (e) => {
    e.stopPropagation()
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.target.type === 'url')) confirm()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="input-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="input-dialog" role="dialog" aria-label="Сноска" style={{ width: 420 }}>

        <div className="input-dialog-header">
          <span className="input-dialog-title">
            {existing ? `Сноска ${number}` : 'Новая сноска'}
          </span>
          <button className="input-dialog-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="input-dialog-body fn-body">
          {sources.length > 0 && (
            <div className="fn-reuse" ref={reuseRef}>
              <button
                type="button"
                className={`fn-reuse__toggle${reuseOpen ? ' fn-reuse__toggle--open' : ''}`}
                onClick={() => setReuseOpen(o => !o)}
              >
                Использовать источник повторно
                <span className="fn-reuse__count">{sources.length}</span>
              </button>
              {reuseOpen && (
                <div className="fn-reuse__list">
                  {sources.map((s, i) => (
                    <button
                      type="button"
                      key={i}
                      className="fn-reuse__item"
                      onClick={() => pickSource(s)}
                    >
                      <span className="fn-reuse__note">{s.note || s.url}</span>
                      {s.note && s.url && <span className="fn-reuse__url">{s.url}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="fn-label">
            Источник
            <textarea
              ref={noteRef}
              className="input-dialog-field fn-textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Щерба Л. В. Языковая система и речевая деятельность, 1974"
              rows={2}
            />
          </label>

          <label className="fn-label">
            Ссылка <span className="fn-optional">(необязательно)</span>
            <input
              className="input-dialog-field"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="https://..."
              spellCheck={false}
            />
          </label>

          <p className="fn-hint">
            Номер проставится сам и пересчитается, если вставить сноску выше.
          </p>
        </div>

        <div className="input-dialog-footer">
          {existing && (
            <button className="input-dialog-btn fn-delete" onClick={() => { onDelete?.(); onClose() }}>
              Удалить
            </button>
          )}
          <button className="input-dialog-btn" onClick={onClose}>Отмена</button>
          <button
            className="input-dialog-btn input-dialog-btn--primary"
            onClick={confirm}
            disabled={!note.trim() && !url.trim()}
          >
            {existing ? 'Сохранить' : 'Вставить'}
          </button>
        </div>
      </div>
    </div>
  )
}
