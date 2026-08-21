import { useState, useRef, useEffect, useMemo, memo } from 'react'
import {
  IconTrash, IconChevronRight, IconPlus, IconClose, IconPencil,
  IconFolderPlus, IconFolderIn,
} from './icons'
import { useDismiss } from '../hooks/useDismiss'
import './DocsPanel.css'

// Первые строки текста — чтобы «Без названия» отличалось от «Без названия».
// content бывает и JSON от TipTap, и HTML-строкой из старых версий.
function plainText(content) {
  if (!content) return ''
  if (typeof content === 'string') return content.replace(/<[^>]+>/g, ' ')
  const out = []
  const walk = (n) => {
    if (!n) return
    if (n.text) out.push(n.text)
    ;(n.content || []).forEach(walk)
  }
  walk(content)
  return out.join(' ')
}

// Текст документа считаем один раз на документ — и для подписи, и для поиска.
//
// Ключ кеша — сам объект документа: документы неизменяемы, при правке
// приходит новый объект, и старая запись обесценивается сама. Раньше дерево
// документа обходили заново и фильтр поиска, и каждая перерисовка строки:
// одно нажатие в поле поиска обходило всю базу целиком, а с открытой панелью
// это повторялось ещё и на каждом автосохранении.
//
// Кеша два, и это не случайно. Подпись — семьдесят знаков, её не жалко
// держать всегда. Текст для поиска — это весь документ целиком, и заводить
// его на каждое автосохранение только ради того, чтобы никто не искал,
// значило бы менять время на память впустую.
const snippetCache = new WeakMap()
const searchCache  = new WeakMap()

function docSnippet(doc) {
  const hit = snippetCache.get(doc)
  if (hit !== undefined) return hit

  const text  = plainText(doc.content).replace(/\s+/g, ' ').trim()
  const title = (doc.title || '').trim()
  // Первая строка обычно и есть название — во втором ряду она лишняя
  const rest  = title && text.startsWith(title) ? text.slice(title.length).trim() : text

  const snippet = rest.slice(0, 70)
  snippetCache.set(doc, snippet)
  return snippet
}

function docSearchText(doc) {
  const hit = searchCache.get(doc)
  if (hit !== undefined) return hit

  const lower = plainText(doc.content).replace(/\s+/g, ' ').toLowerCase()
  searchCache.set(doc, lower)
  return lower
}

function formatDate(ts) {
  const d   = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000)                                         return 'только что'
  if (diff < 3_600_000)                                      return `${Math.floor(diff / 60_000)} мин`
  if (diff < 86_400_000 && d.getDate() === now.getDate())    return `${Math.floor(diff / 3_600_000)} ч`
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) return 'вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Кого тащим — знать нужно уже во время dragover, а dataTransfer.getData
// до броска пуст: браузер отдаёт данные только в drop.
let draggingId = null

