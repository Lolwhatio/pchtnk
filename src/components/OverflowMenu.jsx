import { useState, useRef, useEffect } from 'react'
import { IconDots } from './icons'
import './OverflowMenu.css'

// items: { key, icon, label, title?, disabled?, active?, onClick }[]
export default function OverflowMenu({ items, icon, title = 'Еще' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="overflow-menu-wrap" ref={wrapRef}>
      <button
        className={`btn-icon${open ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title={title}
      >
        {icon || <IconDots />}
      </button>
      {open && (
        <div className="overflow-menu">
          {items.map(item => (
            <button
              key={item.key}
              className={`overflow-menu-item${item.active ? ' overflow-menu-item--active' : ''}`}
              disabled={item.disabled}
              title={item.title}
              onClick={() => { item.onClick(); setOpen(false) }}
            >
              <span className="overflow-menu-item-icon">{item.icon}</span>
              <span className="overflow-menu-item-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
