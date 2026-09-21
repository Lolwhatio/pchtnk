import { useState, useRef, useEffect } from 'react'
import { IconClose } from './icons'
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
    <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog dialog--wide" role="dialog" aria-label="Сноска">

        <div className="dialog__header">
          <span className="dialog__title">
            {existing ? `Сноска ${number}` : 'Новая сноска'}
          </span>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть"><IconClose /></button>
        </div>

        <div className="dialog__body">
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
                <div className="menu fn-reuse__list" role="menu">
                  {sources.map((s, i) => (
                    <button
                      type="button"
                      key={i}
                      role="menuitem"
                      className="menu-item fn-reuse__item"
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

          <label className="dialog__label">
            Источник
            <textarea
              ref={noteRef}
              className="field"
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ГОСТ 7.60-2003. СИБИД. Издания. Основные виды. Термины и определения. — М.: ИПК Издательство стандартов, 2004"
              rows={2}
            />
          </label>

          <label className="dialog__label">
            <span>Ссылка <span className="dialog__optional">(необязательно)</span></span>
            <input
              className="field"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="https://..."
              spellCheck={false}
            />
          </label>

          <p className="dialog__hint">
            Номер проставится сам и пересчитается, если вставить сноску выше.
          </p>
        </div>

        <div className="dialog__footer">
          {existing && (
            <button className="btn btn--danger fn-delete" onClick={() => { onDelete?.(); onClose() }}>
              Удалить
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose}>Отмена</button>
          <button
            className="btn btn--primary"
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
