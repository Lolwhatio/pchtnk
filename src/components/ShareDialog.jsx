import { useState } from 'react'
import { IconClose } from './icons'
import { shortenShareUrl } from '../utils/share'
import './ShareDialog.css'

export default function ShareDialog({ onShare, isolationMode, onClose }) {
  const [status,   setStatus]   = useState('idle') // idle | loading | done | done_noshort | copy_failed | too_large | error
  const [password, setPassword] = useState('')
  const [shorten,  setShorten]  = useState(false)
  const [link,     setLink]     = useState('')
  const [fullLink, setFullLink] = useState('') // запасная полная ссылка при сокращении

  const handleShare = async () => {
    setStatus('loading')
    let url
    try {
      url = await onShare({ password: password.trim() })
    } catch (err) {
      setStatus(err.message === 'too_large' ? 'too_large' : 'error')
      return
    }
    const full = url

    // Сокращаем, если попросили; при неудаче оставляем полную ссылку
    let shortFailed = false
    if (shorten && !isolationMode) {
      try {
        url = await shortenShareUrl(url)
      } catch {
        shortFailed = true
      }
    }

    setLink(url)
    setFullLink(url !== full ? full : '')
    try {
      await navigator.clipboard.writeText(url)
      setStatus(shortFailed ? 'done_noshort' : 'done')
    } catch {
      // Ссылка уже создана — не теряем её из-за отказа буфера обмена
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
              <li>Вмещается примерно 10 000 знаков текста</li>
              <li>Без сокращения ссылка получается очень длинной — некоторые мессенджеры могут её не принять</li>
              <li>Изображения и встроенные блоки в ссылку не попадают</li>
            </ul>
          </div>

          {!isolationMode && (
            <div className="share-readonly-row">
              <div className="share-readonly-text">
                <span className="share-readonly-label">Сократить ссылку</span>
                <span className="share-readonly-desc">
                  Через сервис TinyURL. Он видит только зашифрованный текст —
                  ключ расшифровки остается в ссылке после # и на сервер не уходит.
                </span>
              </div>
              <button
                className={`share-toggle${shorten ? ' share-toggle--on' : ''}`}
                onClick={() => setShorten(s => !s)}
              >
                <span className="share-toggle-knob" />
              </button>
            </div>
          )}

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

          {(status === 'done' || status === 'done_noshort') && (
            <>
              <div className="share-status share-status--done">
                ✓ Ссылка скопирована в буфер обмена
              </div>
              {status === 'done_noshort' && (
                <p className="share-status share-status--error">
                  Сократить не получилось (сервис недоступен) — скопирована полная ссылка.
                </p>
              )}
              <input
                className="share-password-input"
                readOnly
                value={link}
                onFocus={e => e.target.select()}
              />
              {fullLink && (
                <>
                  <p className="share-password-hint">
                    Запасной вариант — полная ссылка (работает всегда, даже если сокращатель подведет):
                  </p>
                  <input
                    className="share-password-input"
                    readOnly
                    value={fullLink}
                    onFocus={e => e.target.select()}
                  />
                </>
              )}
            </>
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
              Ошибка. Попробуйте еще раз.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
