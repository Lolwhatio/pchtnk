import { useState, useRef } from 'react'
import { IconDots } from './icons'
import { useDismiss, useMenuKeys } from '../hooks/useDismiss'
import './OverflowMenu.css'

// items: { key, icon, label, title?, disabled?, active?, onClick }[]
export default function OverflowMenu({ items, icon, title = 'Еще' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)

  useDismiss(wrapRef, open, () => setOpen(false))
  useMenuKeys(menuRef, open)

  return (
    <div className="overflow-menu-wrap" ref={wrapRef}>
      <button
        className="btn-icon"
        onClick={() => setOpen(o => !o)}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {icon || <IconDots />}
      </button>
      {open && (
        <div className="overflow-menu" ref={menuRef} role="menu">
          {items.map(item => (
            <button
              key={item.key}
              className={`overflow-menu-item${item.active ? ' overflow-menu-item--active' : ''}`}
              disabled={item.disabled}
              title={item.title}
              role="menuitem"
              onClick={() => { item.onClick(); setOpen(false) }}
            >
              <span className="overflow-menu-item-icon">{item.icon}</span>
              <span className="overflow-menu-item-label">{item.label}</span>
              {item.hint && <span className="overflow-menu-item-hint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
