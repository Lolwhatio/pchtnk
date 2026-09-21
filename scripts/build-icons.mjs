#!/usr/bin/env node
// Иконка приложения и фавикон — по спеке, раздел «Иконка и фавикон».
//
// Рисует SVG, растеризует встроенным в macOS sips и собирает .icns через
// iconutil: зависимостей не нужно, но и работает скрипт только на Маке —
// как и десктопная сборка, ради которой он есть.
//
//   public/favicon.svg, favicon-32.png   — вкладка браузера
//   public/apple-touch-icon.png          — закладка на домашнем экране
//   build/icon.svg                       — эталон иконки приложения
//   build/icon.icns                      — иконка для electron-builder
//
// Запуск: npm run icons

import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Цвета знака — не перекрашиваются никогда. Плитка — ветка 10:
// в магазинах публикуется только она.
const EYE_L = '#B0D23F'
const EYE_R = '#46C3D6'
const TILE = '#0F1810'
const STRIPE = '#B0D23F'
const NAME = '#F2F6EF'

// «pchtnk», набранное Unifix SP с трекингом 0,03em и переведённое в контуры:
// растеризатор шрифта не знает, а демо-версию шрифта в репозитории не держим
// (см. src/utils/logoFont.js). Единицы шрифта: em = 1000, ось y вверх.
const WORDMARK = { advance: 4118, xHeight: 700 }
const WORDMARK_PATH = [
  'M364.8 629.4C189.6 629.4 47 486.9 47 311.6V-231.2H163.6V76.9H170.3',
  'C170.3 76.9 240.8 -5.4 363.7 -6.2C364 -6.2 364.5 -6.2 364.8 -6.2',
  'C540.1 -6.2 682.7 136.4 682.7 311.6C682.7 486.9 540.1 629.4 364.8 629.4ZM364.8 110.3',
  'C253.8 110.3 163.5 200.6 163.5 311.6C163.5 422.6 253.8 512.9 364.8 512.9',
  'C475.8 512.9 566.1 422.6 566.1 311.6C566.1 200.6 475.8 110.3 364.8 110.3ZM1286.4 233.2',
  'C1276.3 209.3 1261.8 187.8 1243.3 169.3C1224.8 150.8 1203.2 136.2 1179.3 126.1',
  'C1129.7 105.1 1072.1 105.2 1022.6 126.1C998.6 136.2 977.1 150.8 958.6 169.3',
  'C940.1 187.8 925.6 209.3 915.4 233.3C904.9 258 899.6 284.4 899.6 311.6',
  'C899.6 338.8 904.9 365.2 915.4 389.9C925.6 413.9 940.1 435.4 958.5 453.9',
  'C977.1 472.4 998.6 487 1022.5 497C1072.1 518 1129.7 518 1179.2 497',
  'C1203.2 486.9 1224.7 472.4 1243.2 453.9C1261.7 435.4 1276.2 413.8 1286.4 389.9L1393.7 435.3',
  'C1377.7 473.1 1354.8 507.1 1325.6 536.3C1296.4 565.5 1262.4 588.4 1224.6 604.4',
  'C1146.1 637.6 1055.6 637.6 977.1 604.4C939.3 588.4 905.3 565.5 876.1 536.3',
  'C846.9 507.1 824 473.1 808 435.3C791.4 396.1 783 354.5 783 311.5C783 268.6 791.4 227 808 187.8',
  'C824 149.9 846.9 116 876.1 86.8C905.2 57.6 939.3 34.7 977.1 18.7',
  'C1016.3 2.1 1058 -6.3 1100.9 -6.3C1143.7 -6.3 1185.4 2.2 1224.6 18.7',
  'C1262.5 34.8 1296.5 57.7 1325.6 86.8C1354.8 116 1377.7 150 1393.7 187.9L1286.4 233.2Z',
  'M1852.9 624.4C1852.1 624.4 1851.5 624.3 1850.7 624.3C1728.5 623.1 1658.3 541.3 1658.3 541.3',
  'H1651.6V849H1535V0.5H1651.6V306.5C1651.6 417.5 1741.9 507.8 1852.9 507.8',
  'C1963.8 507.8 2054.1 417.5 2054.1 306.5V0.5H2170.7V306.5C2170.7 481.8 2028.1 624.4 1852.9 624.4Z',
  'M2591.4 606.8H2431.6V843H2315V270.9C2315 118.5 2439 -5.5 2591.4 -5.5V111.1',
  'C2503.3 111.1 2431.6 182.7 2431.6 270.9V490.1H2591.4ZM3024.8 623.4',
  'C2849.6 623.4 2707 480.8 2707 305.6V-0.5H2823.6V305.6C2823.6 416.6 2913.9 506.9 3024.9 506.9',
  'C3135.8 506.9 3226.1 416.6 3226.1 305.6V-0.5H3342.7V305.6C3342.7 480.8 3200.1 623.4 3024.9 623.4',
  'ZM3942.1 295.3C3991.7 345.2 4022.5 414 4022.5 489.8V612.7H3905.9V489.8',
  'C3905.9 401.7 3834.3 330.1 3746.2 330.1H3616.6V849H3500V0.5H3616.6V213.5H3808.2',
  'C3896.2 213.5 3967.9 141.9 3967.9 53.9V0.5H4084.4V53.9C4084.4 157.6 4026.9 248.1 3942.1 295.3Z',
].join('')

