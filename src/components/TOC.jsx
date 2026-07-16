import { useEffect, useState } from 'react'
import { IconClose } from './icons'
import './TOC.css'

export default function TOC({ editor, onClose }) {
  const [headings, setHeadings] = useState([])
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!editor) return
    const extract = () => {
      const items = []
      editor.state.doc.forEach((node, offset) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level,
            text: node.textContent,
            pos: offset,
          })
        }
      })
      setHeadings(items)
    }
    editor.on('update', extract)
    extract()
    return () => editor.off('update', extract)
  }, [editor])

  const scrollTo = (pos) => {
    editor.chain().focus().setTextSelection(pos + 1).run()
    setActive(pos)
  }

  return (
    <div className="toc">
      <div className="toc-header">
        <span>Оглавление</span>
        <button className="toc-close" onClick={onClose}><IconClose size={12} /></button>
      </div>
      <div className="toc-list">
        {headings.length === 0 && (
          <p className="toc-empty">Нет заголовков</p>
        )}
        {headings.map((h, i) => (
          <button
            key={i}
            className={`toc-item toc-item--h${h.level}${active === h.pos ? ' active' : ''}`}
            onClick={() => scrollTo(h.pos)}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  )
}