// memo здесь не украшение: пока панель открыта, автосохранение обновляет
// список раз в 600 мс, и без него все строки перерисовывались на каждое
// нажатие в редакторе. Пропсы стабильны — обработчики приходят из useCallback,
// документы неизменяемы, — поэтому перерисовывается только изменившаяся строка.
const DocItem = memo(function DocItem({ doc, isActive, onSelect, onDelete, onMove, onReorder, reorderable, projects, canDelete }) {
  const [showMover, setShowMover] = useState(false)
  const [dropEdge, setDropEdge] = useState(null) // null | 'before' | 'after'
  const moverRef = useRef(null)
  const snippet = docSnippet(doc)

  useDismiss(moverRef, showMover, () => setShowMover(false))

  const edgeAt = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    return e.clientY < box.top + box.height / 2 ? 'before' : 'after'
  }

  // Перетаскивание внутри списка можно ловить, только пока список не отфильтрован:
  // в результатах поиска порядок строк не совпадает с настоящим
  const canDrop = (e) =>
    reorderable && draggingId && draggingId !== doc.id &&
    e.dataTransfer.types.includes('text/pechatniki-doc')

  return (
    <div
      className={`docs-panel__item${isActive ? ' docs-panel__item--active' : ''}${dropEdge ? ` docs-panel__item--drop-${dropEdge}` : ''}`}
      draggable
      onDragStart={e => {
        draggingId = doc.id
        e.dataTransfer.setData('text/pechatniki-doc', doc.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={() => { draggingId = null; setDropEdge(null) }}
      // Событие не гасим: подсветка проекта под курсором тоже нужна —
      // она показывает, куда документ переедет
      onDragOver={e => {
        if (!canDrop(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropEdge(edgeAt(e))
      }}
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget)) return
        setDropEdge(null)
      }}
      onDrop={e => {
        if (!canDrop(e)) return
        e.preventDefault()
        e.stopPropagation() // иначе проект следом бросит документ в конец группы
        const id = e.dataTransfer.getData('text/pechatniki-doc')
        setDropEdge(null)
        if (id) onReorder(id, doc.id, edgeAt(e))
      }}
    >
      <button className="docs-panel__item-main" onClick={() => onSelect(doc.id)}>
        <div className="docs-panel__item-title">{doc.title || 'Без названия'}</div>
        {snippet && <div className="docs-panel__item-snippet">{snippet}</div>}
        <div className="docs-panel__item-date">{formatDate(doc.updatedAt)}</div>
      </button>

      <div className="docs-panel__item-actions">
        {/* Кнопка перемещения в проект */}
        <div className="docs-panel__mover-wrap" ref={moverRef}>
          <button
            className="docs-panel__item-btn"
            title="Переместить в проект"
            onClick={() => setShowMover(v => !v)}
          >
            <IconFolderIn />
          </button>
          {showMover && (
            <div className="docs-panel__mover">
              <button
                className={`docs-panel__mover-item${!doc.projectId ? ' docs-panel__mover-item--active' : ''}`}
                onClick={() => { onMove(doc.id, null); setShowMover(false) }}
              >
                Без проекта
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  className={`docs-panel__mover-item${doc.projectId === p.id ? ' docs-panel__mover-item--active' : ''}`}
                  onClick={() => { onMove(doc.id, p.id); setShowMover(false) }}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {canDelete && (
          <button
            className="docs-panel__item-btn docs-panel__item-btn--del"
            onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
            title="Удалить"
          ><IconTrash size={12} /></button>
        )}
      </div>
    </div>
  )
})

// Секция проекта тоже под memo: её список документов приходит стабильным
// (см. useMemo с группировкой ниже), поэтому чужие правки её не трогают.
const ProjectSection = memo(function ProjectSection({ project, docs, currentId, onSelect, onDelete, onDeleteProject, onRenameProject, onNewInProject, onMove, onReorder, reorderable, projects, canDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing]     = useState(false)
  const [title, setTitle]         = useState(project.title)
  const [dragOver, setDragOver]   = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const commitRename = () => {
    const t = title.trim()
    if (t && t !== project.title) onRenameProject(project.id, t)
    else setTitle(project.title)
    setEditing(false)
  }

  return (
    <div
      className={`docs-panel__project${dragOver ? ' docs-panel__project--dragover' : ''}`}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes('text/pechatniki-doc')) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
      }}
      onDragLeave={e => {
        // Игнорируем «уходы» на собственные дочерние элементы
        if (e.currentTarget.contains(e.relatedTarget)) return
        setDragOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const id = e.dataTransfer.getData('text/pechatniki-doc')
        if (id) onMove(id, project.id)
      }}
    >
      <div className="docs-panel__project-header">
        <button className="docs-panel__project-toggle" onClick={() => setCollapsed(c => !c)}>
          <span className={`docs-panel__project-arrow${collapsed ? '' : ' docs-panel__project-arrow--open'}`}><IconChevronRight size={10} /></span>
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="docs-panel__project-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setTitle(project.title); setEditing(false) } }}
          />
        ) : (
          <button className="docs-panel__project-name" onDoubleClick={() => setEditing(true)}>
            <span className="docs-panel__project-label">{project.title}</span>
            <span className="docs-panel__project-count">{docs.length}</span>
          </button>
        )}

        <button className="docs-panel__project-add" title="Переименовать проект" onClick={() => { setTitle(project.title); setEditing(true) }}>
          <IconPencil />
        </button>
        <button className="docs-panel__project-add" title="Новый документ в проекте" onClick={() => onNewInProject(project.id)}>
          <IconPlus />
        </button>
        {/* Без подтверждения: удаление проекта ничего не теряет — документы
            остаются без проекта, — а вернуть его можно кнопкой «Вернуть» */}
        <button
          className="docs-panel__project-del"
          title="Удалить проект"
          aria-label={`Удалить проект «${project.title}»`}
          onClick={() => onDeleteProject(project.id)}
        >
          <IconClose />
        </button>
      </div>

      {!collapsed && (
        <div className="docs-panel__project-docs">
          {docs.length === 0 && (
            <div className="docs-panel__project-empty">Пусто — создайте документ</div>
          )}
          {docs.map(doc => (
            <DocItem
              key={doc.id}
              doc={doc}
              isActive={doc.id === currentId}
              onSelect={onSelect}
              onDelete={onDelete}
              onMove={onMove}
              onReorder={onReorder}
              reorderable={reorderable}
              projects={projects}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export default function DocsPanel({
  docs, projects = [], currentId,
  onSelect, onNew, onDelete, onExport, onExportKb, onImport, onClose,
  onCreateProject, onRenameProject, onDeleteProject, onMoveDoc, onReorderDoc, onNewInProject,
  pendingDelete, onUndoDelete,
}) {
  const [query, setQuery] = useState('')

  // Порядок — тот, что задал пользователь перетаскиванием. Сортировка по дате
  // правки его перебивала: открытый документ всякий раз всплывал наверх.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    // Ищем и по названию, и по тексту: половина документов называется одинаково
    return docs.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      docSearchText(d).includes(q)
    )
  }, [docs, query])

  // Группируем по проектам. Через useMemo — иначе у каждой секции проекта
  // на любую перерисовку панели менялся бы массив документов, и memo на ней
  // не срабатывал бы ни разу.
  const { byProject, noDocs } = useMemo(() => {
    const byProject = {}
    projects.forEach(p => { byProject[p.id] = [] })
    const noDocs = []
    visible.forEach(doc => {
      if (doc.projectId && byProject[doc.projectId]) byProject[doc.projectId].push(doc)
      else noDocs.push(doc)
    })
    return { byProject, noDocs }
  }, [projects, visible])

  const canDelete = docs.length > 1
  const searching = query.trim().length > 0

  return (
    <div className="docs-panel">
      <div className="docs-panel__header">
        <span className="docs-panel__title">Документы</span>
        <button className="docs-panel__btn" onClick={() => onNew()} title="Новый документ"><IconPlus /></button>
        <button className="docs-panel__btn" onClick={() => onCreateProject()} title="Новый проект" aria-label="Новый проект"><IconFolderPlus /></button>
        <button className="docs-panel__btn" onClick={onClose} title="Закрыть" aria-label="Закрыть панель документов"><IconClose /></button>
      </div>

      <div className="docs-panel__search">
        <input
          type="search"
          className="docs-panel__search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по названию и тексту"
          aria-label="Поиск по документам"
        />
      </div>

      <div
        className="docs-panel__list"
        onDragOver={e => {
          // Сброс в «Без проекта» — если бросили мимо конкретного проекта
          if (!e.dataTransfer.types.includes('text/pechatniki-doc')) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={e => {
          e.preventDefault()
          const id = e.dataTransfer.getData('text/pechatniki-doc')
          if (id) onMoveDoc(id, null)
        }}
      >
        {/* Проекты */}
        {projects.map(project => (
          <ProjectSection
            key={project.id}
            project={project}
            docs={byProject[project.id] || []}
            currentId={currentId}
            onSelect={onSelect}
            onDelete={onDelete}
            onDeleteProject={onDeleteProject}
            onRenameProject={onRenameProject}
            onNewInProject={onNewInProject}
            onMove={onMoveDoc}
            onReorder={onReorderDoc}
            reorderable={!searching}
            projects={projects}
            canDelete={canDelete}
          />
        ))}

        {/* Без проекта */}
        {noDocs.length > 0 && (
          <div className="docs-panel__noproj">
            {projects.length > 0 && (
              <div className="docs-panel__noproj-label">Без проекта</div>
            )}
            {noDocs.map(doc => (
              <DocItem
                key={doc.id}
                doc={doc}
                isActive={doc.id === currentId}
                onSelect={onSelect}
                onDelete={onDelete}
                onMove={onMoveDoc}
                onReorder={onReorderDoc}
                reorderable={!searching}
                projects={projects}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}

        {docs.length === 0 && (
          <div className="docs-panel__empty">Нет документов</div>
        )}
        {docs.length > 0 && searching && visible.length === 0 && (
          <div className="docs-panel__empty">Ничего не нашлось</div>
        )}
      </div>

      {pendingDelete && (
        <div className="docs-panel__undo" role="status">
          <span className="docs-panel__undo-text">{pendingDelete.label}</span>
          <button className="docs-panel__undo-btn" onClick={onUndoDelete}>Вернуть</button>
        </div>
      )}

      {/* Столбцом, а не строкой: подписи вроде «Скачать проект» в треть
          ширины панели не помещались и обрезались */}
      <div className="docs-panel__footer">
        <button
          className="docs-panel__footer-btn docs-panel__footer-btn--kb"
          onClick={onExportKb}
          title="Выбранные проекты — в один HTML-файл с оглавлением"
        >Скачать проект</button>
        <button
          className="docs-panel__footer-btn"
          onClick={onExport}
          title="ZIP со всеми документами: Markdown для чтения, архив для восстановления"
        >Бэкап</button>
        <button
          className="docs-panel__footer-btn"
          onClick={onImport}
          title="ZIP-бэкап, HTML, .docx, Markdown или текст — можно несколько сразу"
        >Импорт</button>
      </div>
    </div>
  )
}