const n = (v) => +v.toFixed(2)

// ── Фавикон ─────────────────────────────────────────────────────────────────
// Два кружка на белом, без капсулы и перемычки. Кружки крупнее, чем в знаке:
// 30% стороны при просвете 12,5%. Белый держит цвета на любой полосе вкладок.
function faviconSvg(size, { rounded = true } = {}) {
  const d = size * 0.30
  const gap = size * 0.125
  const cy = size / 2
  const cxL = size / 2 - gap / 2 - d / 2
  const cxR = size / 2 + gap / 2 + d / 2
  const rx = rounded ? size * 0.22 : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${n(rx)}" fill="#FFFFFF"/>
  <circle cx="${n(cxL)}" cy="${n(cy)}" r="${n(d / 2)}" fill="${EYE_L}"/>
  <circle cx="${n(cxR)}" cy="${n(cy)}" r="${n(d / 2)}" fill="${EYE_R}"/>
</svg>
`
}

// ── Иконка приложения ───────────────────────────────────────────────────────
// Плитка, а не капсула. От стороны плитки T: поле 12,5%, глаз 22,5%,
// просвет — половина глаза, радиус 22,5%, полоса ветки сверху 5% во всю
// ширину. Пара глаз смещена вниз на 2% — оптическая поправка на полосу.
// Подпись pchtnk — до 96px включительно, мельче остаются только глаза.
//
// Холст macOS — 1024 с плиткой 824 по центру: так рисуются все иконки
// системы, и плитка во весь холст стояла бы в доке крупнее соседей.
function iconSvg(canvas, { mac = true } = {}) {
  const T = mac ? canvas * 824 / 1024 : canvas
  const o = (canvas - T) / 2
  const R = T * 0.225
  const E = T * 0.225
  const label = canvas >= 96
  const shift = T * 0.02

  // Подпись: кегль 15% плитки, от глаз до верха строчных — 11,8%
  const F = T * 0.151
  const gapToX = T * 0.118
  const groupH = label ? E + gapToX + WORDMARK.xHeight / 1000 * F : E
  const top = o + T / 2 + shift - groupH / 2
  const cy = top + E / 2
  const cxL = o + T / 2 - E / 4 - E / 2
  const cxR = o + T / 2 + E / 4 + E / 2

  let name = ''
  if (label) {
    const s = F / 1000
    const x = o + T / 2 - WORDMARK.advance * s / 2
    const baseline = top + groupH
    name = `\n  <path fill="${NAME}" transform="translate(${n(x)} ${n(baseline)}) scale(${n(s * 1e4) / 1e4} ${-n(s * 1e4) / 1e4})" d="${WORDMARK_PATH}"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  <defs><clipPath id="tile"><rect x="${n(o)}" y="${n(o)}" width="${n(T)}" height="${n(T)}" rx="${n(R)}"/></clipPath></defs>
  <g clip-path="url(#tile)">
    <rect x="${n(o)}" y="${n(o)}" width="${n(T)}" height="${n(T)}" fill="${TILE}"/>
    <rect x="${n(o)}" y="${n(o)}" width="${n(T)}" height="${n(T * 0.05)}" fill="${STRIPE}"/>
  </g>
  <circle cx="${n(cxL)}" cy="${n(cy)}" r="${n(E / 2)}" fill="${EYE_L}"/>
  <circle cx="${n(cxR)}" cy="${n(cy)}" r="${n(E / 2)}" fill="${EYE_R}"/>${name}
</svg>
`
}

// ── Растеризация ────────────────────────────────────────────────────────────

const work = mkdtempSync(join(tmpdir(), 'pechatniki-icons-'))

function png(svg, out) {
  const src = join(work, 'in.svg')
  writeFileSync(src, svg)
  execFileSync('sips', ['-s', 'format', 'png', src, '--out', out], { stdio: 'ignore' })
}

mkdirSync(join(ROOT, 'public'), { recursive: true })
mkdirSync(join(ROOT, 'build'), { recursive: true })

writeFileSync(join(ROOT, 'public/favicon.svg'), faviconSvg(64))
png(faviconSvg(32), join(ROOT, 'public/favicon-32.png'))
// Домашний экран iOS скругляет сам — белый нужен во весь квадрат
png(faviconSvg(180, { rounded: false }), join(ROOT, 'public/apple-touch-icon.png'))

writeFileSync(join(ROOT, 'build/icon.svg'), iconSvg(1024))

// .icns: каждый размер рисуется заново, а не ужимается из 1024 —
// иначе в мелких размерах подпись превратилась бы в грязь
const iconset = join(work, 'icon.iconset')
mkdirSync(iconset)
for (const size of [16, 32, 128, 256, 512]) {
  png(iconSvg(size), join(iconset, `icon_${size}x${size}.png`))
  png(iconSvg(size * 2), join(iconset, `icon_${size}x${size}@2x.png`))
}
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(ROOT, 'build/icon.icns')])

rmSync(work, { recursive: true, force: true })
console.log('✓ public/favicon.svg, favicon-32.png, apple-touch-icon.png · build/icon.svg, icon.icns')
