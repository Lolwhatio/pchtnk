import { useState, useRef, useEffect, useMemo } from 'react'
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

function snippetOf(doc) {
  const t = plainText(doc.content).replace(/\s+/g, ' ').trim()
  const title = (doc.title || '').trim()
  // Первая строка обычно и есть название — во втором ряду она лишняя
  const rest = title && t.startsWith(title) ? t.slice(title.length).trim() : t
  return rest.slice(0, 70)
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

function DocItem({ doc, isActive, onSelect, onDelete, onMove, projects, canDelete }) {
  const [showMover, setShowMover] = useState(false)
  const moverRef = useRef(null)
  const snippet = snippetOf(doc)

  useDismiss(moverRef, showMover, () => setShowMover(false))

  return (
    <div
      className={`docs-panel__item${isActive ? ' docs-panel__item--active' : ''}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/pechatniki-doc', doc.id)
        e.dataTransfer.effectAllowed = 'move'
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
}

function ProjectSection({ project, docs, currentId, onSelect, onDelete, onDeleteProject, onRenameProject, onNewInProject, onMove, projects, canDelete }) {
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
            {project.title}
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
              projects={projects}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocsPanel({
  docs, projects = [], currentId,
  onSelect, onNew, onDelete, onExport, onExportKb, onImport, onClose,
  onCreateProject, onRenameProject, onDeleteProject, onMoveDoc, onNewInProject,
  pendingDelete, onUndoDelete,
}) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => {
    const list = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)
    const q = query.trim().toLowerCase()
    if (!q) return list
    // Ищем и по названию, и по тексту: половина документов называется одинаково
    return list.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      plainText(d.content).toLowerCase().includes(q)
    )
  }, [docs, query])

  // Группируем по проектам
  const byProject = {}
  projects.forEach(p => { byProject[p.id] = [] })
  const noDocs = []
  sorted.forEach(doc => {
    if (doc.projectId && byProject[doc.projectId]) byProject[doc.projectId].push(doc)
    else noDocs.push(doc)
  })

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
                projects={projects}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}

        {docs.length === 0 && (
          <div className="docs-panel__empty">Нет документов</div>
        )}
        {docs.length > 0 && searching && sorted.length === 0 && (
          <div className="docs-panel__empty">Ничего не нашлось</div>
        )}
      </div>

      {pendingDelete && (
        <div className="docs-panel__undo" role="status">
          <span className="docs-panel__undo-text">{pendingDelete.label}</span>
          <button className="docs-panel__undo-btn" onClick={onUndoDelete}>Вернуть</button>
        </div>
      )}

      <div className="docs-panel__footer">
        <button
          className="docs-panel__footer-btn"
          onClick={onExport}
          data-tip="ZIP со всеми документами: Markdown для чтения, архив для восстановления"
        >Скачать всё</button>
        <button
          className="docs-panel__footer-btn docs-panel__footer-btn--kb"
          onClick={onExportKb}
          data-tip="Выбранные проекты — в один HTML-файл с оглавлением"
        >Собрать базу</button>
        <button
          className="docs-panel__footer-btn"
          onClick={onImport}
          data-tip="ZIP-бэкап, HTML, .docx, Markdown или текст — можно несколько сразу"
        >Загрузить файлы</button>
      </div>
    </div>
  )
}
