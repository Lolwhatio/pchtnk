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
// Слои повторяют каскад на <html>, где стоят оба атрибута:
//   :root → [data-theme] → [data-palette] → [data-theme][data-palette]
//   → [data-theme]:is(…палитры…)
// Одинаковая специфичность решается порядком в файле, как и в браузере.
// Значения — сырыми строками: var() и color-mix() считаются уже после
// сборки слоёв, потому что ссылаются на итоговые значения соседей.

function readBlock(body) {
  const out = {}
  // Комментарии вырезаем: в них встречаются двоеточия и точки с запятой
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of clean.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

function parseBlocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks = []
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, ' ')
    blocks.push({ selector, decls: readBlock(m[2]) })
  }
  return blocks
}

// Подходит ли селектор к <html data-theme=theme data-palette=palette>
function matches(selector, theme, palette) {
  if (selector === ':root') return true
  const attrs = [...selector.matchAll(/\[data-(theme|palette)="([\w-]+)"\]/g)]
  const isList = selector.match(/:is\(([^)]*)\)/)
  const own = isList ? attrs.filter(a => !isList[1].includes(a[0])) : attrs
  for (const [, kind, value] of own) {
    if (kind === 'theme' && value !== theme) return false
    if (kind === 'palette' && value !== palette) return false
  }
  if (isList) {
    const options = [...isList[1].matchAll(/\[data-palette="([\w-]+)"\]/g)].map(m => m[1])
    if (!options.includes(palette)) return false
  }
  return own.length > 0 || !!isList
}

const specificity = (selector) => selector === ':root' ? 1 :
  [...selector.replace(/:is\([^)]*\)/, '[x]').matchAll(/\[/g)].length

function tokensFor(blocks, theme, palette) {
  const layers = blocks
    .map((b, order) => ({ ...b, order, spec: specificity(b.selector) }))
    .filter(b => matches(b.selector, theme, palette))
    .sort((a, b) => a.spec - b.spec || a.order - b.order)
  const raw = {}
  for (const l of layers) Object.assign(raw, l.decls)
  return raw
}

// var() и color-mix(in srgb, A p%, B) — ровно то, чем пользуется variables.css
function resolveColor(raw, value, depth = 0) {
  if (depth > 10 || value == null) return null
  const v = value.trim()
  if (v.startsWith('#')) return parseHex(v)
  const ref = v.match(/^var\(--([\w-]+)\)$/)
  if (ref) return resolveColor(raw, raw[ref[1]], depth + 1)
  const mix = v.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/)
  if (mix) {
    const a = resolveColor(raw, mix[1], depth + 1)
    const b = resolveColor(raw, mix[3], depth + 1)
    if (!a || !b) return null // прозрачность в проверку не берём
    const p = parseFloat(mix[2]) / 100
    return a.map((c, i) => c * p + b[i] * (1 - p))
  }
  return null
}

// ── Список проверок ──────────────────────────────────────────────────────────
// [что, цвет, фон, минимальный контраст]
//
// Пороги — WCAG: 4,5 для текста, 3 для крупного текста и графики.
// Пары, которые спека задаёт ниже порога сознательно, сюда не входят,
// а перечислены в конце файла вывода — чтобы о них помнили.

const CHECKS = [
  ['Основной текст',                 'text',         'bg',          4.5],
  ['Заголовки',                      'ink',          'bg',          4.5],
  ['Заголовок панели',               'ink',          'surface',     4.5],
  ['Текст на панели',                'text',         'surface',     4.5],
  ['Второй план на холсте',          'muted',        'bg',          4.5],
  ['Второй план на панели',          'muted',        'surface',     4.5],
  ['Подписи на холсте',              'faint',        'bg',          4.5],
  ['Подписи на панели',              'faint',        'surface',     4.5],
  ['Дата в выбранной строке',        'faint',        'row-active',  4.5],
  ['Выбранная строка списка',        'ink',          'row-active',  4.5],
  ['Строка под курсором',            'text',         'row-active',  4.5],
  ['Ссылка в тексте',                'accent-ink',   'bg',          4.5],
  ['Выбранный пункт меню',           'accent-ink',   'surface',     4.5],
  ['Он же под курсором',             'accent-ink',   'row-active',  4.5],
  ['Инлайн-код',                     'transfer-ink', 'bg',          4.5],
  ['Инлайн-код в цитате',            'transfer-ink', 'surface',     4.5],
  ['Цитата',                         'muted',        'surface',     4.5],
  ['Ошибка на холсте',               'error-ink',    'bg',          4.5],
  ['Ошибка на панели',               'error-ink',    'surface',     4.5],
  ['Символы разметки # и -',         'syntax',       'bg',          3.0],
  ['Надпись на кнопке ветки',        'on-accent',    'accent',      3.0],
  ['Она же под курсором',            'on-accent',    'accent-hover',3.0],
]

