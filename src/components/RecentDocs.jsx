import './RecentDocs.css'

function ago(ts) {
  const diff = Date.now() - ts
  if (diff < 60_000)    return 'только что'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`
  const d = new Date(ts)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Лаунчер недавних документов на пустом холсте.
// visible=false — тает и перестаёт ловить клики (появляется снова, когда
// документ снова опустеет).
export default function RecentDocs({ docs, visible, onSelect }) {
  if (!docs.length) return null
  return (
    <div className={`recent${visible ? '' : ' recent--hidden'}`} aria-hidden={!visible}>
      <div className="recent__label">Продолжить</div>
      <div className="recent__list">
        {docs.map(d => (
          <button key={d.id} className="recent__item" onClick={() => onSelect(d.id)} tabIndex={visible ? 0 : -1}>
            <span className="recent__title">{d.title}</span>
            <span className="recent__time">{ago(d.updatedAt)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
