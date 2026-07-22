import { useEffect, useState, useCallback, useRef } from 'react'
import { IconBold, IconItalic, IconStrike, IconChevronRight } from './icons'
import './Toolbar.css'

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6]

// ── Эмодзи ───────────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: 'Смайлы', items: [
    '😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨',
    '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
    '🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟',
    '🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣',
    '😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','💀','💩','🤡','👻','👽','🤖',
    '😺','😸','😹','😻','😼','🙀',
  ] },
  { label: 'Жесты и люди', items: [
    '👋','🤚','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇',
    '☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳',
    '💪','👂','👃','🧠','🦷','👀','👁️','👅','👄','🫶','👶','🧒','🧑','👨','👩','🧓',
    '🙅','🙆','💁','🙋','🙇','🤦','🤷','👮','🕵️','👷','🤴','👸','🥷','🦸','🦹','🧙',
    '🧚','🧛','🧟','💆','💇','🚶','🧍','🏃','💃','🕺','🧘','👯','🫂','👪',
  ] },
  { label: 'Природа', items: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
    '🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
    '🐛','🦋','🐌','🐞','🐜','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦀','🐡',
    '🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐘','🦛','🦏','🐪','🦒','🦘','🐄','🐎','🐑',
    '🦙','🐐','🦌','🐕','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦦',
    '🦥','🐿️','🦔','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🍃','🍂','🍁','🍄',
    '🐚','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌚','🌕','🌙',
    '⭐','🌟','💫','✨','☄️','☀️','⛅','☁️','🌧️','⛈️','❄️','☃️','💨','💧','💦','☔',
    '🌊','🌫️','🌈','🔥','⚡','🌋','⛰️','🏔️','🏕️','🏖️','🏝️',
  ] },
  { label: 'Еда', items: [
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
    '🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯',
    '🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟',
    '🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤',
    '🍙','🍚','🍘','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯',
    '🥛','☕','🍵','🧃','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🍾','🧊',
  ] },
  { label: 'Занятия', items: [
    '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🏒','⛳','🏹','🎣','🤿','🥊',
    '🥋','🛹','🛼','⛸️','🎿','🏂','🏋️','🤸','🤺','⛹️','🏌️','🏇','🏄','🏊','🚣','🧗',
    '🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎫','🎪','🤹','🎭','🎨','🎬','🎤','🎧',
    '🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩','🎽','🪁',
  ] },
  { label: 'Путешествия', items: [
    '🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚐','🚚','🚜','🛴','🚲','🛵','🏍️','🚨',
    '🚠','🚆','🚇','🚝','🚄','✈️','🛫','🛬','🚀','🛸','🚁','⛵','🚤','🛳️','⚓','⛽',
    '🗼','🗽','🏰','🏯','🎡','🎢','⛲','⛺','🏠','🏡','🏢','🏥','🏦','🏨','🏫','💒',
    '⛪','🕌','⛩️','🌆','🌇','🌃','🌉','🗿','🗺️','🧭','🌍','🌎','🌏','🪐',
  ] },
  { label: 'Предметы', items: [
    '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🕹️','💾','💿','📷','📸','📹','🎥','📞','☎️',
    '📺','📻','🎙️','⏰','⏳','⌛','📡','🔋','🔌','💡','🔦','🕯️','💸','💵','💰','💳',
    '💎','⚖️','🧰','🔧','🔨','🛠️','⛏️','🔩','⚙️','🧲','💣','🔪','🛡️','🔮','🧿','🔭',
    '🔬','💊','💉','🩹','🌡️','🧬','🦠','🧪','🧹','🧺','🚿','🛁','🧼','🧽','🛎️','🔑',
    '🗝️','🚪','🪑','🛋️','🛏️','🧸','🖼️','🛍️','🛒','🎁','🎈','🎀','🎊','🎉','🏮','✉️',
    '📩','📧','💌','📮','📦','🏷️','📜','📄','📑','🧾','📊','📈','📉','🗒️','📆','📅',
    '🗑️','📋','📁','📂','🗞️','📰','📓','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗',
    '📎','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔒',
    '🔓','❤️‍🔥','🧯','🪫','🪛','🪚',
  ] },
  { label: 'Символы', items: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','☯️','⛎','♈','♉','♊','♋','♌','♍',
    '♎','♏','♐','♑','♒','♓','✅','❌','➕','➖','➗','✖️','💲','™️','©️','®️',
    '✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹',
    '🔶','🔷','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🔈','🔇','🔉','🔊','🔔','🔕',
    '📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🕐','💯','💥','🕊️','❗','❓',
    '‼️','⁉️','💤','🚫','♻️','🔱','⭕','🌐','💠','🌀','🚸','⚠️','🚷','📵','🔞','💮',
  ] },
]

