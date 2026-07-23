import { useState, useCallback, useEffect, useRef } from 'react'
import Editor from './components/Editor'
import Toolbar, { MobileHeaderTools } from './components/Toolbar'
import Preview from './components/Preview'
import TOC from './components/TOC'
import Settings from './components/Settings'
import DocsPanel from './components/DocsPanel'
import SpellDialog from './components/SpellDialog'
import InputDialog from './components/InputDialog'
import BufferPanel from './components/BufferPanel'
import ShareDialog from './components/ShareDialog'
import ShortcutsDialog from './components/ShortcutsDialog'
import KbExportDialog from './components/KbExportDialog'
import FootnotesPanel from './components/FootnotesPanel'
import OverflowMenu from './components/OverflowMenu'
import { IconSpellcheck, IconTypograf, IconTray, IconKeyboard, IconSwapLetter, IconEmbedGeneric } from './components/icons'
import Typograf from 'typograf'
import { buildPosMap, fetchSpellerErrors } from './hooks/useYandexSpeller'
import { loadStopPhrases } from './hooks/useStopWords'
import { markdownToHtml, editorToMarkdown, jsonToMarkdown } from './utils/markdown'
import { exportKnowledgeBase } from './utils/export'
import { encodeShareUrl, decodeShareUrl, decodeWithPassword } from './utils/share'
import './App.css'
import './styles/mobile.css' // последним — перекрывает стили компонентов

const tp = new Typograf({ locale: ['ru', 'en-US'] })

// ── Хранилище документов ──────────────────────────────────────────────────────

const DOCS_KEY     = 'pechatniki-docs'
const CUR_KEY      = 'pechatniki-current-id'
const PROJECTS_KEY = 'pechatniki-projects'
const genId        = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

function loadDocs()           { try { return JSON.parse(localStorage.getItem(DOCS_KEY)     || '[]') } catch { return [] } }
function storeDocs(docs)      { try { localStorage.setItem(DOCS_KEY,     JSON.stringify(docs))      } catch { /* ignore */ } }
function loadProjects()       { try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') } catch { return [] } }
function storeProjects(list)  { try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list))      } catch { /* ignore */ } }

function titleFromJson(json) {
  const nodes = json?.content || []
  const h1 = nodes.find(n => n.type === 'heading' && n.attrs?.level === 1)
  if (h1) { const t = (h1.content || []).map(n => n.text || '').join('').trim(); if (t) return t }
  const first = nodes.find(n => n.content?.length > 0)
  if (first) { const t = (first.content || []).map(n => n.text || '').join('').trim(); if (t) return t.slice(0, 60) }
  return ''
}

// ── Приветственный документ при первом запуске ──────────────────────────────

const WELCOME_MD = `# Добро пожаловать в Печатники

Это редактор для тех, кто пишет тексты с нейросетями в соседней вкладке. Генерируйте в ChatGPT, Claude или DeepSeek и редактируйте здесь. Печатники сами уберут лишнее форматирование и поправят типографику.

Что здесь есть:

- **Типограф** — расставит правильные кавычки, тире и неразрывные пробелы (кнопка в шапке или ⌘⇧T).
- **Проверка орфографии** через Яндекс.Спеллер (в меню инструментов, ⌘⇧Y).
- **Деёизация** — заменит ё на е для текстов, где принята буква е.
- **Документы и проекты** — все ваши тексты живут в панели слева (кнопка ≡).
- **Поделиться заметкой** — документ превращается в ссылку без облачного хранения, при желании с паролем.
- **Экспорт** — Markdown, PDF или вся база знаний одним файлом.

## Попробуйте прямо в этом документе

Ниже — три предложения с намеренными огрехами. Исправьте их кнопками, ничего не переписывая руками.

1. Нажмите значок типографа в шапке (или ⌘⇧T) — кавычки и тире встанут на место: "Печатники" - это редактор, а не просто блокнот, и три точки... станут настоящим многоточием.

2. Откройте Инструменты → Яндекс.Спеллер (⌘⇧Y) — и он поймает опечатки: искуственный интелект напесал этот абзац.

3. Там же живет «Деёизация»: одно нажатие — и ёжик, ёлка и весёлый счётчик останутся без точек.

## Ваши данные — только ваши

У Печатников нет серверов, и они нам не нужны. Все, что вы пишете, хранится только на вашем устройстве — в памяти браузера. Мы не обрабатываем, не храним и не передаем ваши тексты — и уж точно не отдаем их на обучение нейросетей.

Единственное исключение — проверка орфографии: при запуске текст отправляется в сервис Яндекс.Спеллер. Не хотите даже этого — включите режим самоизоляции в настройках (⚙), и приложение перестанет обращаться в интернет совсем.

Этот документ можно удалить — или начать писать прямо в нем.`

// Миграция: докам без флага manualTitle вычисляем его по факту —
// если сохраненное название совпадает с автоназванием из содержимого
// (или названия нет), значит пользователь его не трогал.
function migrateManualTitles(docs) {
  let changed = false
  const out = docs.map(d => {
    if (d.manualTitle !== undefined) return d
    changed = true
    const auto = titleFromJson(d.content)
    const manual = !!d.title && d.title !== 'Без названия' && d.title !== auto
    return { ...d, manualTitle: manual }
  })
  if (changed && out.length > 0) storeDocs(out)
  return out
}

