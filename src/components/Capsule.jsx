import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './Capsule.css'

// Капсула пересадки — знак Печатников. Логотип, маскот и индикатор
// состояния — это один компонент в трёх местах: шапка, статус-бар,
// уведомление. Всё движение интерфейса живёт здесь; больше в приложении
// ничего не двигается (design_handoff_pechatniki/README.md, «Движение»).
//
//   size    — высота капсулы H, от неё считается вся геометрия
//   variant — 'outline' (интерфейс) | 'filled' (основной локап, маскот)
//   slot    — что стоит между глазами: null — перемычка, строка — имя
//   say     — { text, key }: напечатать, подержать 2 с и стереть обратно
//   eyes    — 'rest' | 'typing' | 'saved' | 'waiting' | 'error'
//             | 'wink' | 'look' | 'sleep'
//   tone    — цвет имени в контурной версии: 'ink' | 'muted'
//   intro   — при появлении начать с перемычки и напечатать slot
//   blink   — моргать в покое раз в 4–7 с
//
// Если передан onClick, капсула становится кнопкой.

// Эталонные размеры из спеки. Пропорции «0,44 · H» и прочие соблюдаются
// в таблице не везде — там, где размер проверен в макетах, берём его.
const REFERENCE = {
  124: { eye: 56, bridge: [40, 12], gap: 24, pad: 28, stroke: 5,   font: 44 },
  84:  { eye: 40, bridge: [28, 9],  gap: 16, pad: 22, stroke: 4,   font: 30 },
  68:  { eye: 30, bridge: [22, 8],  gap: 14, pad: 16, stroke: 3,   font: 23 },
  64:  { eye: 30, bridge: [20, 7],  gap: 10, pad: 16, stroke: 2,   font: 23 },
  36:  { eye: 15, bridge: [11, 4],  gap: 11, pad: 13, stroke: 2,   font: 16 },
  24:  { eye: 10, bridge: [8, 3],   gap: 8,  pad: 9,  stroke: 1.5, font: 12 },
  20:  { eye: 9,  bridge: null,     gap: 5,  pad: 5,  stroke: 1.5, font: 9 },
  16:  { eye: 7,  bridge: null,     gap: 3,  pad: 3,  stroke: 1.5, font: 7 },
}

function geometry(H) {
  if (REFERENCE[H]) return REFERENCE[H]
  return {
    eye: Math.round(0.44 * H),
    // Ниже 24px перемычка не читается — остаются два кружка
    bridge: H < 24 ? null : [Math.round(0.31 * H), Math.max(2, Math.round(0.11 * H))],
    gap: Math.round(0.18 * H),
    pad: Math.round(0.36 * H),
    stroke: Math.max(1.5, 0.055 * H),
    font: Math.round(0.44 * H),
  }
}

const TYPE_STEP = 110           // набор и стирание — мс на знак
const HOLD = 2100               // пауза перед стиранием, 2,0–2,2 с
const INTRO_DELAY = 350         // знак успевает появиться, прежде чем заговорить
const BLINK = 130               // моргание
const BLINK_EVERY = [4000, 7000]

