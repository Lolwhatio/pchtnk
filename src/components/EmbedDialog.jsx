import { useState, useRef, useEffect } from 'react'
import { IconClose, IconEmbedSlides, IconEmbedSheets, IconEmbedDocs, IconEmbedYoutube, IconEmbedFigma, IconEmbedGeneric } from './icons'
import './InputDialog.css'
import './EmbedDialog.css'

const SERVICES = [
  { key: 'slides',  label: 'Google Slides',  icon: <IconEmbedSlides /> },
  { key: 'sheets',  label: 'Google Sheets',  icon: <IconEmbedSheets /> },
  { key: 'gdocs',   label: 'Google Docs',    icon: <IconEmbedDocs /> },
  { key: 'youtube', label: 'YouTube',         icon: <IconEmbedYoutube /> },
  { key: 'figma',   label: 'Figma',           icon: <IconEmbedFigma /> },
]

function detectService(url) {
  if (!url) return null
  if (url.includes('docs.google.com/presentation')) return SERVICES[0]
  if (url.includes('docs.google.com/spreadsheets'))  return SERVICES[1]
  if (url.includes('docs.google.com/document'))       return SERVICES[2]
  if (url.includes('youtube.com') || url.includes('youtu.be')) return SERVICES[3]
  if (url.includes('figma.com'))                      return SERVICES[4]
  return null
}

export default function EmbedDialog({ onConfirm, onClose }) {
  const [url, setUrl] = useState('')
  const inputRef = useRef(null)
  const detected = detectService(url)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30) }, [])

  const confirm = () => { if (url.trim()) { onConfirm(url.trim()); onClose() } }

  return (
    <div className="input-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="input-dialog" role="dialog" style={{ width: 400 }}>

        <div className="input-dialog-header">
          <span className="input-dialog-title">Встроить контент</span>
          <button className="input-dialog-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="input-dialog-body" style={{ paddingBottom: 8 }}>
          <input
            ref={inputRef}
            className="input-dialog-field"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Ссылка на презентацию, таблицу, видео…"
            spellCheck={false}
            onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onClose() }}
          />

          {detected
            ? <div className="embed-detected">
                <span className="embed-detected-icon">{detected.icon}</span>
                <span>Определено: <strong>{detected.label}</strong></span>
              </div>
            : url && (
                <div className="embed-detected embed-detected--generic">
                  <IconEmbedGeneric size={13} />
                  <span>Будет вставлен как iframe</span>
                </div>
              )
          }

          <div className="embed-services">
            {SERVICES.map(s => (
              <span key={s.key} className="embed-service-tag">
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="input-dialog-footer">
          <button className="input-dialog-btn" onClick={onClose}>Отмена</button>
          <button
            className="input-dialog-btn input-dialog-btn--primary"
            onClick={confirm}
            disabled={!url.trim()}
          >
            Вставить
          </button>
        </div>
      </div>
    </div>
  )
}
