import { useState, useRef, useEffect } from 'react'
import { IconClose, IconUpload } from './icons'
import { fileToImageSrc } from '../utils/images'
import './MediaDialog.css'

export default function MediaDialog({ onConfirm, onClose }) {
  const [tab,      setTab]      = useState('url')
  const [url,      setUrl]      = useState('')
  const [preview,  setPreview]  = useState(null)
  const [dragging, setDragging] = useState(false)
  const [imgError, setImgError] = useState(false)
  const urlRef  = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (tab === 'url') setTimeout(() => urlRef.current?.focus(), 30)
  }, [tab])

  // Ужимаем здесь же, а не при вставке: в предпросмотре видно ровно то,
  // что ляжет в документ (см. utils/images)
  const readFile = async (file) => {
    if (!file?.type.startsWith('image/')) return
    setPreview(await fileToImageSrc(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    readFile(e.dataTransfer.files[0])
  }

  const confirm = () => {
    const src = tab === 'url' ? url.trim() : preview
    if (src) { onConfirm({ src }); onClose() }
  }

  const canConfirm = tab === 'url' ? (url.trim() && !imgError) : !!preview

  return (
    <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog dialog--wide" role="dialog" aria-label="Изображение">

        <div className="dialog__header">
          <span className="dialog__title">Изображение</span>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть"><IconClose /></button>
        </div>

        <div className="dialog__body">
          <div className="seg media-tabs" role="radiogroup" aria-label="Откуда взять">
            <button className="seg__opt" role="radio" aria-checked={tab === 'url'} onClick={() => { setTab('url');  setImgError(false) }}>По ссылке</button>
            <button className="seg__opt" role="radio" aria-checked={tab === 'file'} onClick={() => setTab('file')}>Загрузить</button>
          </div>

          {tab === 'url' && (
            <>
              <input
                ref={urlRef}
                className="field"
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setImgError(false) }}
                placeholder="https://example.com/image.jpg"
                spellCheck={false}
                onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onClose() }}
              />
              {url && (
                <div className="media-preview">
                  <img
                    src={url}
                    alt="preview"
                    onLoad={() => setImgError(false)}
                    onError={() => setImgError(true)}
                    style={{ display: imgError ? 'none' : 'block' }}
                  />
                  {imgError && <div className="media-preview-error">Не удалось загрузить изображение</div>}
                </div>
              )}
            </>
          )}

          {tab === 'file' && (
            <div
              className={`media-drop${dragging ? ' media-drop--over' : ''}${preview ? ' media-drop--filled' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !preview && fileRef.current?.click()}
            >
              {preview
                ? <img src={preview} alt="preview" className="media-drop-img" onClick={() => fileRef.current?.click()} />
                : <div className="media-drop-hint">
                    <span className="media-drop-icon"><IconUpload size={22} /></span>
                    <span>Перетащите или нажмите для выбора</span>
                    <span className="media-drop-sub">PNG, JPG, GIF, WebP</span>
                  </div>
              }
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => readFile(e.target.files[0])} />
            </div>
          )}
        </div>

        <div className="dialog__footer">
          <button className="btn btn--ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn--primary" onClick={confirm} disabled={!canConfirm}>
            Вставить
          </button>
        </div>
      </div>
    </div>
  )
}
