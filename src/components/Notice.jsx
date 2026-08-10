import { useEffect } from 'react'
import { IconClose } from './icons'
import './Notice.css'

// Короткое сообщение внизу экрана вместо системного alert().
// alert блокирует поток, не оформляется и на мобильном выглядит чужеродно —
// а сообщать нам нужно в основном об успехе импорта и о его ошибках.
//
//   kind: 'info' | 'error'
//   Ошибки не гасим по таймеру: их читают, а не замечают краем глаза.

export default function Notice({ text, kind = 'info', onClose }) {
  useEffect(() => {
    if (kind === 'error') return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [kind, onClose, text])

  return (
    <div className={`notice notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="notice-text">{text}</span>
      <button className="notice-close" onClick={onClose} aria-label="Скрыть сообщение">
        <IconClose size={12} />
      </button>
    </div>
  )
}