const RECENT_EMOJI_KEY = 'pechatniki-recent-emoji'

function loadRecentEmoji() {
  try { return JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) || '[]') } catch { return [] }
}

function EmojiPicker({ editor }) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState(loadRecentEmoji)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const insert = (emoji) => {
    editor.chain().focus().insertContent(emoji).run()
    const next = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 16)
    setRecent(next)
    try { localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next)) } catch { /* ignored */ }
    setOpen(false)
  }

  const groups = recent.length > 0
    ? [{ label: 'Недавние', items: recent }, ...EMOJI_GROUPS]
    : EMOJI_GROUPS

  return (
    <div className="emoji-wrap" ref={wrapRef}>
      <button
        className={`toolbar-btn${open ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Эмодзи"
      >
        <IconSmiley />
      </button>
      {open && (
        <div className="emoji-menu">
          {groups.map(group => (
            <div key={group.label} className="emoji-group">
              <div className="emoji-group-label">{group.label}</div>
              <div className="emoji-grid">
                {group.items.map(e => (
                  <button
                    key={e}
                    className="emoji-btn"
                    onMouseDown={ev => ev.preventDefault()} /* не снимаем фокус с редактора */
                    onClick={() => insert(e)}
                  >{e}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeadingDropdown({ editor, direction = 'up' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeLevel = HEADING_LEVELS.find(l => editor.isActive('heading', { level: l }))
  const label = activeLevel ? `H${activeLevel}` : 'Заголовок'

  return (
    <div className="toolbar-heading-wrap" ref={wrapRef}>
      <button
        className={`toolbar-btn toolbar-btn--label${activeLevel ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Заголовок (⌘⌥1…6)"
      >
        {label}
        <span className="toolbar-heading-caret"><IconChevronRight size={9} /></span>
      </button>
      {open && (
        <div className={`toolbar-heading-menu${direction === 'down' ? ' toolbar-heading-menu--down' : ''}`}>
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
              Заголовок {level} <kbd>⌘⌥{level}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Инструменты редактуры для мобильной шапки: жирный, курсив, зачеркнутый,
// ссылка, список и заголовки. Нижний тулбар на телефоне скрыт —
// его закрывает клавиатура.
export function MobileHeaderTools({ editor }) {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => forceUpdate(n => n + 1)
    editor.on('update', update)
    editor.on('selectionUpdate', update)
    return () => { editor.off('update', update); editor.off('selectionUpdate', update) }
  }, [editor])

  if (!editor) return null

  const btn = (action, label, icon, active) => (
    <button
      className={`toolbar-btn${active ? ' active' : ''}`}
      onClick={action}
      title={label}
    >
      {icon}
    </button>
  )

  const handleLink = () => {
    const currentUrl = editor.getAttributes('link').href || ''
    window.dispatchEvent(new CustomEvent('pechatniki:link-dialog', { detail: { currentUrl } }))
  }

  return (
    <>
      {btn(() => editor.chain().focus().toggleBold().run(), 'Жирный', <IconBold />, editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'Курсив', <IconItalic />, editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'Зачеркнутый', <IconStrike />, editor.isActive('strike'))}
      {btn(handleLink, 'Ссылка', <IconLink />, editor.isActive('link'))}
      {btn(() => editor.chain().focus().toggleBulletList().run(), 'Список', <IconListUl />, editor.isActive('bulletList'))}
      <HeadingDropdown editor={editor} direction="down" />
    </>
  )
}

// Таблица: вне таблицы — вставка 3×3, внутри — меню операций
function TableControl({ editor }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const inTable = editor.isActive('table')

  const run = (fn) => { fn(editor.chain().focus()).run(); setOpen(false) }

  const insertTable = () =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  if (!inTable) {
    return (
      <button className="toolbar-btn" onClick={insertTable} title="Вставить таблицу">
        <IconTable />
      </button>
    )
  }

  const items = [
    { label: 'Столбец слева',   fn: c => c.addColumnBefore() },
    { label: 'Столбец справа',  fn: c => c.addColumnAfter() },
    { label: 'Удалить столбец', fn: c => c.deleteColumn() },
    { sep: true },
    { label: 'Строку выше',     fn: c => c.addRowBefore() },
    { label: 'Строку ниже',     fn: c => c.addRowAfter() },
    { label: 'Удалить строку',  fn: c => c.deleteRow() },
    { sep: true },
    { label: 'Строка-заголовок', fn: c => c.toggleHeaderRow() },
    { label: 'Объединить ячейки', fn: c => c.mergeCells() },
    { label: 'Разбить ячейку',    fn: c => c.splitCell() },
    { sep: true },
    { label: 'Удалить таблицу', fn: c => c.deleteTable(), danger: true },
  ]

  return (
    <div className="toolbar-heading-wrap" ref={wrapRef}>
      <button
        className="toolbar-btn active"
        onClick={() => setOpen(o => !o)}
        title="Таблица"
      >
        <IconTable />
      </button>
      {open && (
        <div className="toolbar-heading-menu">
          {items.map((it, i) => it.sep
            ? <div key={i} className="toolbar-menu-sep" />
            : (
              <button
                key={i}
                className={`toolbar-heading-item${it.danger ? ' toolbar-heading-item--danger' : ''}`}
                onClick={() => run(it.fn)}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

function countOf(text) {
  return {
    words: text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0,
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, '').length,
  }
}

export default function Toolbar({ editor }) {
  const [stats, setStats] = useState({ words: 0, chars: 0, charsNoSpace: 0 })
  // Счётчик выделенного фрагмента — null, когда ничего не выделено
  const [selStats, setSelStats] = useState(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => {
      setStats(countOf(editor.getText()))

      const { from, to, empty } = editor.state.selection
      if (empty) {
        setSelStats(null)
      } else {
        // textBetween с разделителями, иначе слова из соседних блоков слипаются
        const sel = editor.state.doc.textBetween(from, to, ' ', ' ')
        setSelStats(sel.trim() ? countOf(sel) : null)
      }
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
        {btn(() => editor.chain().focus().toggleStrike().run(), 'Зачеркнутый (⌘⇧-)', <IconStrike />, editor.isActive('strike'))}
        {btn(handleLink, 'Ссылка (⌘K)', <IconLink />, editor.isActive('link'))}
        {btn(() => editor.chain().focus().toggleCode().run(), 'Код', <IconCode />, editor.isActive('code'))}

        <span className="toolbar-sep" />

        {btn(handleInsertImage, 'Изображение', <IconImage />, false)}
        {btn(handleInsertEmbed, 'Встроить (YouTube, Google Slides…)', <IconEmbed />, false)}
        <TableControl editor={editor} />
        <EmojiPicker editor={editor} />

        <span className="toolbar-sep" />

        {btn(() => editor.chain().focus().toggleBulletList().run(), 'Список', <IconListUl />, editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), 'Нумерованный список', <IconListOl />, editor.isActive('orderedList'))}

        <span className="toolbar-sep" />

        <HeadingDropdown editor={editor} />
      </div>

      <div className="toolbar-right">
        {selStats && (
          <span className="toolbar-stat toolbar-stat--sel" title="Выделенный фрагмент">
            Выделено: {selStats.words.toLocaleString('ru')} сл.
            {' · '}
            {selStats.chars.toLocaleString('ru')} зн.
          </span>
        )}
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

function IconTable() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1"/>
      <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
      <line x1="1.5" y1="10" x2="14.5" y2="10"/>
      <line x1="6" y1="2.5" x2="6" y2="13.5"/>
      <line x1="10.5" y1="2.5" x2="10.5" y2="13.5"/>
    </svg>
  )
}
function IconSmiley() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5"/>
      <circle cx="5.7" cy="6.5" r=".6" fill="currentColor" stroke="none"/>
      <circle cx="10.3" cy="6.5" r=".6" fill="currentColor" stroke="none"/>
      <path d="M5.2 9.6a3.5 3.5 0 0 0 5.6 0"/>
    </svg>
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
