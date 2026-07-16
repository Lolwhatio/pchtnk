import { useEffect, useState, useCallback, useRef } from 'react'
import { IconBold, IconItalic, IconStrike, IconChevronRight } from './icons'
import './Toolbar.css'

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6]

function HeadingDropdown({ editor }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeLevel = HEADING_LEVELS.find(l => editor.isActive('heading', { level: l }))
  const label = activeLevel ? `H${activeLevel}` : 'Текст'

  return (
    <div className="toolbar-heading-wrap" ref={wrapRef}>
      <button
        className={`toolbar-btn toolbar-btn--label${activeLevel ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Заголовок (⌘⇧1…6)"
      >
        {label}
        <span className="toolbar-heading-caret"><IconChevronRight size={9} /></span>
      </button>
      {open && (
        <div className="toolbar-heading-menu">
          <button
            className={`toolbar-heading-item${!activeLevel ? ' toolbar-heading-item--active' : ''}`}
            onClick={() => { editor.chain().focus().setParagraph().run(); setOpen(false) }}
          >
            Обычный текст
          </button>
          {HEADING_LEVELS.map(level => (
            <button
              key={level}
              className={`toolbar-heading-item${activeLevel === level ? ' toolbar-heading-item--active' : ''}`}
              onClick={() => { editor.chain().focus().toggleHeading({ level }).run(); setOpen(false) }}
            >
              Заголовок {level} <kbd>⌘⇧{level}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Toolbar({ editor }) {
  const [stats, setStats] = useState({ words: 0, chars: 0, charsNoSpace: 0 })
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => {
      const text = editor.getText()
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
      const chars = text.length
      const charsNoSpace = text.replace(/\s/g, '').length
      setStats({ words, chars, charsNoSpace })
      forceUpdate(n => n + 1)
    }
    editor.on('update', update)
    editor.on('selectionUpdate', update)
    update()
    return () => { editor.off('update', update); editor.off('selectionUpdate', update) }
  }, [editor])

  const handleLink = useCallback(() => {
    if (!editor) return
    const currentUrl = editor.getAttributes('link').href || ''
    window.dispatchEvent(new CustomEvent('pechatniki:link-dialog', { detail: { currentUrl } }))
  }, [editor])

  const handleInsertImage = () => window.dispatchEvent(new CustomEvent('pechatniki:insert-image'))
  const handleInsertEmbed = () => window.dispatchEvent(new CustomEvent('pechatniki:insert-embed'))

  if (!editor) return <div className="toolbar" />

  const btn = (action, label, icon, active) => (
    <button
      className={`toolbar-btn${active ? ' active' : ''}`}
      onClick={action}
      title={label}
    >
      {icon}
    </button>
  )

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {btn(() => editor.chain().focus().toggleBold().run(), 'Жирный (⌘B)', <IconBold />, editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'Курсив (⌘I)', <IconItalic />, editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleStrike().run(), 'Зачёркнутый (⌘⇧-)', <IconStrike />, editor.isActive('strike'))}
        {btn(handleLink, 'Ссылка (⌘K)', <IconLink />, editor.isActive('link'))}
        {btn(() => editor.chain().focus().toggleCode().run(), 'Код', <IconCode />, editor.isActive('code'))}

        <span className="toolbar-sep" />

        {btn(handleInsertImage, 'Изображение', <IconImage />, false)}
        {btn(handleInsertEmbed, 'Встроить (YouTube, Google Slides…)', <IconEmbed />, false)}

        <span className="toolbar-sep" />

        {btn(() => editor.chain().focus().toggleBulletList().run(), 'Список', <IconListUl />, editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), 'Нумерованный список', <IconListOl />, editor.isActive('orderedList'))}

        <span className="toolbar-sep" />

        <HeadingDropdown editor={editor} />
      </div>

      <div className="toolbar-right">
        <span className="toolbar-stat">
          {stats.words.toLocaleString('ru')} сл.
          {' · '}
          {stats.chars.toLocaleString('ru')} зн.
          {' '}
          <span className="toolbar-stat-dim">({stats.charsNoSpace.toLocaleString('ru')} без пробелов)</span>
        </span>
      </div>
    </div>
  )
}

function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 9a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L8 3"/>
      <path d="M9 7a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"/>
    </svg>
  )
}
function IconCode() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <polyline points="5,4 1,8 5,12"/>
      <polyline points="11,4 15,8 11,12"/>
    </svg>
  )
}
function IconListUl() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="3" width="10" height="1.5" rx="0.75"/>
      <rect x="5" y="7.25" width="10" height="1.5" rx="0.75"/>
      <rect x="5" y="11.5" width="10" height="1.5" rx="0.75"/>
      <circle cx="2" cy="3.75" r="1.25"/>
      <circle cx="2" cy="8" r="1.25"/>
      <circle cx="2" cy="12.25" r="1.25"/>
    </svg>
  )
}
function IconListOl() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="3" width="10" height="1.5" rx="0.75"/>
      <rect x="5" y="7.25" width="10" height="1.5" rx="0.75"/>
      <rect x="5" y="11.5" width="10" height="1.5" rx="0.75"/>
      <text x="0.5" y="5" fontSize="4.5" fontFamily="monospace">1.</text>
      <text x="0.5" y="9.25" fontSize="4.5" fontFamily="monospace">2.</text>
      <text x="0.5" y="13.5" fontSize="4.5" fontFamily="monospace">3.</text>
    </svg>
  )
}
function IconImage() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="12" rx="1.5"/>
      <circle cx="5.5" cy="6" r="1.5"/>
      <path d="M1 11l4-4 3 3 2-2 5 5"/>
    </svg>
  )
}
function IconEmbed() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="12" rx="1.5"/>
      <path d="M1 5h14"/>
      <circle cx="3.5" cy="3.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="5.5" cy="3.5" r=".6" fill="currentColor" stroke="none"/>
      <path d="M7 9l2.5 1.8L7 12.5"/>
    </svg>
  )
}
