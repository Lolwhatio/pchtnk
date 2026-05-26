import TypografPanel from './TypografPanel'
import './Settings.css'

export default function Settings({ typograf, typografEnabled, onToggle, onClose }) {
  return (
    <div className="settings">
      <div className="settings-header">
        <span className="settings-title">Настройки</span>
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-section-label">Типограф</div>
      <TypografPanel
        typograf={typograf}
        enabled={typografEnabled}
        onToggle={onToggle}
        onClose={onClose}
        embedded
      />
    </div>
  )
}
