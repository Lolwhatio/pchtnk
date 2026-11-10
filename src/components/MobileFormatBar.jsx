import { useEffect, useState } from 'react'
import {
  IconBold, IconItalic, IconUnderline, IconStrike, IconLink,
  IconListUl, IconListOl,
} from './icons'
import './MobileFormatBar.css'

const HEADING_LEVELS = [1, 2, 3]
const BAR_HEIGHT = 52

// Насколько клавиатура поднимает низ видимой области над низом окна.
// На iOS клавиатура не ужимает окно, а перекрывает его — узнать её высоту
// можно только из visualViewport. На Android с interactive-widget
// окно ужимается само, и здесь выходит ноль.
function keyboardGap() {
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

// Форматирование на телефоне — панель над клавиатурой, как в Заметках
// и Google Docs. Видна, пока набирают текст (редактор в фокусе), стоит
// на одном месте и не закрывает выделение. Без выделения кнопки
// включают стиль для того, что наберут дальше.
//
// На компьютере её нет: там нижняя панель и клавиши.
export default function MobileFormatBar({ editor }) {
  const [, forceUpdate] = useState(0)
  const [focused, setFocused] = useState(() => !!editor?.isFocused)
  const [gap, setGap] = useState(keyboardGap)

  useEffect(() => {
    if (!editor) return
    const update = () => forceUpdate(n => n + 1)
    const onFocus = () => setFocused(true)
    // Фокус уходит и на долю секунды при касании панели — prevent ниже
    // это гасит, но на всякий случай прячем с задержкой
    let t
    const onBlur = () => { clearTimeout(t); t = setTimeout(() => setFocused(editor.isFocused), 120) }
    editor.on('selectionUpdate', update)
    editor.on('update', update)
    editor.on('focus', onFocus)
    editor.on('blur', onBlur)
    return () => {
      clearTimeout(t)
      editor.off('selectionUpdate', update)
      editor.off('update', update)
      editor.off('focus', onFocus)
      editor.off('blur', onBlur)
    }
  }, [editor])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => setGap(keyboardGap())
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => { vv.removeEventListener('resize', sync); vv.removeEventListener('scroll', sync) }
  }, [])

  // Курсор не должен уходить под панель: ProseMirror держит его
  // на этом расстоянии от низа, когда прокручивает к нему
  useEffect(() => {
    if (!editor?.view || editor.isDestroyed) return
    const margin = focused ? BAR_HEIGHT + 24 : 5
    editor.view.setProps({
      scrollMargin:    { top: 5, left: 5, right: 5, bottom: margin },
      scrollThreshold: { top: 0, left: 0, right: 0, bottom: margin },
    })
  }, [editor, focused])

  if (!editor || !focused) return null

  // Касание кнопки не должно уводить фокус из текста: иначе прячется
  // клавиатура, а с ней и сама панель
  const keep = (e) => e.preventDefault()

  const btn = (key, action, label, icon, active) => (
    <button
      key={key}
      className="btn-icon"
      onPointerDown={keep}
      onMouseDown={keep}
      onClick={action}
      aria-label={label}
      aria-pressed={active}
    >
      {icon}
    </button>
  )

  const run = (fn) => () => fn(editor.chain().focus()).run()

  const handleLink = () => {
    const currentUrl = editor.getAttributes('link').href || ''
    window.dispatchEvent(new CustomEvent('pechatniki:link-dialog', { detail: { currentUrl } }))
  }

  const activeLevel = HEADING_LEVELS.find(l => editor.isActive('heading', { level: l }))

  return (
    <div
      className="mobile-format-bar"
      role="toolbar"
      aria-label="Форматирование"
      style={{ transform: gap ? `translateY(${-gap}px)` : undefined }}
      data-keyboard={gap > 0 || undefined}
    >
      {btn('b', run(c => c.toggleBold()), 'Жирный', <IconBold />, editor.isActive('bold'))}
      {btn('i', run(c => c.toggleItalic()), 'Курсив', <IconItalic />, editor.isActive('italic'))}
      {btn('u', run(c => c.toggleUnderline()), 'Подчеркнутый', <IconUnderline />, editor.isActive('underline'))}
      {btn('s', run(c => c.toggleStrike()), 'Зачеркнутый', <IconStrike />, editor.isActive('strike'))}
      {btn('a', handleLink, 'Ссылка', <IconLink />, editor.isActive('link'))}

      <span className="mobile-format-bar__sep" />

      {HEADING_LEVELS.map(level => (
        <button
          key={`h${level}`}
          className="btn-icon btn-icon--label"
          onPointerDown={keep}
          onMouseDown={keep}
          onClick={run(c => c.toggleHeading({ level }))}
          aria-label={`Заголовок ${level}`}
          aria-pressed={activeLevel === level}
        >
          H{level}
        </button>
      ))}

      <span className="mobile-format-bar__sep" />

      {btn('ul', run(c => c.toggleBulletList()), 'Список', <IconListUl />, editor.isActive('bulletList'))}
      {btn('ol', run(c => c.toggleOrderedList()), 'Нумерованный список', <IconListOl />, editor.isActive('orderedList'))}
    </div>
  )
}
