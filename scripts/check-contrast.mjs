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
// Нас интересуют два блока: :root (тёмная тема) и [data-theme="light"].
// Светлая наследует всё, что в ней не переопределено.

function parseTokens(css) {
  const block = (re) => {
    const m = css.match(re)
    if (!m) return {}
    const out = {}
    for (const line of m[1].split('\n')) {
      const d = line.match(/--([\w-]+)\s*:\s*([^;]+);/)
      if (d && d[2].trim().startsWith('#')) out[d[1]] = d[2].trim()
    }
    return out
  }
  const dark = block(/:root\s*\{([\s\S]*?)\}/)
  const lightOwn = block(/\[data-theme="light"\]\s*\{([\s\S]*?)\}/)
  return { dark, light: { ...dark, ...lightOwn }, lightOwn }
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
const { dark, light, lightOwn } = parseTokens(css)

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

if (missing.length) {
  console.log(`\n✗ Светлая тема не переопределяет: ${missing.map(t => '--' + t).join(', ')}`)
  console.log('  Без этого она наследует акцент тёмной темы.')
}

const problems = failed + (missing.length ? 1 : 0)

if (problems === 0) {
  console.log(`\n✓ Все ${rows.length} проверок пройдены в обеих темах\n`)
  process.exit(0)
}

console.log(`\n✗ Не проходят проверок: ${failed}\n`)
process.exit(1)
