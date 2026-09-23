import { useEffect, useState } from 'react'
import Capsule from './Capsule'
import { IconClose } from './icons'
import './Notice.css'

// Короткое сообщение внизу экрана вместо системного alert().
// alert блокирует поток, не оформляется и на мобильном выглядит чужеродно —
// а сообщать нам нужно в основном об успехе импорта и о его ошибках.
//
// Вместо иконки — маскот в соответствующем состоянии: для удачи глаза-купола
// ^_^, для ошибки — розовые.
//
//   kind: 'info' | 'error'
//   Ошибки не гасим по таймеру: их читают, а не замечают краем глаза.

const clock = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export default function Notice({ text, kind = 'info', onClose }) {
  // Время появления, а не текущее: сообщение, висящее минуту, не должно
  // молодеть на глазах. Новое сообщение монтируется заново (key в App.jsx)
  const [time] = useState(clock)

  useEffect(() => {
    if (kind === 'error') return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [kind, onClose, text])

  return (
    <div className={`notice notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Capsule size={20} variant="filled" eyes={kind === 'error' ? 'error' : 'saved'} blink={false} />
      <span className="notice-text">{text}</span>
      <span className="notice-time">{time}</span>
      <button className="btn-icon notice-close" onClick={onClose} aria-label="Скрыть сообщение">
        <IconClose size={14} />
      </button>
    </div>
  )
}
