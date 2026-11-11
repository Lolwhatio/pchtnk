import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { IconClose } from './icons'
import { PALETTES } from '../utils/palettes'
import { KB_FONTS, buildKnowledgeBaseHtml, kbRoute, normalizeLook } from '../utils/export'
import { loadKbFonts } from '../utils/kbFonts'
import { fileToImageSrc } from '../utils/images'
import './KbExportDialog.css'

const NO_PROJECT = '__none__'
const STORE_KEY = 'pechatniki-kb-export'
const COVER_KEY = 'pechatniki-kb-cover'

// Оформление запоминаем между выгрузками — это удобство, не данные:
// не прочиталось (приватное окно) — берём умолчания. Картинка шапки —
// отдельным ключом: она тяжёлая, и если хранилище её не примет,
// остальные настройки всё равно сохранятся.
function loadLook() {
  let look = {}, coverImage = null
  try { look = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { /* умолчания */ }
  try { coverImage = localStorage.getItem(COVER_KEY) } catch { /* без картинки */ }
  return normalizeLook({ ...look, coverImage })
}

function Seg({ label, value, options, onChange }) {
  return (
    <div className="seg seg--wide" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.id} className="seg__opt" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ name, desc, on, onToggle }) {
  return (
    <div className="kb-row">
      <div className="kb-row__text">
        <span className="kb-row__name">{name}</span>
        {desc && <span className="kb-row__desc">{desc}</span>}
      </div>
      <button className="switch" role="switch" aria-checked={on} aria-label={name} onClick={onToggle} />
    </div>
  )
}

