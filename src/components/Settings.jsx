import TypografPanel from './TypografPanel'
import { IconClose } from './icons'
import { PALETTES, paletteById } from '../utils/palettes'
import './Settings.css'

// Клик по любому переключателю не должен уводить фокус из редактора.
//
// Иначе получалось так: выбрал ширину колонки — фокус остался на кнопке,
// выделение в тексте никуда не делось, а ⌘C уже обрабатывает не ProseMirror,
// а браузер. Браузер сериализует выделение сам и подставляет каждому тегу
// вычисленные стили — во внешнем документе вместо текста оказывалась каша
// из CSS. Тот же приём стоит на кнопках тулбара.
const keepFocus = (e) => e.preventDefault()

// Выключка строк. По формату — как в книге: обе кромки ровные, а остаток
// строки расходится по межсловным пробелам. Переносы по слогам работают
// в обоих случаях, поэтому пробелы не разъезжаются.
const ALIGNS = [
  { id: 'left',    label: 'По левому краю', hint: 'Правая кромка рваная' },
  { id: 'justify', label: 'По формату',     hint: 'Обе кромки ровные' },
]

// Знаки в строке — не расчёт, а замер: набранный текст в Literata 18px
// с переносами по слогам. Типографская мера — 60–70 знаков; широкая чуть
// шире неё, но Vito выбрал её основной
const WIDTHS = [
  { px: '660', label: 'Узкая',   hint: '~66 знаков' },
  { px: '720', label: 'Широкая', hint: '~73 знака' },
]

function Switch({ on, onToggle, label }) {
  return (
    <button
      className="switch"
      onClick={onToggle}
      onMouseDown={keepFocus}
      role="switch"
      aria-checked={on}
      aria-label={label}
    />
  )
}

export default function Settings({
  typografEnabled, onToggle,
  isolationMode, onIsolationToggle,
  fadeEnabled, onFadeToggle,
  editorWidth, onEditorWidth,
  editorAlign, onEditorAlign,
  theme, onTheme,
  palette, onPalette,
  onClose,
}) {
  const currentLine = paletteById(palette)
  const width = WIDTHS.find(w => w.px === editorWidth)

  return (
    <div className="settings">
      <div className="panel-head">
        <span className="panel-head__title">Настройки</span>
        <button className="btn-icon" onClick={onClose} title="Закрыть" aria-label="Закрыть настройки"><IconClose /></button>
      </div>

      <div className="settings-body">

        {/* ── Вид ───────────────────────────────────
            Тема есть и в шапке, но на телефоне её там нет — поэтому и здесь,
            в одном месте со всеми настройками. Ветка — только здесь. */}
        <div className="settings-section-label">Вид</div>
        <div className="settings-row settings-row--stack">
          <span className="settings-row-name">Тема</span>
          <div className="seg" role="radiogroup" aria-label="Тема">
            {[
              { id: 'dark',  label: 'Темная' },
              { id: 'light', label: 'Светлая' },
            ].map(t => (
              <button
                key={t.id}
                className="seg__opt"
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => onTheme(t.id)}
                onMouseDown={keepFocus}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ветка — вторая ось к теме: каждая есть и в темной, и в светлой.
            Кружки вместо списка названий: линия узнаётся по цвету и номеру
            быстрее, чем читается «Калужско-Рижская». */}
        <div className="settings-row settings-row--stack">
          <div className="settings-row-text">
            <span className="settings-row-name">Ветка</span>
            <span className="settings-row-desc">{currentLine.name}</span>
          </div>
          <div className="settings-lines" role="radiogroup" aria-label="Ветка">
            {PALETTES.map(p => (
              <button
                key={p.id}
                className="settings-line"
                role="radio"
                aria-checked={palette === p.id}
                aria-label={`${p.num} · ${p.name}`}
                title={p.name}
                style={{ '--line': p.color, '--line-fg': p.fg }}
                onClick={() => onPalette(p.id)}
                onMouseDown={keepFocus}
              >
                {p.num}
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
          <Switch on={isolationMode} onToggle={onIsolationToggle} label="Режим самоизоляции" />
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
          <div className="seg seg--wide" role="radiogroup" aria-label="Ширина колонки">
            {WIDTHS.map(w => (
              <button
                key={w.px}
                className="seg__opt"
                role="radio"
                aria-checked={editorWidth === w.px}
                onClick={() => onEditorWidth(w.px)}
                onMouseDown={keepFocus}
                title={w.hint}
              >
                {w.label}
              </button>
            ))}
          </div>
          {width && <span className="settings-row-desc">{width.px} пикселей, {width.hint}</span>}
        </div>
        <div className="settings-row settings-row--stack">
          <div className="settings-row-text">
            <span className="settings-row-name">Выключка</span>
            <span className="settings-row-desc">
              Как кончаются строки. По формату ровные обе кромки — там длинные слова переносятся по слогам, иначе пробелы разъезжаются
            </span>
          </div>
          <div className="seg seg--wide" role="radiogroup" aria-label="Выключка">
            {ALIGNS.map(a => (
              <button
                key={a.id}
                className="seg__opt"
                role="radio"
                aria-checked={editorAlign === a.id}
                onClick={() => onEditorAlign(a.id)}
                onMouseDown={keepFocus}
                title={a.hint}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-name">Прятать панели при наборе</span>
            <span className="settings-row-desc">
              Шапка и нижние панели тают, пока вы печатаете, и возвращаются от движения мыши или Tab. Знак остается
            </span>
          </div>
          <Switch on={fadeEnabled} onToggle={onFadeToggle} label="Прятать панели при наборе" />
        </div>

        {/* ── Типограф ──────────────────────────────── */}
        <div className="settings-section-label">Типограф</div>
        <TypografPanel
          enabled={typografEnabled}
          onToggle={onToggle}
          onClose={onClose}
          embedded
        />

      </div>
    </div>
  )
}
