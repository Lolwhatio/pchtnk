import { useState, useRef, useEffect } from 'react'
import { IconClose, IconUpload } from './icons'
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

  const readFile = (file) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
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
    <div className="input-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="media-dialog" role="dialog">

        <div className="input-dialog-header">
          <span className="input-dialog-title">Изображение</span>
          <button className="input-dialog-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="media-tabs">
          <button className={`media-tab${tab === 'url'  ? ' media-tab--active' : ''}`} onClick={() => { setTab('url');  setImgError(false) }}>По ссылке</button>
          <button className={`media-tab${tab === 'file' ? ' media-tab--active' : ''}`} onClick={() => setTab('file')}>Загрузить</button>
        </div>

        <div className="media-body">
          {tab === 'url' && (
            <>
              <input
                ref={urlRef}
                className="input-dialog-field"
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

        <div className="input-dialog-footer">
          <button className="input-dialog-btn" onClick={onClose}>Отмена</button>
          <button className="input-dialog-btn input-dialog-btn--primary" onClick={confirm} disabled={!canConfirm}>
            Вставить
          </button>
        </div>
      </div>
    </div>
  )
}
