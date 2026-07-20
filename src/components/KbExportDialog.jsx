import { useMemo, useState } from 'react'
import { IconClose } from './icons'
import './KbExportDialog.css'

const NO_PROJECT = '__none__'

// Диалог экспорта базы знаний: выбор проектов + название.
// Один выбранный проект — название подставляется из него,
// несколько — просим ввести своё.
export default function KbExportDialog({ docs, projects = [], onConfirm, onClose }) {
  // Группы: каждый проект + «Без проекта» (если такие документы есть)
  const groups = useMemo(() => {
    const byProject = {}
    projects.forEach(p => { byProject[p.id] = [] })
    const orphans = []
    docs.forEach(d => {
      if (d.projectId && byProject[d.projectId]) byProject[d.projectId].push(d)
      else orphans.push(d)
    })
    const list = projects.map(p => ({ id: p.id, title: p.title, docs: byProject[p.id] }))
    if (orphans.length > 0) {
      list.push({
        id: NO_PROJECT,
        title: projects.length > 0 ? 'Без проекта' : 'Все документы',
        docs: orphans,
      })
    }
    return list
  }, [docs, projects])

  // Пустые группы не выбираем — они и не выбираемы (disabled)
  const [selected, setSelected] = useState(() => new Set(groups.filter(g => g.docs.length > 0).map(g => g.id)))
  const [title, setTitle]       = useState('')
  const [titleDirty, setTitleDirty] = useState(false)

  // Автоназвание: ровно один выбранный проект → его имя
  const selectedGroups = groups.filter(g => selected.has(g.id))
  const autoTitle =
    selectedGroups.length === 1 && selectedGroups[0].id !== NO_PROJECT
      ? selectedGroups[0].title
      : ''
  const effectiveTitle = titleDirty ? title : autoTitle

  const selectedDocs = selectedGroups.flatMap(g => g.docs)
  const needsTitle   = !effectiveTitle.trim()
  const canExport    = selectedDocs.length > 0 && !needsTitle

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    if (!canExport) return
    onConfirm({ docs: selectedDocs, title: effectiveTitle.trim() })
  }

  return (
    <div className="kb-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="kb-dialog" role="dialog" aria-label="Экспорт базы знаний">
        <div className="kb-header">
          <span className="kb-title">База знаний</span>
          <button className="kb-close" onClick={onClose}><IconClose size={12} /></button>
        </div>

        <div className="kb-body">
          <p className="kb-desc">
            Соберем выбранные документы в один HTML-файл. Откройте его двойным
            кликом — внутри главная страница, оглавление и рабочие ссылки
            между документами.
          </p>

          <div className="kb-groups">
            {groups.map(g => (
              <label key={g.id} className={`kb-group${g.docs.length === 0 ? ' kb-group--empty' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  disabled={g.docs.length === 0}
                  onChange={() => toggle(g.id)}
                />
                <span className="kb-group-name">{g.title}</span>
                <span className="kb-group-count">{g.docs.length}</span>
              </label>
            ))}
          </div>

          <div className="kb-name">
            <label className="kb-name-label">Название базы знаний</label>
            <input
              className="kb-name-input"
              value={effectiveTitle}
              onChange={e => { setTitle(e.target.value); setTitleDirty(true) }}
              placeholder={selectedGroups.length > 1 ? 'Например: Рабочие заметки' : 'Название'}
            />
            <p className="kb-name-hint">
              {!titleDirty && autoTitle
                ? 'Подставили из проекта — можно поменять.'
                : 'Попадет на главную страницу, в боковое меню и в имя файла.'}
            </p>
          </div>

          <button className="kb-btn" disabled={!canExport} onClick={handleConfirm}>
            Скачать{selectedDocs.length > 0 ? ` (${selectedDocs.length} док.)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