// Сознательно ниже порога — решение спеки, а не недосмотр
const KNOWN = [
  'Надпись на primary-кнопке Арбатско-Покровской: белый на #3C87D0 — 3,8:1, ниже 4,5 для текста 14px',
  'Цвет ветки и пересадки на светлой бумаге (точки, линия, кольца) — 1,4–3,6:1: спека не меняет их в светлой теме',
  'Границы (border, border-soft) — 1,2–1,5:1: это разделители, не текст',
]

// ── Прогон ───────────────────────────────────────────────────────────────────

const css = readFileSync(CSS, 'utf8')
const blocks = parseBlocks(css)

const palettes = ['forest', ...new Set(
  [...css.matchAll(/\[data-palette="([\w-]+)"\]/g)].map(m => m[1])
)]

function run(theme, palette) {
  const raw = tokensFor(blocks, theme, palette)
  return CHECKS.map(([label, fg, bg, min]) => {
    const a = resolveColor(raw, raw[fg]), b = resolveColor(raw, raw[bg])
    const v = a && b ? ratio(a, b) : null
    return { label, fg, bg, min, v, ok: v != null && v >= min }
  })
}

// ── Вывод ────────────────────────────────────────────────────────────────────

const pad = (s, n) => String(s).padEnd(n)
const padS = (s, n) => String(s).padStart(n)
const fmt = v => v == null ? '  —  ' : padS(v.toFixed(2), 5)

const dark = run('dark', 'forest')
const light = run('light', 'forest')
let failed = 0

console.log('\nПроверка контраста · WCAG 2.1 · ' + CSS.replace(process.cwd() + '/', ''))
console.log('Ветка 10, темная и светлая')
console.log('─'.repeat(80))
console.log(pad('Проверка', 32) + pad('цвет / фон', 28) + padS('мин', 5) + padS('тёмн', 7) + padS('светл', 7))
console.log('─'.repeat(80))
dark.forEach((d, i) => {
  const l = light[i]
  const ok = d.ok && l.ok
  if (!ok) failed++
  console.log(
    (ok ? '  ' : '✗ ') + pad(d.label, 30) +
    pad(`${d.fg} / ${d.bg}`, 28) +
    padS(d.min.toFixed(2), 5) + padS(fmt(d.v), 7) + padS(fmt(l.v), 7)
  )
})
console.log('─'.repeat(80))

// Остальные ветки: подробную таблицу печатать десять раз незачем — показываем
// запас, то есть худшее отношение к своему порогу. Меньше единицы — провал.
console.log('\nВетки · то же дерево проверок')
console.log('─'.repeat(80))
console.log(pad('Ветка', 24) + pad('тема', 10) + padS('худший запас', 14) + '  на чём')
console.log('─'.repeat(80))
for (const palette of palettes.slice(1)) {
  for (const theme of ['dark', 'light']) {
    const rows = run(theme, palette)
    const worst = rows.reduce((w, r) => {
      const m = r.v == null ? 0 : r.v / r.min
      return m < w.m ? { m, label: r.label } : w
    }, { m: Infinity, label: '' })
    const ok = worst.m >= 1
    if (!ok) failed++
    console.log((ok ? '  ' : '✗ ') + pad(palette, 22) + pad(theme, 10) + padS('×' + worst.m.toFixed(2), 14) + '  ' + worst.label)
  }
}
console.log('─'.repeat(80))

console.log('\nНиже порога по решению спеки:')
for (const k of KNOWN) console.log('  · ' + k)

if (failed === 0) {
  const total = CHECKS.length * palettes.length * 2
  console.log(`\n✓ Пройдено ${total} проверок · веток ${palettes.length} × 2 темы\n`)
  process.exit(0)
}

console.log(`\n✗ Не проходят проверок: ${failed}\n`)
process.exit(1)
