import { useState, useRef, useEffect } from 'react'
import { IconTrash, IconChevronRight } from './icons'
import './DocsPanel.css'

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

  useEffect(() => {
    if (!showMover) return
    const handler = (e) => { if (!moverRef.current?.contains(e.target)) setShowMover(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMover])

  return (
    <div className={`docs-panel__item${isActive ? ' docs-panel__item--active' : ''}`}>
      <button className="docs-panel__item-main" onClick={() => onSelect(doc.id)}>
        <div className="docs-panel__item-title">{doc.title || 'Без названия'}</div>
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
            <IconFolder />
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
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const commitRename = () => {
    const t = title.trim()
    if (t && t !== project.title) onRenameProject(project.id, t)
    else setTitle(project.title)
    setEditing(false)
  }

  return (
    <div className="docs-panel__project">
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

        <button className="docs-panel__project-add" title="Новый документ в проекте" onClick={() => onNewInProject(project.id)}>
          <IconPlus />
        </button>
        <button className="docs-panel__project-del" title="Удалить проект" onClick={() => {
          if (docs.length === 0 || window.confirm(`Удалить проект «${project.title}»? Документы останутся без проекта.`))
            onDeleteProject(project.id)
        }}>
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
}) {
  const sorted = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)

  // Группируем по проектам
  const byProject = {}
  projects.forEach(p => { byProject[p.id] = [] })
  const noDocs = []
  sorted.forEach(doc => {
    if (doc.projectId && byProject[doc.projectId]) byProject[doc.projectId].push(doc)
    else noDocs.push(doc)
  })

  const canDelete = docs.length > 1

  return (
    <div className="docs-panel">
      <div className="docs-panel__header">
        <span className="docs-panel__title">Документы</span>
        <button className="docs-panel__btn" onClick={() => onNew()} title="Новый документ"><IconPlus /></button>
        <button className="docs-panel__btn" onClick={() => onCreateProject()} title="Новый проект"><IconFolder /></button>
        <button className="docs-panel__btn" onClick={onClose} title="Закрыть"><IconClose /></button>
      </div>

      <div className="docs-panel__list">
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
      </div>

      <div className="docs-panel__footer">
        <button
          className="docs-panel__footer-btn"
          onClick={onExport}
          data-tip="Скачает вообще все записи: каждый документ в Markdown плюс архив для точного восстановления через «Импорт»"
        ><IconExport /> Бэкап</button>
        <button
          className="docs-panel__footer-btn docs-panel__footer-btn--kb"
          onClick={onExportKb}
          data-tip="Соберет выбранные проекты в готовый HTML-сайт с оглавлением и ссылками между документами"
        ><IconGlobe /> База знаний</button>
        <button
          className="docs-panel__footer-btn"
          onClick={onImport}
          data-tip="Восстановит документы из ZIP-бэкапа или добавит .md-файлы из стороннего архива"
        ><IconImport /> Импорт</button>
      </div>
    </div>
  )
}

function IconPlus() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/></svg>
}
function IconClose() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="10" y2="10"/><line x1="10" y1="1" x2="1" y2="10"/></svg>
}
function IconFolder() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3.5A1 1 0 0 1 2 2.5h2.5l1 1.5H10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5Z"/></svg>
}
function IconExport() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 1v7M3.5 5.5 6 8l2.5-2.5"/><path d="M1 9v1.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V9"/></svg>
}
function IconImport() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8V1M3.5 4.5 6 2l2.5 2.5"/><path d="M1 9v1.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V9"/></svg>
}
function IconGlobe() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="5"/><path d="M1 6h10M6 1c-1.5 1.8-2 3-2 5s.5 3.2 2 5M6 1c1.5 1.8 2 3 2 5s-.5 3.2-2 5"/></svg>
}
