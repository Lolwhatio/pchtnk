#!/usr/bin/env node
// Проверка согласованности набора пиктограмм.
//
// Скрипт проверяет то, что можно проверить статически и достоверно:
// единую сетку, единую толщину обводки, отсутствие текстовых глифов
// и отсутствие иконок, объявленных мимо общего модуля.
//
// Плотность (доля закрашенной площади) статически не считается: честно
// измерить её можно только растеризацией, а она требует браузера.
// Порядок замера — в src/components/icons/README.md.
//
// Запуск: npm run check:icons

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join, relative } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '..')
const ICONS = resolve(ROOT, 'src/components/icons/index.jsx')
const SRC = resolve(ROOT, 'src')

const GRID = '0 0 16 16'
const STROKE = '1.5'

const problems = []
const src = readFileSync(ICONS, 'utf8')

// ── 1. Одна сетка ────────────────────────────────────────────────────────────

const grids = [...src.matchAll(/viewBox="([^"]+)"/g)].map(m => m[1])
const strayGrids = [...new Set(grids.filter(g => g !== GRID))]
if (strayGrids.length) {
  problems.push(`сетки, отличные от «${GRID}»: ${strayGrids.join(', ')}`)
}

// ── 2. Одна толщина ──────────────────────────────────────────────────────────

const strokes = [...src.matchAll(/strokeWidth[:=]\s*["{]?\s*([\d.]+)/g)].map(m => m[1])
const strayStrokes = [...new Set(strokes.filter(s => s !== STROKE))]
if (strayStrokes.length) {
  problems.push(`толщины, отличные от ${STROKE}: ${strayStrokes.join(', ')}`)
}

// ── 3. Никаких текстовых глифов ──────────────────────────────────────────────
// «B» шрифтом Georgia и ««»» сидели на базовой линии текста, а не в оптическом
// центре кнопки, и весили иначе, чем соседние векторные значки.

if (/<text[\s>]/.test(src)) problems.push('в наборе есть <text> — текстовым глифам здесь не место')
if (/fontFamily/.test(src)) problems.push('в наборе есть fontFamily — значит, где-то остался текст')

// ── 4. Иконки объявлены только в общем модуле ────────────────────────────────

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.jsx?$/.test(p)) out.push(p)
  }
  return out
}

const strays = []
for (const file of walk(SRC)) {
  if (file === ICONS) continue
  const code = readFileSync(file, 'utf8')
  for (const m of code.matchAll(/^(?:export\s+)?function (Icon\w+)/gm)) {
    strays.push(`${relative(ROOT, file)} → ${m[1]}`)
  }
}
if (strays.length) {
  problems.push(`иконки объявлены мимо общего модуля:\n    ${strays.join('\n    ')}`)
}

// ── 5. У каждой иконки есть проп size ────────────────────────────────────────

const icons = [...src.matchAll(/export function (Icon\w+)\s*\(([^)]*)\)/g)]
const noSize = icons.filter(m => !/size/.test(m[2])).map(m => m[1])
if (noSize.length) problems.push(`без пропа size: ${noSize.join(', ')}`)

// ── Вывод ────────────────────────────────────────────────────────────────────

console.log(`\nПиктограммы · ${icons.length} шт · ${relative(ROOT, ICONS)}`)
console.log('─'.repeat(60))
console.log(`  сетка              ${GRID}`)
console.log(`  толщина обводки    ${STROKE}`)
console.log(`  текстовых глифов   нет`)
console.log(`  локальных иконок   ${strays.length}`)
console.log('─'.repeat(60))

if (problems.length) {
  for (const p of problems) console.log(`✗ ${p}`)
  console.log('')
  process.exit(1)
}

console.log('\n✓ Набор согласован\n')
