import { useCallback, useEffect, useRef, useState } from 'react'

// Состояние знака и подпись статуса рядом с названием документа.
//
// Переходы по спеке: ввод символа → «Печатаете…» (гипножаба); пауза ввода
// 1,5 с → «Сохранено», глаза-купола живут 900 мс и уходят в покой.
// Ошибка записи держится, пока следующая запись не пройдёт. Фоновый
// процесс (проверка орфографии, импорт, архив) — правый глаз-кольцо дышит.
//
// Одна анимация за раз, очередь приоритетов: ошибка → ожидание → набор →
// разовая реакция (купола, подмигивание, взгляд) → покой. Моргание в покое
// капсула ведёт сама.
//
// Запись в хранилище при этом по-прежнему идёт через 600 мс после правки,
// а не через 1,5 с: «Сохранено» — это итог, который показывается, когда
// человек остановился, а не момент записи. Растянуть саму запись значило бы
// дольше держать текст только в памяти вкладки.

const TYPING_IDLE = 1500
const REACTION = { saved: 900, wink: 450, look: 840 }

export function useMascot({ idleStatus = '' } = {}) {
  const [typing, setTyping] = useState(false)
  const [failed, setFailed] = useState(false)
  const [jobs, setJobs] = useState([])            // [{ id, label }] — стек процессов
  const [reaction, setReaction] = useState(null)  // 'saved' | 'wink' | 'look'

  const typingTimer = useRef(null)
  const reactionTimer = useRef(null)
  const failedRef = useRef(false)
  const jobSeq = useRef(0)

  useEffect(() => () => {
    clearTimeout(typingTimer.current)
    clearTimeout(reactionTimer.current)
  }, [])

  const react = useCallback((kind) => {
    clearTimeout(reactionTimer.current)
    setReaction(kind)
    reactionTimer.current = setTimeout(() => setReaction(null), REACTION[kind] ?? 600)
  }, [])

  // Нажатие клавиши, которое меняет текст
  const typed = useCallback(() => {
    setTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      // Обнуляем сразу: по этому рефу saved() узнаёт, идёт ли набор
      typingTimer.current = null
      setTyping(false)
      if (!failedRef.current) react('saved')
    }, TYPING_IDLE)
  }, [react])

  // Итог записи. Пока человек печатает, купола не показываем — покажутся,
  // когда он остановится (см. typed). Правка не с клавиатуры (типограф,
  // кнопка тулбара, вставка) отзывается сразу.
  const saved = useCallback((ok) => {
    failedRef.current = !ok
    setFailed(!ok)
    if (ok && !typingTimer.current) react('saved')
  }, [react])

  // Фоновый процесс: пока идёт, глаз-кольцо дышит, а в статусе — что происходит
  const track = useCallback(async (label, work) => {
    const id = ++jobSeq.current
    setJobs(list => [...list, { id, label }])
    try {
      return await work()
    } finally {
      setJobs(list => list.filter(j => j.id !== id))
    }
  }, [])

  // Переход на другой документ: набор и прошлая ошибка к нему не относятся
  const reset = useCallback(() => {
    clearTimeout(typingTimer.current)
    typingTimer.current = null
    setTyping(false)
    failedRef.current = false
    setFailed(false)
  }, [])

  const job = jobs[jobs.length - 1]

  const eyes =
    failed ? 'error' :
    job ? 'waiting' :
    typing ? 'typing' :
    reaction ?? 'rest'

  const status =
    failed ? 'Не сохранено' :
    job ? job.label :
    typing ? 'Печатаете…' :
    idleStatus

  return { eyes, status, failed, typed, saved, track, react, reset }
}