// Диалог экспорта базы знаний: что выгружать (проекты, название)
// и как это выглядит (оформление в духе настроек страницы Notion),
// справа — живой предпросмотр того самого файла, что скачается.
export default function KbExportDialog({ docs, projects = [], palette, typograf, onConfirm, onClose }) {
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
  const [look, setLook]         = useState(loadLook)
  const set = (patch) => setLook(l => ({ ...l, ...patch }))

  const { coverImage, ...lookRest } = look
  const lookJson = JSON.stringify(lookRest)
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, lookJson) } catch { /* не страшно */ }
  }, [lookJson])
  useEffect(() => {
    try {
      if (coverImage) localStorage.setItem(COVER_KEY, coverImage)
      else localStorage.removeItem(COVER_KEY)
    } catch { /* не влезла — останется до закрытия диалога */ }
  }, [coverImage])

  // Шрифты Печатников для файла — грузим один раз при открытии
  // Пока шрифты грузятся, «Скачать» ждёт: иначе файл ушёл бы без них
  const [fonts, setFonts] = useState({ file: '', preview: '' })
  const [fontsSettled, setFontsSettled] = useState(false)
  useEffect(() => {
    let alive = true
    loadKbFonts()
      .then(f => { if (alive) setFonts(f) })
      .catch(() => { /* наберётся системными */ })
      .finally(() => { if (alive) setFontsSettled(true) })
    return () => { alive = false }
  }, [])

  // Своя картинка в шапку — с устройства. Ужимаем, как картинки в тексте:
  // шире 1600px в шапке не нужно, а файл выгрузки не должен пухнуть
  const fileRef = useRef(null)
  const [coverError, setCoverError] = useState('')
  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setCoverError('Это не картинка'); return }
    try {
      const src = await fileToImageSrc(file)
      setCoverError('')
      set({ cover: 'image', coverImage: src })
    } catch {
      setCoverError('Не получилось открыть картинку')
    }
  }

  // Ветка выгрузки: своя, если выбрана, иначе та, что в приложении
  const linePalette = look.palette && PALETTES.some(p => p.id === look.palette) ? look.palette : palette

  // Автоназвание: ровно один выбранный проект → его имя
  const selectedGroups = groups.filter(g => selected.has(g.id))
  const autoTitle =
    selectedGroups.length === 1 && selectedGroups[0].id !== NO_PROJECT
      ? selectedGroups[0].title
      : ''
  const effectiveTitle = titleDirty ? title : autoTitle

  const selectedDocs = selectedGroups.flatMap(g =>
    g.id === NO_PROJECT ? g.docs : g.docs.map(d => ({ ...d, projectTitle: g.title })))
  const needsTitle   = !effectiveTitle.trim()
  const canExport    = selectedDocs.length > 0 && !needsTitle

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const options = { ...look, palette: linePalette, fontCss: fonts.file }

  const handleConfirm = () => {
    if (!canExport) return
    onConfirm({ docs: selectedDocs, title: effectiveTitle.trim(), options })
  }

  // ── Предпросмотр ─────────────────────────────────────────────────────────
  // Тот же HTML, что уйдёт в файл. Скрипты в рамке не запускаем (sandbox
  // без allow-scripts), поэтому переходы по меню ведём отсюда.
  const previewKey = JSON.stringify([lookRest, linePalette, coverImage?.length, fonts.preview.length, effectiveTitle, [...selected]])
  const deferredKey = useDeferredValue(previewKey)
  const previewHtml = useMemo(() => {
    if (!selectedDocs.length) return ''
    // Скрипт файла в рамке всё равно заблокирован — вырезаем, чтобы
    // браузер не сыпал ошибками в консоль
    return buildKnowledgeBaseHtml(selectedDocs, effectiveTitle.trim() || 'Без названия', typograf, { ...options, fontCss: fonts.preview })
      .replace(/<script>[\s\S]*?<\/script>/, '')
  }, [deferredKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const frameRef = useRef(null)
  const pageRef  = useRef('')  // открытая в предпросмотре страница — держим её при смене оформления
  const handleFrameLoad = () => {
    const d = frameRef.current?.contentDocument
    if (!d) return
    if (pageRef.current) kbRoute(d, pageRef.current, false)
    d.addEventListener('click', (e) => {
      const a = e.target.closest?.('a')
      if (!a) return
      e.preventDefault()  // внешние ссылки из предпросмотра не открываем
      const href = a.getAttribute('href') || ''
      if (!href.startsWith('#')) return
      pageRef.current = href
      kbRoute(d, href)
    })
  }

  return (
    <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog kb-dialog" role="dialog" aria-label="Скачать проект">
        <div className="dialog__header">
          <span className="dialog__title">Скачать проект</span>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть"><IconClose /></button>
        </div>

        <div className="kb-layout">
          <div className="kb-settings">
            <div className="kb-scroll">
              <p className="dialog__desc">
                Один HTML-файл: главная, меню и рабочие ссылки между документами.
                Открывается двойным кликом.
              </p>

              <div className="kb-section">Что выгрузить</div>
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
                <label className="dialog__label" htmlFor="kb-name">Название</label>
                <input
                  id="kb-name"
                  className="field"
                  value={effectiveTitle}
                  onChange={e => { setTitle(e.target.value); setTitleDirty(true) }}
                  placeholder={selectedGroups.length > 1 ? 'Например: Рабочие заметки' : 'Название'}
                />
                <p className="dialog__hint">
                  {!titleDirty && autoTitle
                    ? 'Подставили из проекта — можно поменять.'
                    : 'Попадет на главную, в меню и в имя файла.'}
                </p>
              </div>

              <div className="kb-section">Оформление</div>

              <div className="kb-fonts" role="radiogroup" aria-label="Шрифт">
                {Object.entries(KB_FONTS).map(([id, f]) => (
                  <button
                    key={id}
                    className="kb-font"
                    role="radio"
                    aria-checked={look.font === id}
                    onClick={() => set({ font: id })}
                  >
                    <span className="kb-font__ag" style={{ fontFamily: f.stack }}>Ag</span>
                    <span className="kb-font__name">{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="kb-row kb-row--stack">
                <span className="kb-row__name">Тема</span>
                <Seg
                  label="Тема"
                  value={look.theme}
                  onChange={theme => set({ theme })}
                  options={[
                    { id: 'auto',  label: 'Как у читателя' },
                    { id: 'light', label: 'Светлая' },
                    { id: 'dark',  label: 'Темная' },
                  ]}
                />
              </div>

              <div className="kb-row kb-row--stack">
                <div className="kb-row__text">
                  <span className="kb-row__name">Цвет</span>
                  <span className="kb-row__desc">{PALETTES.find(p => p.id === linePalette)?.name}</span>
                </div>
                <div className="kb-lines" role="radiogroup" aria-label="Цвет">
                  {PALETTES.map(p => (
                    <button
                      key={p.id}
                      className="kb-line"
                      role="radio"
                      aria-checked={linePalette === p.id}
                      aria-label={`${p.num} · ${p.name}`}
                      title={p.name}
                      style={{ '--line': p.color, '--line-fg': p.fg }}
                      onClick={() => set({ palette: p.id })}
                    >
                      {p.num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="kb-row kb-row--stack">
                <span className="kb-row__name">Главная</span>
                <Seg
                  label="Главная"
                  value={look.home}
                  onChange={home => set({ home })}
                  options={[
                    { id: 'list',  label: 'Список' },
                    { id: 'cards', label: 'Карточки' },
                  ]}
                />
              </div>

              <div className="kb-row kb-row--stack">
                <span className="kb-row__name">Шапка</span>
                <Seg
                  label="Шапка"
                  value={look.cover}
                  onChange={cover => cover === 'image' && !look.coverImage ? fileRef.current?.click() : set({ cover })}
                  options={[
                    { id: 'none',  label: 'Нет' },
                    { id: 'color', label: 'Цвет ветки' },
                    { id: 'image', label: 'Картинка' },
                  ]}
                />
                {look.coverImage && (
                  <div className="kb-cover">
                    <img className="kb-cover__thumb" src={look.coverImage} alt="" />
                    <button className="btn btn--sm btn--secondary" onClick={() => fileRef.current?.click()}>Заменить</button>
                    <button className="btn btn--sm btn--ghost" onClick={() => set({ coverImage: null, cover: look.cover === 'image' ? 'none' : look.cover })}>Убрать</button>
                  </div>
                )}
                {!look.coverImage && (
                  <button className="btn btn--sm btn--secondary kb-cover__upload" onClick={() => fileRef.current?.click()}>
                    Загрузить картинку…
                  </button>
                )}
                {coverError && <span className="dialog__error">{coverError}</span>}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleCoverFile} />
              </div>
              <Toggle name="Даты" desc="Когда документ последний раз правили" on={look.dates} onToggle={() => set({ dates: !look.dates })} />
              <Toggle name="Мелкий текст" on={look.small} onToggle={() => set({ small: !look.small })} />
              <Toggle name="Во всю ширину" on={look.wide} onToggle={() => set({ wide: !look.wide })} />
            </div>

            <div className="kb-actions">
              <button className="btn btn--primary btn--block" disabled={!canExport || !fontsSettled} onClick={handleConfirm}>
                Скачать{selectedDocs.length > 0 ? ` (${selectedDocs.length} док.)` : ''}
              </button>
            </div>
          </div>

          <div className="kb-preview" aria-label="Предпросмотр">
            {previewHtml ? (
              <div className="kb-preview__window">
                <iframe
                  ref={frameRef}
                  className="kb-preview__frame"
                  title="Предпросмотр выгрузки"
                  sandbox="allow-same-origin"
                  srcDoc={previewHtml}
                  onLoad={handleFrameLoad}
                />
              </div>
            ) : (
              <p className="kb-preview__empty">Выберите хотя бы один проект — здесь появится, как будет выглядеть файл.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
