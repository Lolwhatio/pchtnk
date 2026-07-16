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

  const style = {
    position: 'fixed',
    top:  coords.bottom + 6,
    left: coords.left,
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
        <div className="dl-popup__list" ref={listRef}>
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
