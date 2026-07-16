import { useState } from 'react'
import { IconClose } from './icons'
import './ShareDialog.css'

export default function ShareDialog({ onShare, onClose }) {
  const [status,   setStatus]   = useState('idle') // idle | loading | done | copy_failed | too_large | error
  const [password, setPassword] = useState('')
  const [readonly, setReadonly] = useState(false)
  const [link,     setLink]     = useState('')

  const handleShare = async () => {
    setStatus('loading')
    let url
    try {
      url = await onShare({ password: password.trim(), readonly })
    } catch (err) {
      setStatus(err.message === 'too_large' ? 'too_large' : 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setStatus('done')
    } catch {
      // Ссылка уже создана — не теряем её из-за отказа буфера обмена
      setLink(url)
      setStatus('copy_failed')
    }
  }

  return (
    <div className="share-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="share-dialog">
        <div className="share-header">
          <span className="share-title">Поделиться</span>
          <button className="share-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="share-body">
          <p className="share-desc">
            Текст упакуется прямо в ссылку — никаких серверов и облаков.
            Отправь ссылку кому нужно, и она откроется в Печатниках.
          </p>

          <div className="share-limits">
            <span className="share-limits-title">Ограничения</span>
            <ul>
              <li>Работает только для коротких текстов — до ~5 000 слов</li>
              <li>Ссылка очень длинная: превью в мессенджерах может выглядеть некрасиво, но работать будет</li>
              <li>Изображения и встроенные блоки в ссылку не попадают</li>
            </ul>
          </div>

          <div className="share-readonly-row">
            <div className="share-readonly-text">
              <span className="share-readonly-label">Только для чтения</span>
              <span className="share-readonly-desc">Получатель не сможет редактировать документ</span>
            </div>
            <button
              className={`share-toggle${readonly ? ' share-toggle--on' : ''}`}
              onClick={() => setReadonly(r => !r)}
            >
              <span className="share-toggle-knob" />
            </button>
          </div>

          <div className="share-password">
            <label className="share-password-label">
              Пароль <span className="share-password-optional">(необязательно)</span>
            </label>
            <input
              className="share-password-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Договоритесь с получателем заранее"
              autoComplete="off"
            />
            {password && (
              <p className="share-password-hint">
                Без этого пароля ссылку не открыть. Передайте его отдельно — не в том же чате.
              </p>
            )}
          </div>

          {status === 'idle' && (
            <button className="share-btn" onClick={handleShare}>
              Создать ссылку
            </button>
          )}

          {status === 'loading' && (
            <div className="share-status share-status--loading">Упаковываем…</div>
          )}

          {status === 'done' && (
            <div className="share-status share-status--done">
              ✓ Ссылка скопирована в буфер обмена
            </div>
          )}

          {status === 'copy_failed' && (
            <div className="share-copy-fallback">
              <p className="share-status share-status--error">
                Не удалось скопировать автоматически. Скопируйте ссылку вручную:
              </p>
              <input
                className="share-password-input"
                readOnly
                value={link}
                onFocus={e => e.target.select()}
              />
            </div>
          )}

          {status === 'too_large' && (
            <div className="share-status share-status--error">
              Текст слишком большой — шеринг невозможен. Сократите документ или разбейте на части.
            </div>
          )}

          {status === 'error' && (
            <div className="share-status share-status--error">
              Ошибка. Попробуйте ещё раз.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
