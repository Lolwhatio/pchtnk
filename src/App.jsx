import { useState, useCallback, useEffect, useRef } from 'react'
import Editor from './components/Editor'
import Toolbar from './components/Toolbar'
import Preview from './components/Preview'
import TOC from './components/TOC'
import Settings from './components/Settings'
import Typograf from 'typograf'
import { useYandexSpeller } from './hooks/useYandexSpeller'
import { markdownToHtml, editorToMarkdown } from './utils/markdown'
import './App.css'

const tp = new Typograf({ locale: ['ru', 'en-US'] })

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [zenMode, setZenMode] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showTypograf, setShowTypograf] = useState(false)
  const [typografEnabled, setTypografEnabled] = useState(
    () => JSON.parse(localStorage.getItem('typograf-enabled') ?? 'true')
  )
  const [editor, setEditor] = useState(null)
  const [fileHandle, setFileHandle] = useState(null)
  const [fileName, setFileName] = useState('Без названия')
  const [isDirty, setIsDirty] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const nameInputRef = useRef(null)
  const { check: checkSpelling } = useYandexSpeller(editor)

  // Применяем тему
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Авто-заголовок из H1 или первой строки (не перебивает ручное переименование)
  const autoTitleRef = useRef(true)
  useEffect(() => {
    if (!editor) return
    const updateTitle = () => {
      if (!autoTitleRef.current) return
      const json = editor.getJSON()
      const nodes = json.content || []
      const h1 = nodes.find(n => n.type === 'heading' && n.attrs?.level === 1)
      if (h1) {
        const text = (h1.content || []).map(n => n.text || '').join('').trim()
        if (text) { setFileName(text); return }
      }
      const first = nodes.find(n => n.content?.length > 0)
      if (first) {
        const text = (first.content || []).map(n => n.text || '').join('').trim()
        if (text) { setFileName(text.slice(0, 60)); return }
      }
      setFileName('Без названия')
    }
    editor.on('update', updateTitle)
    updateTitle()
    return () => editor.off('update', updateTitle)
  }, [editor])

  // Фокус на инпут имени при переходе в режим редактирования
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  // Глобальные горячие клавиши — точь-в-точь как в оригинале
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey

      if (!mod) {
        if (e.key === 'Escape' && zenMode) setZenMode(false)
        return
      }

      // ⌘D — дзен
      if (e.key === 'd') { e.preventDefault(); setZenMode(z => !z); return }
      // ⌘T — применить типограф к тексту
      if (e.key === 't' && !e.shiftKey) { e.preventDefault(); handleApplyTypograf(); return }
      // ⌘⇧T — оглавление
      if (e.shiftKey && e.key === 'T') { e.preventDefault(); setShowTOC(t => !t); return }
      // ⌘N — новый файл
      if (e.key === 'n' && !e.shiftKey) { e.preventDefault(); handleNew(); return }
      // ⌘O — открыть
      if (e.key === 'o' && !e.shiftKey) { e.preventDefault(); handleOpen(); return }
      // ⌘S — сохранить
      if (e.key === 's' && !e.shiftKey) { e.preventDefault(); handleSave(); return }
      // ⌘⇧S — сохранить как
      if (e.key === 's' && e.shiftKey) { e.preventDefault(); handleSaveAs(); return }
      // ⌘Y — Яндекс-орфография
      if (e.key === 'y') { e.preventDefault(); checkSpelling(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor, fileHandle, isDirty, zenMode, checkSpelling])

  const handleNew = useCallback(() => {
    if (isDirty && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) return
    editor?.commands.setContent('<h1></h1><p></p>')
    setFileHandle(null)
    setIsDirty(false)
  }, [editor, isDirty])

  const handleOpen = useCallback(async () => {
    if (!window.showOpenFilePicker) return handleOpenFallback()
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.txt'] } }]
      })
      const file = await handle.getFile()
      const text = await file.text()
      editor?.commands.setContent(markdownToHtml(text))
      setFileHandle(handle)
      setIsDirty(false)
    } catch {}
  }, [editor])

  const handleOpenFallback = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      editor?.commands.setContent(markdownToHtml(text))
      setIsDirty(false)
    }
    input.click()
  }, [editor])

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
      } catch {}
    }
    handleSaveAs()
  }, [editor, fileHandle])

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
      } catch {}
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName + '.md'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [editor, fileName, fileHandle])

  const handleTypografToggle = (val) => {
    setTypografEnabled(val)
    localStorage.setItem('typograf-enabled', JSON.stringify(val))
  }

  // ⌘T — применяет типограф прямо к тексту редактора
  const handleApplyTypograf = useCallback(() => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const html = editor.getHTML()
    const processed = tp.execute(html)
    // Сохраняем позицию курсора
    editor.commands.setContent(processed, false)
    // Восстанавливаем курсор (приблизительно)
    try { editor.commands.setTextSelection(Math.min(from, editor.state.doc.content.size)) } catch {}
    setIsDirty(true)
  }, [editor])

  return (
    <div className={`app${zenMode ? ' app--zen' : ''}`}>
      {!zenMode && !showPreview && (
        <div className="app-header">
          {/* Левая группа */}
          <div className="header-left">
            <button
              className={`btn-icon${showTOC ? ' active' : ''}`}
              onClick={() => setShowTOC(t => !t)}
              title="Оглавление (⌘⇧T)"
            >
              <IconMenu />
            </button>
          </div>

          {/* Имя файла по центру — клик для переименования */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              className="file-name file-name--editing"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              onBlur={() => { setIsEditingName(false); autoTitleRef.current = false }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  setIsEditingName(false)
                  autoTitleRef.current = false
                  e.preventDefault()
                }
              }}
            />
          ) : (
            <span
              className="file-name"
              onClick={() => setIsEditingName(true)}
              title="Нажмите, чтобы переименовать"
            >
              {fileName}{isDirty ? '  *' : ''}
            </span>
          )}

          {/* Правая группа */}
          <div className="header-right">
            {/* Т — применить типограф к тексту (⌘T) */}
            <button
              className="btn-icon btn-icon--label"
              onClick={handleApplyTypograf}
              title="Применить типограф (⌘T)"
            >
              Т
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowPreview(true)}
              title="Экспорт"
            >
              <IconExport />
            </button>
            <button
              className={`btn-icon${zenMode ? ' active' : ''}`}
              onClick={() => setZenMode(z => !z)}
              title="Режим Дзен (⌘D)"
            >
              <IconZen />
            </button>
            <button
              className="btn-icon"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title="Сменить тему"
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            {/* ⚙ Настройки — типограф и прочее */}
            <button
              className={`btn-icon${showTypograf ? ' active' : ''}`}
              onClick={() => setShowTypograf(t => !t)}
              title="Настройки"
            >
              <IconSettings />
            </button>
          </div>
        </div>
      )}

      <div className="app-body">
        {/* Боковое меню — оглавление */}
        {showTOC && !zenMode && !showPreview && (
          <TOC editor={editor} onClose={() => setShowTOC(false)} />
        )}

        {/* Редактор — всегда смонтирован, скрыт при превью (иначе editor instance уничтожается) */}
        <div style={{ display: showPreview ? 'none' : 'contents' }}>
          <Editor
            onReady={setEditor}
            onChange={() => setIsDirty(true)}
            zenMode={zenMode}
          />
        </div>

        {/* Панель экспорта / предпросмотра */}
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

        {/* Панель настроек */}
        {showTypograf && !showPreview && (
          <Settings
            typograf={tp}
            typografEnabled={typografEnabled}
            onToggle={handleTypografToggle}
            onClose={() => setShowTypograf(false)}
          />
        )}
      </div>

      {!showPreview && (
        <Toolbar editor={editor} />
      )}

      {/* Выход из дзен-режима */}
      {zenMode && (
        <button
          className="zen-exit"
          onClick={() => setZenMode(false)}
          title="Выйти из Дзен (Esc)"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function IconMenu() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><rect y="2" width="15" height="1.5" rx="0.75"/><rect y="6.75" width="15" height="1.5" rx="0.75"/><rect y="11.5" width="15" height="1.5" rx="0.75"/></svg>
}
function IconExport() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1v9M5 7l3 3 3-3"/><path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"/></svg>
}
function IconZen() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="10" y="1" width="5" height="5" rx="1"/><rect x="1" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1"/></svg>
}
function IconSettings() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 1.5a3 3 0 0 0-2.2 5L2 12.8a.85.85 0 0 0 1.2 1.2L9.5 7.7a3 3 0 0 0 4.1-4.1L11.8 5.4 10.6 4.2l1.8-1.8a3 3 0 0 0-1.9-.9z"/></svg>
}
function IconSun() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><line x1="3" y1="3" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="13" y2="13"/><line x1="13" y1="3" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3" y2="13"/></svg>
}
function IconMoon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6.5 6.5 0 1 0 8 8z"/></svg>
}
