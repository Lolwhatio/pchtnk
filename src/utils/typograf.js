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

// Русский основной, английский вторым: правила ru работают по русскому
// тексту, en — по английскому
export const tp = new Typograf({ locale: ['ru', 'en-US'] })

/** Выключенные пользователем правила: { имя правила: true }. */
export function loadDisabledRules() {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || '{}') } catch { return {} }
}

/** Привести правила экземпляра в соответствие с настройками. */
export function applyRules(disabled) {
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