// Синхронно читаем из localStorage при старте
function bootstrap() {
  const all = migrateManualTitles(loadDocs())
  if (all.length > 0) {
    const curId = localStorage.getItem(CUR_KEY)
    const cur   = all.find(d => d.id === curId) || [...all].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    return { docs: all, currentId: cur.id, content: cur.content, title: cur.title || '' }
  }
  // Мигрируем старый черновик, если был
  let draft = null
  try { const s = localStorage.getItem('pechatniki-draft'); if (s) draft = JSON.parse(s) } catch { /* ignored */ }

  // Совсем первый запуск — показываем приветственный документ
  const content = draft ?? markdownToHtml(WELCOME_MD)
  const title   = draft ? (titleFromJson(draft) || 'Без названия') : 'Добро пожаловать в Печатники'
  const id      = genId()
  const doc     = { id, title, content, createdAt: Date.now(), updatedAt: Date.now() }
  storeDocs([doc])
  localStorage.setItem(CUR_KEY, id)
  return { docs: [doc], currentId: id, content, title }
}

// Синглтон — вычисляем один раз при загрузке модуля
let _bootstrap = null
function getBootstrap() {
  if (!_bootstrap) _bootstrap = bootstrap()
  return _bootstrap
}

// ── Мобильный экран ──────────────────────────────────────────────────────────
// На телефоне нижний тулбар закрыт клавиатурой, поэтому инструменты
// редактуры переезжают в шапку, а остальное — в меню под гаечным ключом.

