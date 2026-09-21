// Палитры — ветки метро. Одна тема = одна ветка: сами токены лежат
// в styles/variables.css, здесь только список для интерфейса.
//
// color — цвет ветки, он же акцент темы. fg — номер в кружке (on-accent
// этой ветки): на синей Арбатско-Покровской он белый, на остальных тёмный.
// Значения из спеки — design_handoff_pechatniki/README.md, «Темы по веткам».
//
// id остались прежними, хотя цвета сменились: по ним в localStorage лежит
// выбор человека, и переименование молча сбросило бы его на ветку 10.

export const PALETTES = [
  { id: 'forest',        num: 10, name: 'Люблинско-Дмитровская', color: '#B0D23F', fg: '#0C1510' },
  { id: 'arbatskaya',    num: 3,  name: 'Арбатско-Покровская',   color: '#3C87D0', fg: '#FFFFFF' },
  { id: 'kaluzhskaya',   num: 6,  name: 'Калужско-Рижская',      color: '#EF7F1A', fg: '#1A1006' },
  { id: 'kalininskaya',  num: 8,  name: 'Калининская',           color: '#FFCB31', fg: '#181405' },
  { id: 'koltsevaya',    num: 11, name: 'Большая кольцевая',     color: '#79CDCD', fg: '#071414' },
  { id: 'nekrasovskaya', num: 15, name: 'Некрасовская',          color: '#DE64A1', fg: '#1A0A12' },
]

// Тема по умолчанию живёт в :root и своего блока [data-palette] не имеет:
// атрибут со значением forest просто ни на что не попадает, и включается
// базовая палитра. Отдельный блок был бы её копией и разъезжался бы с ней.
export const DEFAULT_PALETTE = 'forest'

export const isPalette = (id) => PALETTES.some(p => p.id === id)

export const paletteById = (id) => PALETTES.find(p => p.id === id) || PALETTES[0]
