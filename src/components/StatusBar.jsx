import Capsule from './Capsule'
import { PALETTES, paletteById } from '../utils/palettes'
import './StatusBar.css'

// Статус-бар: сокращённый локап, статус и селектор веток.
//
// Капсула здесь — индикатор: спокойная, не моргает и не повторяет набор
// за капсулой в шапке (одна анимация за раз), оживает только на ошибке.
// По щелчку печатает в слот, сколько написано.

// Щелчок по кружку ветки не должен уводить фокус из редактора — иначе
// выделение в тексте остаётся, а ⌘C достаётся браузеру (см. Settings.jsx)
const keepFocus = (e) => e.preventDefault()

export default function StatusBar({ status, eyes, say, onCapsule, palette, onPalette }) {
  const line = paletteById(palette)

  return (
    <footer className="statusbar">
      <Capsule
        size={24}
        slot="pchtnk"
        tone="muted"
        eyes={eyes === 'error' ? 'error' : 'rest'}
        blink={false}
        say={say}
        onClick={onCapsule}
        onMouseDown={keepFocus}
        title="Сколько написано"
        aria-label="Сколько написано"
      />
      <span className="statusbar__status" role="status">{status}</span>

      <div className="statusbar__lines">
        <span className="statusbar__line-name">{line.name}</span>
        <div className="statusbar__picker" role="radiogroup" aria-label="Ветка">
          {PALETTES.map(p => (
            <button
              key={p.id}
              type="button"
              className="statusbar__dot"
              role="radio"
              aria-checked={p.id === line.id}
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
    </footer>
  )
}
