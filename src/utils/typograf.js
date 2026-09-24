import Typograf from 'typograf'

// Типограф приложения: один экземпляр на всё — ⌘⇧T, предпросмотр, выгрузки.
//
// Настройки правил живут здесь же, рядом с экземпляром. Раньше их применяла
// панель настроек, в useEffect, и работали они, только пока панель открыта:
// после перезагрузки типограф возвращался к правилам библиотеки, а галочки
// показывали сохранённое. Со стороны это выглядело так, будто настройки
// не работают вовсе.

// У каждой строки панели `name` — ключ настройки, `rules` — реальные имена
// правил Typograf, которые она включает. Одна галочка может держать сразу
// несколько правил (как «пробел после знаков пунктуации»). Имена сверены
// с Typograf.getRules(): несуществующее имя молча игнорируется библиотекой,
// поэтому опечатка в нем превращает галочку в пустышку.
export const RULE_GROUPS = [
  {
    label: 'Пунктуация',
    rules: [
      { name: 'common/punctuation/delDoublePunctuation', label: 'Удаление двойной пунктуации' },
      { name: 'common/punctuation/quote', label: 'Кавычки правильного вида («елочки» для русского)' },
      { name: 'common/punctuation/apostrophe', label: 'Расстановка правильного апострофа' },
      { name: 'ru/punctuation/exclamation', label: '!! → !', locale: 'ru' },
      { name: 'ru/punctuation/exclamationQuestion', label: '!? → ?!', locale: 'ru' },
      { name: 'common/punctuation/hellip', label: 'Замена трех точек на многоточие' },
    ]
  },
  {
    label: 'Тире и дефис',
    rules: [
      { name: 'ru/dash/main', label: 'Замена дефиса на тире', locale: 'ru' },
      { name: 'ru/dash/directSpeech', label: 'Тире в прямой речи', locale: 'ru' },
      { name: 'ru/dash/years', label: 'Тире в диапазоне лет (2010—2015)', locale: 'ru' },
      { name: 'ru/dash/time', label: 'Тире в диапазоне времени (10:00—11:00)', locale: 'ru' },
    ]
  },
  {
    label: 'Висячие предлоги',
    rules: [
      { name: 'common/nbsp/afterShortWord', label: 'Короткие слова не висят в конце строки' },
      { name: 'common/nbsp/beforeShortLastWord', label: 'Последнее короткое слово не отрывается' },
      { name: 'common/nbsp/beforeShortLastNumber', label: 'Последнее короткое число не отрывается' },
      { name: 'ru/nbsp/beforeParticle', label: 'Частицы «бы», «ли», «же» — неразрывно', locale: 'ru' },
    ]
  },
  {
    label: 'Неразрывный пробел',
    rules: [
      { name: 'ru/nbsp/initials', label: 'Привязка инициалов к фамилии', locale: 'ru' },
      { name: 'ru/nbsp/afterNumberSign', label: 'Нераз. узкий пробел после №', locale: 'ru' },
      { name: 'ru/nbsp/centuries', label: 'Нераз. пробел в «вв.»', locale: 'ru' },
      { name: 'ru/nbsp/year', label: 'Нераз. пробел после г. (2012 г.)', locale: 'ru' },
      { name: 'ru/nbsp/dayMonth', label: 'Нераз. пробел между числом и месяцем', locale: 'ru' },
      { name: 'ru/nbsp/abbr', label: 'Нераз. пробел в сокращениях т. д.', locale: 'ru' },
    ]
  },
  {
    label: 'Пробел и строки',
    rules: [
      { name: 'common/space/delBeforePunctuation', label: 'Удаление пробелов перед знаками пунктуации' },
      {
        name: 'common/space/afterPunctuation',
        label: 'Пробел после знаков пунктуации',
        rules: [
          'common/space/afterColon',
          'common/space/afterComma',
          'common/space/afterExclamationMark',
          'common/space/afterQuestionMark',
          'common/space/afterSemicolon',
        ],
      },
      { name: 'common/space/delRepeatSpace', label: 'Удаление повторяющихся пробелов' },
      { name: 'common/space/trimLeft', label: 'Удаление пробелов в начале текста' },
      { name: 'common/space/trimRight', label: 'Удаление пробелов в конце текста' },
    ]
  },
  {
    label: 'Числа и символы',
    rules: [
      { name: 'ru/number/comma', label: 'Запятая вместо точки в числах с % и ° (3.14% → 3,14%)', locale: 'ru' },
      { name: 'common/number/fraction', label: '1/2 → ½, 1/4 → ¼, 3/4 → ¾' },
      { name: 'common/symbols/copy', label: '(c) → ©, (tm) → ™, (r) → ®' },
      { name: 'ru/symbols/NN', label: '№№ → №', locale: 'ru' },
    ]
  },
  {
    label: 'Опечатки',
    rules: [
      { name: 'ru/typo/switchingKeyboardLayout', label: 'Латинские буквы в русском слове (Bспользуй → Вспользуй)', locale: 'ru' },
    ]
  },
]

export const RULES_KEY = 'typograf-rules'

// Длина неразрывной связки в знаках. Типограф вешает неразрывный пробел
// после каждого короткого слова, и связки сцепляются: «и т. д. на столе» —
// шестнадцать знаков одним неделимым куском, который уезжает на другую
// строку целиком и оставляет дыру. Держим связку короткой: предлог
// с соседним словом, а дальше обычный пробел.
const MAX_CHAIN = 14

const CHAIN = /[^\s\u00A0]+(?:\u00A0[^\s\u00A0]+)+/g

/** Разорвать слишком длинные цепочки неразрывных пробелов. */
export function capNbspChains(text) {
  if (!text.includes('\u00A0')) return text
  return text.replace(CHAIN, run => {
    const parts = run.split('\u00A0')
    let out = parts[0]
    let length = parts[0].length
    for (const part of parts.slice(1)) {
      if (length + 1 + part.length <= MAX_CHAIN) {
        out += `\u00A0${part}`
        length += 1 + part.length
      } else {
        out += ` ${part}`
        length = part.length
      }
    }
    return out
  })
}

/** Типограф во всех местах, где он применяется к тексту. */
export function typografy(html) {
  return capNbspChains(tp.execute(html))
}

// Русский основной, английский вторым: правила ru работают по русскому
// тексту, en — по английскому
export const tp = new Typograf({ locale: ['ru', 'en-US'] })

/** Выключенные пользователем правила: { имя правила: true }. */
export function loadDisabledRules() {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || '{}') } catch { return {} }
}

// Выключенные правила помним и здесь: по ним живая типографика в наборе
// решает, подставлять ли ёлочки и тире (hooks/useLiveTypograf)
let disabledRules = {}

/** Включено ли правило — для тех, кто типографит сам, а не через execute. */
export const isRuleOn = (name) => !disabledRules[name]

/** Привести правила экземпляра в соответствие с настройками. */
export function applyRules(disabled) {
  disabledRules = disabled
  for (const group of RULE_GROUPS) {
    for (const rule of group.rules) {
      for (const name of rule.rules ?? [rule.name]) {
        if (disabled[rule.name]) tp.disableRule(name)
        else tp.enableRule(name)
      }
    }
  }
}

applyRules(loadDisabledRules())
