import { useEffect, useState, useCallback } from 'react'
import './Toolbar.css'

export default function Toolbar({ editor }) {
  const [stats, setStats] = useState({ words: 0, chars: 0, charsNoSpace: 0 })
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
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
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = prompt('Введите ссылку:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

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
        {btn(() => editor.chain().focus().toggleBold().run(), 'Жирный (⌘B)', <b>Ж</b>, editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'Курсив (⌘I)', <i>К</i>, editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleStrike().run(), 'Зачёркнутый (⌘-)', <s>З</s>, editor.isActive('strike'))}
        {btn(handleLink, 'Ссылка (⌘K)', <IconLink />, editor.isActive('link'))}
        {btn(() => editor.chain().focus().toggleCode().run(), 'Код', <IconCode />, editor.isActive('code'))}

        <span className="toolbar-sep" />

        {btn(() => editor.chain().focus().toggleBulletList().run(), 'Список (⌘L)', <IconListUl />, editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), 'Нумерованный список (⌘⇧L)', <IconListOl />, editor.isActive('orderedList'))}

        <span className="toolbar-sep" />

        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Заголовок 1 (⌘1)', <span className="toolbar-h">H1</span>, editor.isActive('heading', { level: 1 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Заголовок 2 (⌘2)', <span className="toolbar-h">H2</span>, editor.isActive('heading', { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Заголовок 3 (⌘3)', <span className="toolbar-h">H3</span>, editor.isActive('heading', { level: 3 }))}
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
