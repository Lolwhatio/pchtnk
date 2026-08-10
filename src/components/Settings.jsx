import TypografPanel from './TypografPanel'
import { IconClose } from './icons'
import './Settings.css'

export default function Settings({
  typograf, typografEnabled, onToggle,
  isolationMode, onIsolationToggle,
  fadeEnabled, onFadeToggle,
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
            role="switch"
            aria-checked={isolationMode}
            aria-label="Режим самоизоляции"
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>

        {/* ── Письмо ────────────────────────────────── */}
        <div className="settings-section-label">Письмо</div>
        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-name">Прятать панели при наборе</span>
            <span className="settings-row-desc">
              Шапка и нижняя панель тают, пока вы печатаете, и возвращаются от движения мыши или Tab
            </span>
          </div>
          <button
            className={`settings-toggle${fadeEnabled ? ' settings-toggle--on' : ''}`}
            onClick={onFadeToggle}
            role="switch"
            aria-checked={fadeEnabled}
            aria-label="Прятать панели при наборе"
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

