import { useEffect, useRef } from 'react'
import { IconArrowUpRight } from './icons'
import './DocLinkPopup.css'

export default function DocLinkPopup({ query, coords, docs, selectedIdx, onSelect }) {
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current?.children[selectedIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  if (!coords) return null

  // Внизу экрана места нет — разворачиваем попап вверх от курсора,
  // а высоту списка ужимаем под доступное место, чтобы он скроллился
  const below  = window.innerHeight - coords.bottom - 12
  const above  = coords.top - 12
  const openUp = below < 180 && above > below
  const maxList = Math.max(90, Math.min(220, (openUp ? above : below) - 40))

  const style = {
    position: 'fixed',
    left: Math.max(8, Math.min(coords.left, window.innerWidth - 310)),
    ...(openUp
      ? { bottom: window.innerHeight - coords.top + 6 }
      : { top: coords.bottom + 6 }),
  }

  return (
    <div
      className="dl-popup"
      style={style}
      onMouseDown={e => e.preventDefault()} /* не снимаем фокус с редактора */
    >
      <div className="dl-popup__hint">[[название документа]] — ссылка</div>
      {docs.length === 0 ? (
        <div className="dl-popup__empty">
          {query ? 'Нет совпадений' : 'Нет других документов'}
        </div>
      ) : (
        <div className="dl-popup__list" ref={listRef} style={{ maxHeight: maxList }}>
          {docs.map((doc, i) => (
            <button
              key={doc.id}
              className={`dl-popup__item${i === selectedIdx ? ' dl-popup__item--sel' : ''}`}
              onMouseDown={e => { e.preventDefault(); onSelect(doc) }}
            >
              <span className="dl-popup__arrow"><IconArrowUpRight size={11} /></span>
              <span className="dl-popup__title">{doc.title || 'Без названия'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