const MOBILE_QUERY = '(max-width: 700px)'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// ── Авто-затухание интерфейса ────────────────────────────────────────────────
// Печатаешь — шапка и тулбар тают, двинул мышь — возвращаются.
// Работает фоном всегда, а не только внутри Дзена.
function useTypingFade(editor, enabled) {
  const [faded, setFaded] = useState(false)
  const fadedRef = useRef(false)

  useEffect(() => {
    if (!editor || !enabled) return
    const fade = () => {
      if (!fadedRef.current) { fadedRef.current = true; setFaded(true) }
    }
    const reveal = () => {
      if (fadedRef.current) { fadedRef.current = false; setFaded(false) }
    }
    editor.on('update', fade)
    window.addEventListener('mousemove', reveal, { passive: true })
    window.addEventListener('touchstart', reveal, { passive: true })
    return () => {
      editor.off('update', fade)
      window.removeEventListener('mousemove', reveal)
      window.removeEventListener('touchstart', reveal)
      // Сбрасываем при отписке, иначе затухание «залипнет» при возврате
      fadedRef.current = false
      setFaded(false)
    }
  }, [editor, enabled])

  return enabled && faded
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const isMobile = useIsMobile()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [zenMode,      setZenMode]      = useState(false)
  const [showPreview,  setShowPreview]  = useState(false)
  const [showTOC,      setShowTOC]      = useState(false)
  const [showDocs,     setShowDocs]     = useState(false)
  const [showTypograf, setShowTypograf] = useState(false)
  const [typografEnabled, setTypografEnabled] = useState(
    () => JSON.parse(localStorage.getItem('typograf-enabled') ?? 'true')
  )
  const [isolationMode, setIsolationMode] = useState(
    () => JSON.parse(localStorage.getItem('pechatniki-isolation') ?? 'false')
  )
  const [showBuffer,   setShowBuffer]   = useState(false)
  const [showShare,    setShowShare]    = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showFootnotes, setShowFootnotes] = useState(false)
  const navHistoryRef = useRef([]) // стек id документов для кнопки «Назад»
  const [stopPhrases] = useState(() => loadStopPhrases())
  const [editor,     setEditor]     = useState(null)
  const [fileHandle, setFileHandle] = useState(null)
  const [isDirty,    setIsDirty]    = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const nameInputRef = useRef(null)
  // Название до начала ручного редактирования — чтобы понять, менял ли его пользователь
  const nameEditStartRef = useRef('')

  // ── Документы ─────────────────────────────────────────────────────────────
  const [projects,     setProjects]     = useState(() => loadProjects())
  const projectsRef = useRef([])
  useEffect(() => { projectsRef.current = projects }, [projects])
  const flushProjects = useCallback((updated) => {
    projectsRef.current = updated
    setProjects(updated)
    storeProjects(updated)
  }, [])

  const [docs,         setDocs]         = useState(() => getBootstrap().docs)
  const [currentDocId, setCurrentDocId] = useState(() => getBootstrap().currentId)
  const [fileName,     setFileName]     = useState(() => { const b = getBootstrap(); return b.title || titleFromJson(b.content) || 'Без названия' })
  const [initialContent]               = useState(() => getBootstrap().content)

  // рефы — стабильный доступ без stale-closure
  const docsRef     = useRef(docs)
  const curIdRef    = useRef(currentDocId)
  const nameRef     = useRef(fileName)
  const timerRef    = useRef(null)
  useEffect(() => { docsRef.current  = docs         }, [docs])
  useEffect(() => { curIdRef.current = currentDocId }, [currentDocId])
  useEffect(() => { nameRef.current  = fileName     }, [fileName])

  const flushDocs = useCallback((updated) => {
    docsRef.current = updated
    setDocs(updated)
    storeDocs(updated)
  }, [])

  // ── Проекты ───────────────────────────────────────────────────────────────
  const handleCreateProject = useCallback((title = 'Новый проект') => {
    const project = { id: genId(), title, createdAt: Date.now() }
    flushProjects([...projectsRef.current, project])
    return project.id
  }, [flushProjects])

  const handleRenameProject = useCallback((id, title) => {
    flushProjects(projectsRef.current.map(p => p.id === id ? { ...p, title } : p))
  }, [flushProjects])

  const handleDeleteProject = useCallback((id) => {
    // Снимаем projectId с документов этого проекта
    flushDocs(docsRef.current.map(d => d.projectId === id ? { ...d, projectId: null } : d))
    flushProjects(projectsRef.current.filter(p => p.id !== id))
  }, [flushProjects, flushDocs])

  const handleMoveDoc = useCallback((docId, projectId) => {
    flushDocs(docsRef.current.map(d => d.id === docId ? { ...d, projectId: projectId || null } : d))
  }, [flushDocs])

  // ── Орфография (Яндекс Спеллер) ──────────────────────────────────────────
  const [spellErrors, setSpellErrors] = useState([])  // { pos, len, word, s[] }[]
  const [spellIdx,    setSpellIdx]    = useState(0)

  // ── Диалог ссылок ─────────────────────────────────────────────────────────
  const [linkDialog, setLinkDialog] = useState(null) // null | { currentUrl: string }

  // ── Расшифровка входящей ссылки ───────────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('d')) return

    // Данные есть, а ключа во фрагменте нет — обычно значит, что сервис
    // сокращения показал промежуточную страницу и потерял часть после #.
    // Без ключа расшифровать нечего — объясняем, а не молчим.
    if (!window.location.hash) {
      window.alert('В ссылке не хватает ключа расшифровки — похоже, сервис сокращения его потерял. Попросите отправителя прислать полную ссылку.')
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    decodeShareUrl().then(async result => {
      if (!result) return

      let raw
      if (result.needsPassword) {
        const password = window.prompt('Этот документ защищен паролем. Введите пароль:')
        if (!password) return
        try {
          raw = await decodeWithPassword(result.d, result.salt, password)
        } catch {
          window.alert('Неверный пароль.')
          return
        }
      } else {
        raw = result.doc
      }

      // Поддержка envelope { v:1, doc } (старые ссылки могли содержать флаг
      // readonly — игнорируем: у получателя всегда своя редактируемая копия)
      const isEnvelope = raw && raw.v === 1 && raw.doc
      const doc = isEnvelope ? raw.doc : raw

      const id     = genId()
      const title  = titleFromJson(doc) || 'Входящий документ'
      const newDoc = { id, title, content: doc, createdAt: Date.now(), updatedAt: Date.now(), manualTitle: false }
      flushDocs([newDoc, ...docsRef.current])
      editor.commands.setContent(doc)
      curIdRef.current = id
      setCurrentDocId(id)
      localStorage.setItem(CUR_KEY, id)
      setFileName(title)
      window.history.replaceState({}, '', window.location.pathname)
    })
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(async ({ password = '' } = {}) => {
    if (!editor) throw new Error('no editor')
    return encodeShareUrl(editor.getJSON(), window.location.href, password)
  }, [editor])

  // ── Тема ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // ── Авто-заголовок ────────────────────────────────────────────────────────
  // Название следует за первой строкой документа, пока пользователь
  // не переименует документ вручную (флаг manualTitle на самом документе).
  useEffect(() => {
    if (!editor) return
    const updateTitle = () => {
      const cur = docsRef.current.find(d => d.id === curIdRef.current)
      if (cur?.manualTitle) return
      const json = editor.getJSON()
      const nodes = json.content || []
      const h1 = nodes.find(n => n.type === 'heading' && n.attrs?.level === 1)
      if (h1) { const t = (h1.content || []).map(n => n.text || '').join('').trim(); if (t) { setFileName(t); return } }
      const first = nodes.find(n => n.content?.length > 0)
      if (first) { const t = (first.content || []).map(n => n.text || '').join('').trim(); if (t) { setFileName(t.slice(0, 60)); return } }
      setFileName('Без названия')
    }
    editor.on('update', updateTitle)
    updateTitle()
    return () => editor.off('update', updateTitle)
  }, [editor])

  // Завершение ручного переименования: если название реально изменили —
  // закрепляем его (авто-название для этого документа выключается)
  const commitNameEdit = useCallback(() => {
    setIsEditingName(false)
    if (nameRef.current.trim() !== nameEditStartRef.current.trim()) {
      flushDocs(docsRef.current.map(d =>
        d.id === curIdRef.current
          ? { ...d, title: nameRef.current.trim() || 'Без названия', manualTitle: true, updatedAt: Date.now() }
          : d
      ))
    }
  }, [flushDocs])

  // ── Фокус на инпут имени ──────────────────────────────────────────────────
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  // ── Сохранить текущий документ (дебаунс 600 мс) ──────────────────────────
  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!editor || !curIdRef.current) return
      const updated = docsRef.current.map(d =>
        d.id === curIdRef.current
          ? { ...d, content: editor.getJSON(), title: nameRef.current || 'Без названия', updatedAt: Date.now() }
          : d
      )
      flushDocs(updated)
    }, 600)
  }, [editor, flushDocs])

  // ── Немедленное сохранение перед переключением ───────────────────────────
  const saveNow = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (!editor || !curIdRef.current) return
    const updated = docsRef.current.map(d =>
      d.id === curIdRef.current
        ? { ...d, content: editor.getJSON(), title: nameRef.current || 'Без названия', updatedAt: Date.now() }
        : d
    )
    flushDocs(updated)
  }, [editor, flushDocs])

  const handleNewInProject = useCallback((projectId) => {
    saveNow?.()
    const id     = genId()
    const empty  = { type: 'doc', content: [{ type: 'paragraph' }] }
    const newDoc = { id, title: 'Без названия', content: empty, createdAt: Date.now(), updatedAt: Date.now(), projectId, manualTitle: false }
    flushDocs([newDoc, ...docsRef.current])
    editor?.commands.setContent(empty)
    curIdRef.current = id
    setCurrentDocId(id)
    localStorage.setItem(CUR_KEY, id)
    setFileName('Без названия')
    setIsDirty(false)
    setShowDocs(false)
  }, [editor, flushDocs, saveNow])

  // ── История навигации по @-ссылкам ───────────────────────────────────────
  const [navCanBack, setNavCanBack] = useState(false)

  // ── Переключить документ ─────────────────────────────────────────────────
  const handleSelectDoc = useCallback((id, fromLink = false) => {
    if (id === curIdRef.current) { setShowDocs(false); return }
    if (fromLink && curIdRef.current) {
      // Переход по @-ссылке — запоминаем откуда пришли
      navHistoryRef.current = [...navHistoryRef.current, curIdRef.current]
    } else {
      // Переход через панель документов — сбрасываем историю
      navHistoryRef.current = []
    }
    saveNow()
    const doc = docsRef.current.find(d => d.id === id)
    if (!doc) return
    editor?.commands.setContent(doc.content)
    curIdRef.current = id
    setCurrentDocId(id)
    localStorage.setItem(CUR_KEY, id)
    setFileName(doc.title || 'Без названия')
    setIsDirty(false)
    setShowDocs(false)
    setNavCanBack(navHistoryRef.current.length > 0)
  }, [editor, saveNow])

  const handleNavBack = useCallback(() => {
    const stack = navHistoryRef.current
    if (!stack.length) return
    const prevId = stack[stack.length - 1]
    navHistoryRef.current = stack.slice(0, -1)
    saveNow()
    const doc = docsRef.current.find(d => d.id === prevId)
    if (!doc) { setNavCanBack(navHistoryRef.current.length > 0); return }
    editor?.commands.setContent(doc.content)
    curIdRef.current = prevId
    setCurrentDocId(prevId)
    localStorage.setItem(CUR_KEY, prevId)
    setFileName(doc.title || 'Без названия')
    setIsDirty(false)
    setNavCanBack(navHistoryRef.current.length > 0)
  }, [editor, saveNow])

  // ── Новый документ ────────────────────────────────────────────────────────
  const handleNewDoc = useCallback(() => {
    saveNow()
    const id      = genId()
    const empty   = { type: 'doc', content: [{ type: 'paragraph' }] }
    const newDoc  = { id, title: 'Без названия', content: empty, createdAt: Date.now(), updatedAt: Date.now(), manualTitle: false }
    flushDocs([newDoc, ...docsRef.current])
    editor?.commands.setContent(empty)
    curIdRef.current = id
    setCurrentDocId(id)
    localStorage.setItem(CUR_KEY, id)
    setFileName('Без названия')
    setIsDirty(false)
    setShowDocs(false)
  }, [editor, saveNow, flushDocs])

  // ── Удалить документ ─────────────────────────────────────────────────────
  const handleDeleteDoc = useCallback((id) => {
    if (docsRef.current.length <= 1) return
    const newDocs = docsRef.current.filter(d => d.id !== id)
    flushDocs(newDocs)
    if (id === curIdRef.current) {
      const latest = [...newDocs].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      editor?.commands.setContent(latest.content)
      curIdRef.current = latest.id
      setCurrentDocId(latest.id)
      localStorage.setItem(CUR_KEY, latest.id)
      setFileName(latest.title || 'Без названия')
      setIsDirty(false)
    }
  }, [editor, flushDocs])

  // ── Экспорт всех документов в ZIP ────────────────────────────────────────
  const handleExportDocs = useCallback(async () => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()

    // Бэкап JSON — для точного восстановления
    zip.file('_backup.json', JSON.stringify(docsRef.current, null, 2))

    // Каждый документ как .md (для чтения вне приложения)
    const seen = {}
    docsRef.current.forEach(doc => {
      let base = (doc.title || 'doc').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80).trim() || 'doc'
      seen[base] = (seen[base] || 0) + 1
      const name = seen[base] > 1 ? `${base} (${seen[base]})` : base
      const md = typeof doc.content === 'string'
        ? doc.content.replace(/<[^>]+>/g, '') // HTML-строка → plain text
        : jsonToMarkdown(doc.content)
      zip.file(`${name}.md`, md)
    })

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url, download: 'pechatniki-backup.zip'
    })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

  // ── Экспорт базы знаний (HTML) ────────────────────────────────────────────
  const [showKbExport, setShowKbExport] = useState(false)

  const handleKbConfirm = useCallback(({ docs: selectedDocs, title }) => {
    exportKnowledgeBase(selectedDocs, title)
    setShowKbExport(false)
  }, [])

  // ── Импорт из ZIP-бэкапа ──────────────────────────────────────────────────
  async function importFromZip(file) {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(file)
    const backupFile = zip.file('_backup.json')

    if (backupFile) {
      // Точное восстановление из бэкапа (с id и датами)
      return JSON.parse(await backupFile.async('string'))
    }
    // Сторонний архив: собираем .md-файлы
    const out = []
    const mdFiles = Object.values(zip.files).filter(f => !f.dir && f.name.endsWith('.md'))
    for (const f of mdFiles) {
      const text  = await f.async('string')
      const title = f.name.replace(/\.md$/i, '').split('/').pop()
      out.push({ id: genId(), title, content: markdownToHtml(text),
        createdAt: Date.now(), updatedAt: Date.now(), manualTitle: true })
    }
    return out
  }

  // ── Импорт: ZIP, Word (.docx), HTML, Markdown, текст ──────────────────────
  const handleImportDocs = useCallback(() => {
    const input = document.createElement('input')
    input.type     = 'file'
    input.multiple = true
    input.accept   = '.zip,.docx,.html,.htm,.md,.markdown,.txt'
    input.onchange = async (e) => {
      const files = [...e.target.files]
      if (!files.length) return
      try {
        let imported = []
        for (const file of files) {
          if (file.name.toLowerCase().endsWith('.zip')) {
            imported = imported.concat(await importFromZip(file))
          } else {
            const { fileToDocs } = await import('./utils/import')
            const docsFromFile = await fileToDocs(file)
            imported = imported.concat(docsFromFile.map(d => ({
              id: genId(), title: d.title, content: d.content,
              createdAt: Date.now(), updatedAt: Date.now(), manualTitle: true,
            })))
          }
        }

        if (imported.length === 0) { alert('Не удалось прочитать файлы'); return }

        const existingIds = new Set(docsRef.current.map(d => d.id))
        const fresh = imported.filter(d => !existingIds.has(d.id))
        if (fresh.length > 0) {
          flushDocs([...docsRef.current, ...fresh])
          alert(`Импортировано: ${fresh.length} документ(ов)`)
        } else {
          alert('Все документы уже есть в истории')
        }
      } catch (err) {
        alert('Ошибка при импорте: ' + err.message)
      }
    }
    input.click()
  }, [flushDocs])

  // ── Файловые операции ─────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    if (isDirty && !confirm('Несохраненные изменения будут потеряны. Продолжить?')) return
    handleNewDoc()
  }, [isDirty, handleNewDoc])

  const handleOpenFallback = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text  = await file.text()
      saveNow()
      const id    = genId()
      const title = file.name.replace(/\.(md|txt)$/i, '')
      const empty = { type: 'doc', content: [{ type: 'paragraph' }] }
      flushDocs([{ id, title, content: empty, createdAt: Date.now(), updatedAt: Date.now(), manualTitle: false }, ...docsRef.current])
      editor?.commands.setContent(markdownToHtml(text))
      curIdRef.current = id
      setCurrentDocId(id)
      localStorage.setItem(CUR_KEY, id)
      setFileName(title)
      setIsDirty(false)
    }
    input.click()
  }, [editor, saveNow, flushDocs])

  const handleOpen = useCallback(async () => {
    if (!window.showOpenFilePicker) return handleOpenFallback()
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.txt'] } }]
      })
      const file = await handle.getFile()
      const text = await file.text()
      saveNow()
      const id    = genId()
      const title = handle.name.replace(/\.(md|txt)$/i, '')
      const empty = { type: 'doc', content: [{ type: 'paragraph' }] }
      flushDocs([{ id, title, content: empty, createdAt: Date.now(), updatedAt: Date.now(), manualTitle: false }, ...docsRef.current])
      editor?.commands.setContent(markdownToHtml(text))
      curIdRef.current = id
      setCurrentDocId(id)
      localStorage.setItem(CUR_KEY, id)
      setFileHandle(handle)
      setFileName(title)
      setIsDirty(false)
    } catch { /* ignored — user cancelled or API unavailable */ }
  }, [editor, saveNow, flushDocs, handleOpenFallback])

  const handleSaveAs = useCallback(async () => {
    if (!editor) return
    const md = editorToMarkdown(editor)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName + '.md',
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
        })
        const writable = await handle.createWritable()
        await writable.write(md)
        await writable.close()
        setFileHandle(handle)
        setIsDirty(false)
        return
      } catch { /* ignored — user cancelled */ }
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName + '.md'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [editor, fileName])

  const handleSave = useCallback(async () => {
    if (!editor) return
    const md = editorToMarkdown(editor)
    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable()
        await writable.write(md)
        await writable.close()
        setIsDirty(false)
        return
      } catch { /* ignored — fallback to Save As */ }
    }
    handleSaveAs()
  }, [editor, fileHandle, handleSaveAs])

  const handleDeyo = useCallback(() => {
    if (!editor) return
    const { state, view, schema } = editor
    const replacements = []
    state.doc.descendants((node, pos) => {
      if (!node.isText) return
      // NFD: Ё→Е+U+0308, ё→е+U+0308 — нормализуем до NFC чтобы regex работал
      const nfc = node.text.normalize('NFC')
      const replaced = nfc.replace(/[ёЁëË]/g, c =>
        (c === 'ё' || c === 'ë') ? 'е' : 'Е'
      )
      if (replaced !== nfc) {
        replacements.push({ from: pos, to: pos + node.nodeSize, text: replaced, marks: node.marks })
      }
    })
    if (!replacements.length) return
    // Применяем с конца, чтобы позиции не съезжали
    let tr = state.tr
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { from, to, text, marks } = replacements[i]
      tr = tr.replaceWith(from, to, schema.text(text, marks))
    }
    view.dispatch(tr)
    editor.commands.focus()
  }, [editor])

  const handleTypografToggle = (val) => {
    setTypografEnabled(val)
    localStorage.setItem('typograf-enabled', JSON.stringify(val))
  }

  const handleIsolationToggle = () => {
    setIsolationMode(v => {
      const next = !v
      localStorage.setItem('pechatniki-isolation', JSON.stringify(next))
      return next
    })
  }

  const handleApplyTypograf = useCallback(() => {
    if (!editor) return
    const { from } = editor.state.selection
    const html = editor.getHTML()
    const processed = tp.execute(html)
    editor.commands.setContent(processed, false)
    try { editor.commands.setTextSelection(Math.min(from, editor.state.doc.content.size)) } catch { /* ignored */ }
    setIsDirty(true)
  }, [editor])

  // ── Запуск проверки орфографии ────────────────────────────────────────────
  const checkSpelling = useCallback(async () => {
    if (!editor || isolationMode) return
    const text = editor.getText()
    let raw
    try { raw = await fetchSpellerErrors(text) } catch { return }
    if (!raw.length) return
    // Храним только текстовые позиции; PM-позиции считаем свежо каждый раз
    setSpellErrors(raw.map(e => ({ ...e, word: text.slice(e.pos, e.pos + e.len) })))
    setSpellIdx(0)
  }, [editor, isolationMode])

  // Получить PM-позиции текущей ошибки по актуальному состоянию документа
  const getSpellPmRange = useCallback((err) => {
    if (!editor || !err) return null
    const posMap = buildPosMap(editor.state.doc)
    const pmFrom = posMap[err.pos]
    const pmTo   = posMap[err.pos + err.len - 1] != null ? posMap[err.pos + err.len - 1] + 1 : null
    if (pmFrom == null || pmTo == null) return null
    return { from: pmFrom, to: pmTo }
  }, [editor])

  // Подсветить текущую ошибку в редакторе при каждом переходе
  useEffect(() => {
    if (!editor || !spellErrors.length || spellIdx >= spellErrors.length) return
    const range = getSpellPmRange(spellErrors[spellIdx])
    if (!range) return
    try { editor.chain().focus().setTextSelection(range).run() } catch { /* ignored */ }
  }, [spellIdx, spellErrors, editor, getSpellPmRange])

  const handleSpellSkip = useCallback(() => {
    setSpellIdx(i => {
      const next = i + 1
      if (next >= spellErrors.length) { setSpellErrors([]); return 0 }
      return next
    })
  }, [spellErrors.length])

  const handleSpellClose = useCallback(() => {
    setSpellErrors([]); setSpellIdx(0)
  }, [])

  const handleSpellFixAll = useCallback(() => {
    if (!editor || !spellErrors.length) return

    // Строим posMap один раз по текущему документу
    const posMap = buildPosMap(editor.state.doc)
    const { schema } = editor

    // Сортируем по убыванию позиции — правим с конца, чтобы смещения не ломали предыдущие
    const toFix = [...spellErrors]
      .filter(e => e.s?.length > 0)
      .sort((a, b) => b.pos - a.pos)

    let tr = editor.state.tr
    for (const err of toFix) {
      const suggestion = err.s[0]
      const pmFrom = posMap[err.pos]
      const pmTo   = posMap[err.pos + err.len - 1] != null ? posMap[err.pos + err.len - 1] + 1 : null
      if (pmFrom == null || pmTo == null) continue

      const actual = tr.doc.textBetween(pmFrom, pmTo)
      if (actual.toLowerCase() !== err.word.toLowerCase()) continue

      const marks = tr.doc.resolve(pmFrom).marks()
      tr = tr.replaceWith(pmFrom, pmTo, schema.text(suggestion, marks))
    }

    editor.view.dispatch(tr)
    editor.commands.focus()
    setSpellErrors([])
    setSpellIdx(0)
  }, [editor, spellErrors])

  const handleSpellFix = useCallback((suggestion) => {
    if (!editor || spellIdx >= spellErrors.length) return
    const err   = spellErrors[spellIdx]
    const range = getSpellPmRange(err)
    if (!range) { handleSpellSkip(); return }

    // Проверяем, что слово всё ещё на месте
    const actual = editor.state.doc.textBetween(range.from, range.to)
    if (actual.toLowerCase() !== err.word.toLowerCase()) { handleSpellSkip(); return }

    // Применяем замену через прямую транзакцию — надёжнее цепочки команд
    const { state, view, schema } = editor
    const $from = state.doc.resolve(range.from)
    const marks  = $from.marks()
    view.dispatch(state.tr.replaceWith(range.from, range.to, schema.text(suggestion, marks)))
    editor.commands.focus()

    // Корректируем текстовые позиции оставшихся ошибок
    const delta   = suggestion.length - err.len
    const updated = spellErrors.map((e, i) =>
      i > spellIdx ? { ...e, pos: e.pos + delta } : e
    )
    if (spellIdx + 1 >= updated.length) {
      setSpellErrors([]); setSpellIdx(0)
    } else {
      setSpellErrors(updated)
      setSpellIdx(i => i + 1)
    }
  }, [editor, spellErrors, spellIdx, getSpellPmRange, handleSpellSkip])

  // ── Диалог ссылок: слушаем событие от Editor ──────────────────────────────
  useEffect(() => {
    const handler = (e) => setLinkDialog({ currentUrl: e.detail?.currentUrl || '' })
    window.addEventListener('pechatniki:link-dialog', handler)
    return () => window.removeEventListener('pechatniki:link-dialog', handler)
  }, [])

  const handleLinkConfirm = useCallback((url) => {
    if (editor) editor.chain().focus().setLink({ href: url }).run()
    setLinkDialog(null)
  }, [editor])

  // ── Глобальные горячие клавиши ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) {
        if (e.key === 'Escape') {
          if (zenMode) setZenMode(false)
          else if (showShortcuts) setShowShortcuts(false)
          else if (showDocs) setShowDocs(false)
          else if (showTOC)  setShowTOC(false)
        }
        return
      }
      if (e.shiftKey && e.key === 'D') { e.preventDefault(); setZenMode(z => !z);   return }
      if (e.shiftKey && e.key === 'T') { e.preventDefault(); handleApplyTypograf(); return }
      if (e.shiftKey && e.key === 'N') { e.preventDefault(); handleNew();           return }
      if (e.shiftKey && e.key === 'S') { e.preventDefault(); handleSave();          return }
      if (e.shiftKey && e.key === 'Y') { e.preventDefault(); if (!isolationMode) checkSpelling(); return }
      if (e.key === '/' || e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor, fileHandle, isDirty, zenMode, showDocs, showTOC, showShortcuts, isolationMode,
      checkSpelling, handleNew, handleOpen, handleSave, handleSaveAs, handleApplyTypograf])

  // ── Рендер ────────────────────────────────────────────────────────────────
  // Интерфейс не тает, пока открыта любая панель или диалог
  const uiBusy = showDocs || showTOC || showBuffer || showTypograf || showPreview ||
    showShare || showShortcuts || showKbExport || showFootnotes || isEditingName ||
    !!linkDialog || spellErrors.length > 0
  const uiFaded = useTypingFade(editor, !zenMode && !isMobile && !uiBusy)

  return (
    <div className={`app${zenMode ? ' app--zen' : ''}${uiFaded ? ' app--faded' : ''}${import.meta.env.VITE_IS_ELECTRON ? ' app--electron' : ''}`}>
      {!zenMode && !showPreview && (
        <div className="app-header">
          <div className="header-left">
            {/* ≡ — история документов */}
            <button
              className={`btn-icon${showDocs ? ' active' : ''}`}
              onClick={() => setShowDocs(s => !s)}
              title="Документы"
            >
              <IconMenu />
            </button>
            {/* § — оглавление (на мобильном — в меню инструментов) */}
            {!isMobile && (
              <button
                className={`btn-icon${showTOC ? ' active' : ''}`}
                onClick={() => setShowTOC(t => !t)}
                title="Оглавление"
              >
                <IconTOC />
              </button>
            )}
            {/* ← Назад — появляется при навигации по @-ссылкам */}
            {navCanBack && (
              <button
                className="btn-back"
                onClick={handleNavBack}
                title="Назад"
              >
                <IconBack /> Назад
              </button>
            )}
          </div>

          {/* На мобильном имя файла не влезает — редактируется в панели документов */}
          {isMobile ? (
            <span className="header-spacer" />
          ) : isEditingName ? (
            <input
              ref={nameInputRef}
              className="file-name file-name--editing"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              onBlur={commitNameEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') { commitNameEdit(); e.preventDefault() }
                if (e.key === 'Escape') {
                  // Отмена — возвращаем название, каким оно было
                  setFileName(nameEditStartRef.current)
                  setIsEditingName(false)
                  e.preventDefault()
                }
              }}
            />
          ) : (
            <span
              className="file-name"
              onClick={() => { nameEditStartRef.current = fileName; setIsEditingName(true) }}
              title="Нажмите, чтобы переименовать"
            >
              {fileName}{isDirty ? '  *' : ''}
            </span>
          )}

          <div className="header-right">
            {/* Мобильный: инструменты редактуры прямо в шапке —
                нижний тулбар закрывается клавиатурой */}
            {isMobile && <MobileHeaderTools editor={editor} />}
            <button className="btn-icon" onClick={handleApplyTypograf} title="Применить типограф (⌘⇧T)"><IconTypograf /></button>
            {!isMobile && (
              <>
                <button className={`btn-icon${showBuffer ? ' active' : ''}`} onClick={() => setShowBuffer(b => !b)} title="Буфер черновиков"><IconTray /></button>
                <button className={`btn-icon${zenMode ? ' active' : ''}`} onClick={() => setZenMode(z => !z)} title="Режим Дзен (⌘⇧D)"><IconZen /></button>
              </>
            )}
            <OverflowMenu
              icon={<IconWrench />}
              title="Инструменты"
              items={[
                {
                  key: 'spell',
                  icon: <IconSpellcheck size={14} />,
                  label: 'Яндекс.Спеллер',
                  title: isolationMode ? 'Отключено в режиме самоизоляции' : 'Проверить орфографию (⌘⇧Y)',
                  disabled: isolationMode,
                  onClick: checkSpelling,
                },
                {
                  key: 'deyo',
                  icon: <IconSwapLetter size={14} />,
                  label: 'Деёизация (ё→е)',
                  title: 'Заменить ё на е во всем тексте',
                  onClick: handleDeyo,
                },
                {
                  key: 'footnotes',
                  icon: <IconFootnoteList />,
                  label: 'Сноски и источники',
                  title: 'Список использованных сносок',
                  active: showFootnotes,
                  onClick: () => setShowFootnotes(v => !v),
                },
                ...(isMobile ? [
                  {
                    key: 'image',
                    icon: <IconImg />,
                    label: 'Изображение',
                    onClick: () => window.dispatchEvent(new CustomEvent('pechatniki:insert-image')),
                  },
                  {
                    key: 'embed',
                    icon: <IconEmbedGeneric size={14} />,
                    label: 'Встроить (YouTube, Slides…)',
                    onClick: () => window.dispatchEvent(new CustomEvent('pechatniki:insert-embed')),
                  },
                  {
                    key: 'toc',
                    icon: <IconTOC />,
                    label: 'Оглавление',
                    active: showTOC,
                    onClick: () => setShowTOC(t => !t),
                  },
                  {
                    key: 'buffer',
                    icon: <IconTray size={14} />,
                    label: 'Буфер черновиков',
                    active: showBuffer,
                    onClick: () => setShowBuffer(b => !b),
                  },
                  {
                    key: 'share',
                    icon: <IconShare />,
                    label: 'Поделиться заметкой',
                    onClick: () => setShowShare(true),
                  },
                  {
                    key: 'export',
                    icon: <IconExport />,
                    label: 'Экспорт',
                    onClick: () => setShowPreview(true),
                  },
                  {
                    key: 'theme',
                    icon: theme === 'dark' ? <IconSun /> : <IconMoon />,
                    label: 'Сменить тему',
                    onClick: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
                  },
                  {
                    key: 'settings',
                    icon: <IconGear />,
                    label: 'Настройки',
                    active: showTypograf,
                    onClick: () => setShowTypograf(t => !t),
                  },
                ] : [
                  {
                    key: 'shortcuts',
                    icon: <IconKeyboard size={14} />,
                    label: 'Горячие клавиши',
                    title: 'Список горячих клавиш (⌘/)',
                    onClick: () => setShowShortcuts(true),
                  },
                ]),
              ]}
            />
            {!isMobile && (
              <>
                <button className="btn-icon" onClick={() => setShowShare(true)} title="Поделиться заметкой"><IconShare /></button>
                <button className="btn-icon" onClick={() => setShowPreview(true)} title="Экспорт"><IconExport /></button>
                <button className="btn-icon" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Сменить тему">
                  {theme === 'dark' ? <IconSun /> : <IconMoon />}
                </button>
                <button className={`btn-icon${showTypograf ? ' active' : ''}`} onClick={() => setShowTypograf(t => !t)} title="Настройки"><IconGear /></button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="app-body">
        {showDocs && !zenMode && !showPreview && (
          <DocsPanel
            docs={docs}
            projects={projects}
            currentId={currentDocId}
            onSelect={handleSelectDoc}
            onNew={handleNewDoc}
            onDelete={handleDeleteDoc}
            onExport={handleExportDocs}
            onExportKb={() => setShowKbExport(true)}
            onImport={handleImportDocs}
            onClose={() => setShowDocs(false)}
            onCreateProject={handleCreateProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            onMoveDoc={handleMoveDoc}
            onNewInProject={handleNewInProject}
          />
        )}

        {showTOC && !zenMode && !showPreview && (
          <TOC editor={editor} onClose={() => setShowTOC(false)} />
        )}

        {showFootnotes && !zenMode && !showPreview && (
          <FootnotesPanel
            editor={editor}
            onEdit={(item, number) => window.dispatchEvent(new CustomEvent('pechatniki:edit-footnote', {
              detail: { pos: item.pos, number, note: item.note, url: item.url },
            }))}
            onInsertSources={() => window.dispatchEvent(new CustomEvent('pechatniki:insert-sources'))}
            onClose={() => setShowFootnotes(false)}
          />
        )}

        <div style={{ display: showPreview ? 'none' : 'contents' }}>
          <Editor
            onReady={setEditor}
            onChange={() => { setIsDirty(true); scheduleSave() }}
            zenMode={zenMode}
            initialContent={initialContent}
            docs={docs}
            onDocSelect={handleSelectDoc}
            stopPhrases={stopPhrases}
            typograf={typografEnabled ? tp : null}
          />
        </div>

        {showPreview && (
          <Preview
            editor={editor}
            fileName={fileName}
            typograf={tp}
            typografEnabled={typografEnabled}
            onTypografToggle={handleTypografToggle}
            onClose={() => setShowPreview(false)}
          />
        )}

        {showTypograf && !showPreview && (
          <Settings
            typograf={tp}
            typografEnabled={typografEnabled}
            onToggle={handleTypografToggle}
            isolationMode={isolationMode}
            onIsolationToggle={handleIsolationToggle}
            onClose={() => setShowTypograf(false)}
          />
        )}

        {showBuffer && !zenMode && !showPreview && (
          <BufferPanel onClose={() => setShowBuffer(false)} />
        )}
      </div>

      {/* Нижний тулбар только на десктопе — на телефоне его закрывает клавиатура,
          инструменты редактуры живут в шапке */}
      {!showPreview && !isMobile && <Toolbar editor={editor} />}

      {zenMode && (
        <button className="zen-exit" onClick={() => setZenMode(false)} title="Выйти из Дзен (Esc)">✕</button>
      )}

      {spellErrors.length > 0 && (
        <SpellDialog
          errors={spellErrors}
          idx={spellIdx}
          onFix={handleSpellFix}
          onFixAll={handleSpellFixAll}
          onSkip={handleSpellSkip}
          onClose={handleSpellClose}
        />
      )}

      {showShare && (
        <ShareDialog
          onShare={handleShare}
          isolationMode={isolationMode}
          onClose={() => setShowShare(false)}
        />
      )}

      {showShortcuts && (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
      )}

      {showKbExport && (
        <KbExportDialog
          docs={docs}
          projects={projects}
          onConfirm={handleKbConfirm}
          onClose={() => setShowKbExport(false)}
        />
      )}

      {linkDialog && (
        <InputDialog
          title="Ссылка"
          placeholder="https://..."
          defaultValue={linkDialog.currentUrl}
          onConfirm={handleLinkConfirm}
          onClose={() => setLinkDialog(null)}
        />
      )}
    </div>
  )
}

function IconBack() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2L4 6.5L8 11"/></svg>
}
function IconMenu() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><rect y="2" width="15" height="1.5" rx="0.75"/><rect y="6.75" width="15" height="1.5" rx="0.75"/><rect y="11.5" width="15" height="1.5" rx="0.75"/></svg>
}
function IconTOC() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="5" y1="3.5" x2="13" y2="3.5"/><line x1="3" y1="7.5" x2="13" y2="7.5"/><line x1="5" y1="11.5" x2="13" y2="11.5"/><circle cx="1.5" cy="3.5" r="0.75" fill="currentColor" stroke="none"/><circle cx="1.5" cy="7.5" r="0.75" fill="currentColor" stroke="none"/><circle cx="1.5" cy="11.5" r="0.75" fill="currentColor" stroke="none"/></svg>
}
function IconExport() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1v9M5 7l3 3 3-3"/><path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"/></svg>
}
function IconZen() {
  // Энсо — незамкнутый круг, символ дзена
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10.1 2.2A6.2 6.2 0 1 1 5.9 2.2"/></svg>
}
function IconWrench() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 1.5a3 3 0 0 0-2.2 5L2 12.8a.85.85 0 0 0 1.2 1.2L9.5 7.7a3 3 0 0 0 4.1-4.1L11.8 5.4 10.6 4.2l1.8-1.8a3 3 0 0 0-1.9-.9z"/></svg>
}
function IconGear() {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="2.1" />
      <circle cx="8" cy="8" r="4.2" />
      {teeth.map(a => (
        <rect key={a} x="7.25" y="0.6" width="1.5" height="2.1" rx="0.5" fill="currentColor" stroke="none" transform={`rotate(${a} 8 8)`} />
      ))}
    </svg>
  )
}
function IconSun() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><line x1="3" y1="3" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="13" y2="13"/><line x1="13" y1="3" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3" y2="13"/></svg>
}
function IconMoon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6.5 6.5 0 1 0 8 8z"/></svg>
}
function IconShare() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11.5" cy="3" r="1.5"/><circle cx="11.5" cy="12" r="1.5"/><circle cx="3.5" cy="7.5" r="1.5"/><line x1="5" y1="7.5" x2="10" y2="3.8"/><line x1="5" y1="7.5" x2="10" y2="11.2"/></svg>
}
function IconFootnoteList() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4.5h6M2 8h6M2 11.5h4"/><text x="10" y="7" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">1</text></svg>
}
function IconImg() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="14" height="12" rx="1.5"/><circle cx="5.5" cy="6" r="1.5"/><path d="M1 11l4-4 3 3 2-2 5 5"/></svg>
}
