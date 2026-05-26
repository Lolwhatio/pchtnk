import { useState, useEffect } from 'react'
import './TypografPanel.css'

const RULE_GROUPS = [
  {
    label: 'Пунктуация',
    rules: [
      { name: 'common/punctuation/delDoublePunctuation', label: 'Удаление двойной пунктуации' },
      { name: 'common/punctuation/quote', label: 'Расстановка кавычек правильного вида' },
      { name: 'ru/punctuation/quote', label: 'Русские кавычки «ёлочки»', locale: 'ru' },
      { name: 'common/punctuation/apostrophe', label: 'Расстановка правильного апострофа' },
      { name: 'ru/punctuation/exclamation', label: '!! → !', locale: 'ru' },
      { name: 'ru/punctuation/exclamationQuestion', label: '!? → ?!', locale: 'ru' },
      { name: 'common/punctuation/ellipsis', label: 'Замена трёх точек на многоточие' },
    ]
  },
  {
    label: 'Тире и дефис',
    rules: [
      { name: 'ru/dash/main', label: 'Замена дефиса на тире', locale: 'ru' },
      { name: 'common/symbols/dash', label: 'Замена дефиса на длинное тире' },
      { name: 'ru/dash/directSpeech', label: 'Тире в прямой речи', locale: 'ru' },
    ]
  },
  {
    label: 'Неразрывный пробел',
    rules: [
      { name: 'ru/nbsp/initials', label: 'Привязка инициалов к фамилии', locale: 'ru' },
      { name: 'ru/nbsp/afterNumberSign', label: 'Нераз. узкий пробел после №', locale: 'ru' },
      { name: 'ru/nbsp/centuries', label: 'Нераз. пробел в «вв.»', locale: 'ru' },
      { name: 'ru/nbsp/year', label: 'Нераз. пробел после г. (2012 г.)', locale: 'ru' },
      { name: 'ru/nbsp/monthDay', label: 'Нераз. пробел между числом и месяцем', locale: 'ru' },
      { name: 'ru/nbsp/abbr', label: 'Нераз. пробел в сокращениях т. д.', locale: 'ru' },
    ]
  },
  {
    label: 'Пробел и строки',
    rules: [
      { name: 'common/space/delBeforePunct', label: 'Удаление пробелов перед знаками пунктуации' },
      { name: 'common/space/afterPunct', label: 'Пробел после знаков пунктуации' },
      { name: 'common/space/delRepeatSpace', label: 'Удаление повторяющихся пробелов' },
      { name: 'common/space/trimLeft', label: 'Удаление пробелов в начале текста' },
      { name: 'common/space/trimRight', label: 'Удаление пробелов в конце текста' },
    ]
  },
  {
    label: 'Числа и символы',
    rules: [
      { name: 'ru/number/comma', label: 'Замена точки на запятую в числах', locale: 'ru' },
      { name: 'common/number/fractions', label: '1/2 → ½, 1/4 → ¼, 3/4 → ¾' },
      { name: 'common/symbols/copy', label: '(c) → ©, (tm) → ™, (r) → ®' },
      { name: 'ru/symbols/NN', label: '№№ → №', locale: 'ru' },
    ]
  },
  {
    label: 'Опечатки',
    rules: [
      { name: 'ru/typo/switchingKeyboardLayout', label: 'Замена латинских букв на русские', locale: 'ru' },
    ]
  },
]

const STORAGE_KEY = 'typograf-rules'

function getDefaultDisabled() {
  return {}
}

export default function TypografPanel({ typograf, enabled, onToggle, onClose, embedded }) {
  const [disabled, setDisabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [lang, setLang] = useState('ru')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(disabled))
    for (const group of RULE_GROUPS) {
      for (const rule of group.rules) {
        if (disabled[rule.name]) {
          typograf.disableRule(rule.name)
        } else {
          typograf.enableRule(rule.name)
        }
      }
    }
  }, [disabled])

  const toggle = (name) => {
    setDisabled(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const reset = () => {
    setDisabled({})
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className={`typograf-panel${embedded ? ' typograf-panel--embedded' : ''}`}>
      <div className="typograf-header">
        <label className="typograf-master">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => onToggle(e.target.checked)}
          />
          Применять при предпросмотре
        </label>
        <div className="typograf-lang">
          <span>Язык:</span>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
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
        <button className="typograf-reset" onClick={reset}>Сбросить настройки</button>
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
