import { useEffect } from 'react'

// Одна система подсказок на всё приложение.
//
// Раньше их было две: нативный title (задержка около секунды, системное
// оформление, на тач-устройствах не показывается вообще) и собственная
// data-tip в подвале панели документов — заметно лучше, но применённая
// в одном месте из тридцати.
//
// Интерфейс состоит из иконок без подписей, поэтому на телефоне подсказка
// была единственным способом узнать назначение кнопки — и её там не было.
// Здесь она вызывается длинным нажатием.
//
// Работает делегированием: подписываемся один раз на документ и читаем
// title у ближайшего предка. Атрибут снимаем на время показа, иначе поверх
// нашей подсказки всплывёт системная.

const SHOW_DELAY = 350
const LONG_PRESS = 450
const GAP = 8

export function useTooltips() {
  useEffect(() => {
    let el = null          // элемент, для которого показываем
    let tip = null         // сам пузырёк
    let stashed = null     // снятый title
    let showTimer = null
    let pressTimer = null

    const build = (host, text) => {
      tip = document.createElement('div')
      tip.className = 'tooltip'
      tip.setAttribute('role', 'tooltip')
      tip.textContent = text
      document.body.appendChild(tip)

      const r = host.getBoundingClientRect()
      const t = tip.getBoundingClientRect()
      // Под элементом, а если не влезает — над ним
      const below = r.bottom + GAP + t.height <= window.innerHeight
      const top = below ? r.bottom + GAP : r.top - GAP - t.height
      let left = r.left + r.width / 2 - t.width / 2
      left = Math.max(8, Math.min(left, window.innerWidth - t.width - 8))

      tip.style.top = `${Math.round(top)}px`
      tip.style.left = `${Math.round(left)}px`
      tip.classList.add('tooltip--on')
    }

    const hide = () => {
      clearTimeout(showTimer)
      clearTimeout(pressTimer)
      if (el && stashed !== null) { el.setAttribute('title', stashed); stashed = null }
      tip?.remove()
      tip = null
      el = null
    }

    const show = (host) => {
      const text = host.getAttribute('title')
      if (!text) return
      hide()
      el = host
      stashed = text
      // Снимаем title, иначе системная подсказка всплывёт поверх нашей
      host.removeAttribute('title')
      build(host, text)
    }

    const hostOf = (target) => {
      const host = target?.closest?.('[title]')
      return host && document.body.contains(host) ? host : null
    }

    const onOver = (e) => {
      const host = hostOf(e.target)
      if (!host || host === el) return
      clearTimeout(showTimer)
      showTimer = setTimeout(() => show(host), SHOW_DELAY)
    }

    const onOut = (e) => {
      if (!el) return
      if (e.relatedTarget && el.contains(e.relatedTarget)) return
      hide()
    }

    const onTouchStart = (e) => {
      const host = hostOf(e.target)
      if (!host) return
      clearTimeout(pressTimer)
      pressTimer = setTimeout(() => show(host), LONG_PRESS)
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointerdown', hide)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', hide)
    document.addEventListener('touchcancel', hide)
    document.addEventListener('keydown', hide)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('blur', hide)

    return () => {
      hide()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointerdown', hide)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', hide)
      document.removeEventListener('touchcancel', hide)
      document.removeEventListener('keydown', hide)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('blur', hide)
    }
  }, [])
}
