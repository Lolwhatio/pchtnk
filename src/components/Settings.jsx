import TypografPanel from './TypografPanel'
import { IconClose } from './icons'
import './Settings.css'

export default function Settings({
  typograf, typografEnabled, onToggle,
  isolationMode, onIsolationToggle,
  fadeEnabled, onFadeToggle,
  editorWidth, onEditorWidth,
  theme, onTheme,
  onClose,
}) {
  // Знаки в строке посчитаны для кегля 18px и средней ширины знака
  // кириллицы 9,05px — она на 12,6% шире латиницы
  const WIDTHS = [
    { px: '600', label: 'Узкая',    hint: '66 знаков' },
    { px: '720', label: 'Обычная',  hint: '80 знаков' },
    { px: '840', label: 'Широкая',  hint: '93 знака' },
  ]
  return (
    <div className="settings">
      <div className="settings-header">
        <span className="settings-title">Настройки</span>
        <button className="settings-close" onClick={onClose}><IconClose size={13} /></button>
      </div>

      <div className="settings-body">

        {/* ── Вид ───────────────────────────────────── */}
        <div className="settings-section-label">Вид</div>
        <div className="settings-row settings-row--stack">
          <div className="settings-row-text">
            <span className="settings-row-name">Тема</span>
          </div>
          <div className="settings-seg" role="radiogroup" aria-label="Тема">
            {[
              { id: 'dark',  label: 'Темная' },
              { id: 'light', label: 'Светлая' },
            ].map(t => (
              <button
                key={t.id}
                className={`settings-seg-btn${theme === t.id ? ' settings-seg-btn--on' : ''}`}
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => onTheme(t.id)}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

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
        <div className="settings-row settings-row--stack">
          <div className="settings-row-text">
            <span className="settings-row-name">Ширина колонки</span>
            <span className="settings-row-desc">
              Сколько знаков помещается в строку. Узкая читается легче, широкая вмещает больше
            </span>
          </div>
          <div className="settings-seg" role="radiogroup" aria-label="Ширина колонки">
            {WIDTHS.map(w => (
              <button
                key={w.px}
                className={`settings-seg-btn${editorWidth === w.px ? ' settings-seg-btn--on' : ''}`}
                role="radio"
                aria-checked={editorWidth === w.px}
                onClick={() => onEditorWidth(w.px)}
              >
                <span>{w.label}</span>
                <span className="settings-seg-hint">{w.hint}</span>
              </button>
            ))}
          </div>
        </div>
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

