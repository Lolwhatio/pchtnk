import TypografPanel from './TypografPanel'
import { IconClose } from './icons'
import './Settings.css'

export default function Settings({
  typograf, typografEnabled, onToggle,
  isolationMode, onIsolationToggle,
  onClose,
}) {
  return (
    <div className="settings">
      <div className="settings-header">
        <span className="settings-title">Настройки</span>
        <button className="settings-close" onClick={onClose}><IconClose size={13} /></button>
      </div>

      <div className="settings-body">

        {/* ── Приватность ───────────────────────────── */}
        <div className="settings-section-label">Приватность</div>
        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-name">Режим самоизоляции</span>
            <span className="settings-row-desc">
              Отключает все функции, которые потенциально отправляют текст на внешние серверы
            </span>
          </div>
          <button
            className={`settings-toggle${isolationMode ? ' settings-toggle--on' : ''}`}
            onClick={onIsolationToggle}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>

        {/* ── Типограф ──────────────────────────────── */}
        <div className="settings-section-label">Типограф</div>
        <TypografPanel
          typograf={typograf}
          enabled={typografEnabled}
          onToggle={onToggle}
          onClose={onClose}
          embedded
        />

      </div>
    </div>
  )
}

