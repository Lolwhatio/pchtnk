import { useEffect, useRef } from 'react'

// Общее поведение всех слоёв поверх текста: меню, панелей, диалогов.
//
// Раньше каждый компонент решал это сам и по-разному: выпадающие меню
// слушали только mousedown и на Esc не реагировали вовсе, а Esc в App.jsx
// знал про Дзен, шорткаты, документы и оглавление — но не про экспорт,
// настройки, буфер, сноски и «Поделиться».
//
//   ref          — контейнер слоя; клик вне его закрывает
//   open         — открыт ли слой
//   onClose      — что вызвать при закрытии
//   restoreFocus — вернуть фокус на элемент, с которого слой открыли
//
// Esc обрабатывается на фазе всплытия с проверкой «я самый верхний слой»,
// поэтому при вложенности закрывается только верхний.

const layers = []

export function useDismiss(ref, open, onClose, { restoreFocus = true, closeOnOutside = true } = {}) {
  // Держим свежий onClose в рефе, чтобы подписки не пересоздавались
  // на каждый рендер из-за нового замыкания в пропсе
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const openerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const token = {}
    layers.push(token)
    if (restoreFocus) openerRef.current = document.activeElement

    const isTop = () => layers[layers.length - 1] === token

    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || !isTop()) return
      e.stopPropagation()
      onCloseRef.current?.()
    }

    const onPointerDown = (e) => {
      if (!closeOnOutside || !isTop()) return
      if (ref.current && !ref.current.contains(e.target)) onCloseRef.current?.()
    }

    document.addEventListener('keydown', onKeyDown)
    // pointerdown, а не mousedown: на тач-устройствах mousedown приходит
    // с задержкой после touchstart, и меню успевает «моргнуть»
    document.addEventListener('pointerdown', onPointerDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      const i = layers.indexOf(token)
      if (i !== -1) layers.splice(i, 1)
      const opener = openerRef.current
      if (restoreFocus && opener?.isConnected) opener.focus()
    }
  }, [ref, open, restoreFocus, closeOnOutside])
}

// Навигация стрелками внутри открытого меню.
// items — селектор кнопок; вызывается на контейнере из ref.
export function useMenuKeys(ref, open, itemSelector = 'button:not([disabled])') {
  useEffect(() => {
    if (!open) return
    const el = ref.current
    if (!el) return

    const onKeyDown = (e) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
      const items = [...el.querySelectorAll(itemSelector)]
      if (!items.length) return
      e.preventDefault()
      const i = items.indexOf(document.activeElement)
      const next =
        e.key === 'Home' ? 0 :
        e.key === 'End'  ? items.length - 1 :
        e.key === 'ArrowDown' ? (i + 1 + items.length) % items.length || 0 :
        (i <= 0 ? items.length - 1 : i - 1)
      items[next]?.focus()
    }

    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [ref, open, itemSelector])
}
