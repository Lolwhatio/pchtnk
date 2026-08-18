#!/usr/bin/env node
// Проверка контраста интерфейса по WCAG 2.1.
// Токены читаются прямо из src/styles/variables.css, чтобы проверка не разъезжалась
// с реальными стилями. Падает с ненулевым кодом, если хоть одна пара не проходит.
//
// Запуск: npm run check:contrast

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const CSS = resolve(here, '../src/styles/variables.css')

// ── Цвет ─────────────────────────────────────────────────────────────────────

function parseHex(h) {
  const s = h.trim().replace('#', '')
  const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s
  return [0, 2, 4].map(i => parseInt(full.substr(i, 2), 16))
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const l1 = luminance(a), l2 = luminance(b)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

// ── Разбор variables.css ─────────────────────────────────────────────────────
// Слои повторяют каскад: :root (тёмная по умолчанию) → [data-theme="light"]
// → [data-theme="…"][data-palette="…"]. Палитра задаёт все токены сама,
// но слои всё равно накладываем — так проверка не разойдётся с браузером,
// если однажды палитра станет задавать только часть.

function readBlock(body) {
  const out = {}
  for (const line of body.split('\n')) {
    const d = line.match(/--([\w-]+)\s*:\s*([^;]+);/)
    if (d && d[2].trim().startsWith('#')) out[d[1]] = d[2].trim()
  }
  return out
}

function parseTokens(css) {
  const one = (re) => { const m = css.match(re); return m ? readBlock(m[1]) : {} }

  const dark = one(/:root\s*\{([\s\S]*?)\n\}/)
  const lightOwn = one(/\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)
  const light = { ...dark, ...lightOwn }

  // Палитры: [data-theme="dark|light"][data-palette="id"]
  const palettes = new Map()
  const re = /\[data-theme="(dark|light)"\]\[data-palette="([\w-]+)"\]\s*\{([\s\S]*?)\n\}/g
  for (const m of css.matchAll(re)) {
    const [, theme, id, body] = m
    if (!palettes.has(id)) palettes.set(id, {})
    palettes.get(id)[theme] = { ...(theme === 'light' ? light : dark), ...readBlock(body) }
  }

  return { dark, light, lightOwn, palettes }
}

// ── Список проверок ──────────────────────────────────────────────────────────
// [что, цвет, фон, минимальный контраст]

const CHECKS = [
  ['Значок кнопки в покое',           'text-secondary', 'bg-panel',     3.0],
  ['Значок при наведении',            'text-primary',   'bg-hover',     4.5],
  ['Значок включённой кнопки',        'accent',         'bg-active',    3.0],
  ['Включённая при наведении',        'accent',         'bg-hover',     3.0],
  ['Подложка наведения',              'bg-hover',       'bg-panel',     1.25],
  ['Подложка включённой',             'bg-active',      'bg-panel',     1.40],
  ['Включённая к наведению',          'bg-active',      'bg-hover',     1.07],
  ['Служебный текст на панели',       'text-muted',     'bg-panel',     4.5],
  ['Служебный текст на странице',     'text-muted',     'bg-primary',   4.5],
  ['Второстепенный текст',            'text-secondary', 'bg-panel',     4.5],
  ['Ссылка в тексте',                 'accent',         'bg-primary',   4.5],
  ['Метки H1–H6, маркеры списков',    'accent-dim',     'bg-primary',   3.0],
  ['Зачёркнутый, плейсхолдер',        'text-muted',     'bg-primary',   4.5],
  ['Инлайн-код',                      'text-primary',   'bg-secondary', 4.5],
  ['Цитата',                          'text-secondary', 'bg-primary',   4.5],
  ['Основной текст',                  'text-primary',   'bg-primary',   4.5],
  ['Разделитель к панели',            'border',         'bg-panel',     1.4],
  ['Граница панели к странице',       'border',         'bg-primary',   1.4],
  ['Наведение на акцентную кнопку',   'accent-hover',   'bg-primary',   4.5],
  ['Ошибка на странице',              'danger',         'bg-primary',   4.5],
  ['Ошибка на панели',                'danger',         'bg-panel',     4.5],
  ['Надпись на главной кнопке',       'bg-primary',     'accent',       4.5],
  ['Она же при наведении',            'bg-primary',     'accent-hover', 4.5],
]

// Токены, которые светлая тема обязана переопределять сама:
// без этого она унаследует акцент тёмной темы и провалит контраст.
const MUST_OVERRIDE_IN_LIGHT = ['accent', 'accent-hover', 'accent-dim', 'danger']

// ── Прогон ───────────────────────────────────────────────────────────────────

const css = readFileSync(CSS, 'utf8')
const { dark, light, lightOwn, palettes } = parseTokens(css)

const missing = MUST_OVERRIDE_IN_LIGHT.filter(t => !(t in lightOwn))

const rows = []
let failed = 0

for (const [label, fg, bg, min] of CHECKS) {
  const cell = (theme) => {
    if (!theme[fg] || !theme[bg]) return { v: null }
    return { v: ratio(parseHex(theme[fg]), parseHex(theme[bg])) }
  }
  const d = cell(dark), l = cell(light)
  const ok = d.v != null && l.v != null && d.v >= min && l.v >= min
  if (!ok) failed++
  rows.push({ label, fg, bg, min, dark: d.v, light: l.v, ok })
}

// ── Вывод ────────────────────────────────────────────────────────────────────

const pad = (s, n) => String(s).padEnd(n)
const padS = (s, n) => String(s).padStart(n)
const fmt = v => v == null ? '  —  ' : padS(v.toFixed(2), 5)

console.log('\nПроверка контраста · WCAG 2.1 · ' + CSS.replace(process.cwd() + '/', ''))
console.log('─'.repeat(78))
console.log(pad('Проверка', 32) + pad('цвет / фон', 26) + padS('мин', 5) + padS('тёмн', 7) + padS('светл', 7))
console.log('─'.repeat(78))

for (const r of rows) {
  const mark = r.ok ? ' ' : '✗'
  console.log(
    mark + ' ' + pad(r.label, 30) +
    pad(`${r.fg} / ${r.bg}`, 26) +
    padS(r.min.toFixed(2), 5) +
    padS(fmt(r.dark), 7) +
    padS(fmt(r.light), 7)
  )
}
console.log('─'.repeat(78))

// ── Остальные палитры ────────────────────────────────────────────────────────
// Подробную таблицу печатать двенадцать раз незачем: у палитры те же токены
// и те же пороги, поэтому показываем запас — худшее отношение к своему порогу.
// Меньше единицы значит провал.

let palFailed = 0

if (palettes.size) {
  console.log('\nПалитры · то же дерево проверок')
  console.log('─'.repeat(78))
  console.log(pad('Палитра', 24) + pad('тема', 10) + padS('худший запас', 14) + '  на чём')
  console.log('─'.repeat(78))

  for (const [id, byTheme] of palettes) {
    for (const theme of ['dark', 'light']) {
      const t = byTheme[theme]
      if (!t) { console.log('✗ ' + pad(id, 22) + pad(theme, 10) + padS('нет блока', 14)); palFailed++; continue }

      let worst = { margin: Infinity, label: '' }
      for (const [label, fg, bg, min] of CHECKS) {
        if (!t[fg] || !t[bg]) continue
        const margin = ratio(parseHex(t[fg]), parseHex(t[bg])) / min
        if (margin < worst.margin) worst = { margin, label }
      }
      const ok = worst.margin >= 1
      if (!ok) palFailed++
      console.log(
        (ok ? '  ' : '✗ ') + pad(id, 22) + pad(theme, 10) +
        padS('×' + worst.margin.toFixed(2), 14) + '  ' + worst.label
      )
    }
  }
  console.log('─'.repeat(78))
}

if (missing.length) {
  console.log(`\n✗ Светлая тема не переопределяет: ${missing.map(t => '--' + t).join(', ')}`)
  console.log('  Без этого она наследует акцент тёмной темы.')
}

const problems = failed + palFailed + (missing.length ? 1 : 0)

if (problems === 0) {
  const total = rows.length * (2 + palettes.size * 2)
  console.log(`\n✓ Пройдено ${total} проверок · палитр ${palettes.size + 1} × 2 темы\n`)
  process.exit(0)
}

console.log(`\n✗ Не проходят проверок: ${failed + palFailed}\n`)
process.exit(1)
