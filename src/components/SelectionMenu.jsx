import { useEffect, useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import { IconBold, IconItalic, IconStrike, IconLink, IconCode } from './icons'
import './SelectionMenu.css'

const HEADING_LEVELS = [1, 2, 3]

// Форматирование появляется над выделением, а не живёт внизу экрана.
// Раньше путь курсора от первого абзаца до кнопки «Жирный» составлял
// почти всю высоту окна, и по дороге панель ещё и гасла.
export default function SelectionMenu({ editor }) {
  const [, forceUpdate] = useState(0)

  // Только selectionUpdate и update. На transaction подписываться нельзя:
  // BubbleMenu сам шлёт транзакции при пересчёте позиции, перерисовка
  // вызывает следующую, и React уходит в бесконечный цикл.
  useEffect(() => {
    if (!editor) return
    const update = () => forceUpdate(n => n + 1)
    editor.on('selectionUpdate', update)
    editor.on('update', update)
    return () => { editor.off('selectionUpdate', update); editor.off('update', update) }
  }, [editor])

  if (!editor) return null

  const btn = (action, label, icon, active) => (
    <button
      className="btn-icon"
      // mousedown съедаем, иначе выделение снимается до того, как сработает клик
      onMouseDown={e => e.preventDefault()}
      onClick={action}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {icon}
    </button>
  )

  const handleLink = () => {
    const currentUrl = editor.getAttributes('link').href || ''
    window.dispatchEvent(new CustomEvent('pechatniki:link-dialog', { detail: { currentUrl } }))
  }

  const activeLevel = HEADING_LEVELS.find(l => editor.isActive('heading', { level: l }))

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      className="selection-menu"
      // Меню только для текста: на картинке и во встроенном объекте
      // форматировать нечего
      shouldShow={({ editor: ed, from, to }) =>
        from !== to && !ed.isActive('image') && !ed.isActive('embed')
      }
    >
      {btn(() => editor.chain().focus().toggleBold().run(), 'Жирный (⌘B)', <IconBold />, editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'Курсив (⌘I)', <IconItalic />, editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'Зачёркнутый (⌘⇧-)', <IconStrike />, editor.isActive('strike'))}
      {btn(handleLink, 'Ссылка (⌘K)', <IconLink />, editor.isActive('link'))}
      {btn(() => editor.chain().focus().toggleCode().run(), 'Код', <IconCode />, editor.isActive('code'))}

      <span className="selection-menu__sep" />

      {HEADING_LEVELS.map(level => (
        <button
          key={level}
          className="btn-icon btn-icon--label"
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          title={`Заголовок ${level} (⌘⌥${level})`}
          aria-label={`Заголовок ${level}`}
          aria-pressed={activeLevel === level}
        >
          H{level}
        </button>
      ))}
      <button
        className="btn-icon btn-icon--label"
        onMouseDown={e => e.preventDefault()}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Обычный текст (⌘⌥0)"
        aria-label="Обычный текст"
        aria-pressed={!activeLevel}
      >
        Текст
      </button>
    </BubbleMenu>
  )
}
