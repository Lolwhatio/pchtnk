import { useState, useEffect } from 'react'
import { RULE_GROUPS, RULES_KEY, loadDisabledRules, applyRules } from '../utils/typograf'
import './TypografPanel.css'

// Панель настроек типографа: галочки по группам правил. Сами правила
// и их применение живут в utils/typograf.js — иначе настройки работали бы,
// только пока панель открыта.


export default function TypografPanel({ enabled, onToggle, embedded }) {
  const [disabled, setDisabled] = useState(loadDisabledRules)

  useEffect(() => {
    localStorage.setItem(RULES_KEY, JSON.stringify(disabled))
    applyRules(disabled)
  }, [disabled])

  const toggle = (name) => {
    setDisabled(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const reset = () => setDisabled({})

  return (
    <div className={`typograf-panel${embedded ? ' typograf-panel--embedded' : ''}`}>
      <div className="typograf-header">
        <div className="typograf-master">
          <span className="typograf-master__label">Применять при предпросмотре и экспорте</span>
          <button
            className="switch"
            role="switch"
            aria-checked={enabled}
            aria-label="Применять типограф при предпросмотре и экспорте"
            onClick={() => onToggle(!enabled)}
            onMouseDown={e => e.preventDefault()}
          />
        </div>
      </div>

      <div className="typograf-rules">
        {RULE_GROUPS.map(group => (
          <div key={group.label} className="typograf-group">
            <div className="typograf-group-label">{group.label}</div>
            {group.rules.map(rule => (
              <label key={rule.name} className="typograf-rule">
                <input
                  type="checkbox"
                  checked={!disabled[rule.name]}
                  onChange={() => toggle(rule.name)}
                />
                <span>
                  {rule.label}
                  {rule.locale && <em className="rule-locale">RU</em>}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="typograf-footer">
        <button className="btn btn--sm btn--ghost" onClick={reset}>Сбросить настройки</button>
        <a
          href="https://github.com/typograf/typograf"
          target="_blank"
          rel="noopener noreferrer"
          className="typograf-credit"
        >
          typograf
        </a>
      </div>
    </div>
  )
}