const REDUCED = '(prefers-reduced-motion: reduce)'

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.(REDUCED).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCED)
    if (!mq) return
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export default function Capsule({
  size = 36,
  variant = 'outline',
  slot = null,
  say = null,
  eyes = 'rest',
  tone = 'ink',
  intro = false,
  blink = true,
  className = '',
  onClick,
  ...rest
}) {
  const g = geometry(size)
  const reduced = useReducedMotion()

  // ── Слот ────────────────────────────────────────────────────────────────
  // typed — то, что напечатано сейчас. К цели идём по знаку за шаг:
  // если напечатанное — начало цели, допечатываем, иначе стираем.
  // Так «pchtnk» → «1 234 слова» само распадается на стирание и набор,
  // а перемычка возвращается, только когда слот опустел.
  const [typed, setTyped] = useState(() => (intro ? '' : (slot ?? '')))
  const [started, setStarted] = useState(!intro)

  useEffect(() => {
    if (started) return
    const t = setTimeout(() => setStarted(true), INTRO_DELAY)
    return () => clearTimeout(t)
  }, [started])

  // Реплика заводится по смене ключа, а не текста: одну и ту же фразу
  // можно сказать дважды подряд
  const [spoken, setSpoken] = useState({ key: say?.key, text: null })
  if (say?.key !== spoken.key) {
    setSpoken({ key: say?.key, text: say?.text || null })
  }
  const message = spoken.text

  const target = (!started && !reduced) ? '' : (message ?? slot ?? '')
  // «Уменьшить движение»: слот переключается сразу, без посимвольного набора
  const shown = reduced ? target : typed
  const animating = shown !== target

  useEffect(() => {
    if (!animating) return
    const t = setTimeout(() => {
      setTyped(s => (target.startsWith(s) ? target.slice(0, s.length + 1) : s.slice(0, -1)))
    }, TYPE_STEP)
    return () => clearTimeout(t)
  }, [animating, typed, target])

  // Реплика допечатана — держим паузу и отдаём слот обратно
  useEffect(() => {
    if (message == null || shown !== message) return
    const t = setTimeout(() => setSpoken(s => ({ ...s, text: null })), HOLD)
    return () => clearTimeout(t)
  }, [message, shown])

  const speaking = animating || message != null
  const showBridge = shown === '' && !!g.bridge
  const hasSlot = shown !== '' || showBridge

  // Ширина слота — по реальным метрикам шрифта, а не по числу знаков:
  // кириллица в Unifix примерно на 15% шире латиницы. Меряем сам набранный
  // текст и ставим ширину прямо на узел — переход по ширине делает CSS.
  // Шрифт догружается позже первой отрисовки, тогда перемеряем.
  const slotRef = useRef(null)
  const textRef = useRef(null)
  const [fontsTick, setFontsTick] = useState(0)

  useEffect(() => {
    const fonts = document.fonts
    if (!fonts?.addEventListener) return
    const bump = () => setFontsTick(n => n + 1)
    fonts.addEventListener('loadingdone', bump)
    return () => fonts.removeEventListener('loadingdone', bump)
  }, [])

  const bridgeW = g.bridge?.[0]
  useLayoutEffect(() => {
    const slotEl = slotRef.current
    if (!slotEl) return
    const w = showBridge ? bridgeW : textRef.current?.getBoundingClientRect().width
    if (w != null) slotEl.style.width = `${Math.ceil(w)}px`
  }, [shown, speaking, showBridge, bridgeW, fontsTick])

  // ── Моргание ────────────────────────────────────────────────────────────
  // Только в покое и только когда слот молчит: одна анимация за раз.
  // Интервал случайный — иначе моргание читается как таймер.
  const [blinking, setBlinking] = useState(false)
  const canBlink = blink && eyes === 'rest' && !speaking

  useEffect(() => {
    if (!canBlink) return
    const [min, max] = BLINK_EVERY
    let t
    const schedule = () => {
      t = setTimeout(() => {
        setBlinking(true)
        t = setTimeout(() => { setBlinking(false); schedule() }, BLINK)
      }, min + Math.random() * (max - min))
    }
    schedule()
    return () => { clearTimeout(t); setBlinking(false) }
  }, [canBlink])

  // ────────────────────────────────────────────────────────────────────────
  const style = {
    '--H': `${size}px`,
    '--eye': `${g.eye}px`,
    '--gap': `${g.gap}px`,
    '--pad': `${g.pad}px`,
    '--stroke': `${g.stroke}px`,
    '--font': `${g.font}px`,
    ...(g.bridge ? { '--bridge-w': `${g.bridge[0]}px`, '--bridge-h': `${g.bridge[1]}px` } : null),
  }

  const cls = [
    'capsule',
    `capsule--${variant}`,
    `capsule--${tone}`,
    `capsule--eyes-${eyes}`,
    blinking && 'capsule--blink',
    !hasSlot && 'capsule--bare',
    onClick && 'capsule--button',
    className,
  ].filter(Boolean).join(' ')

  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag className={cls} style={style} onClick={onClick} type={onClick ? 'button' : undefined} {...rest}>
      <span className="capsule__eye capsule__eye--l" aria-hidden="true" />
      {hasSlot && (
        <span className="capsule__slot" ref={slotRef} aria-hidden="true">
          {showBridge
            ? <span className="capsule__bridge" />
            : (
              <span className="capsule__text" ref={textRef}>
                {shown}
                {speaking && <span className="capsule__caret" />}
              </span>
            )}
        </span>
      )}
      <span className="capsule__eye capsule__eye--r" aria-hidden="true" />
    </Tag>
  )
}
