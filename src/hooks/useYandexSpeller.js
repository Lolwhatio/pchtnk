import { useCallback, useRef } from 'react'

const SPELLER_URL = 'https://speller.yandex.net/services/spellservice.json/checkText'

export function useYandexSpeller(editor) {
  const decorationsRef = useRef([])

  const check = useCallback(async () => {
    if (!editor) return
    const text = editor.getText()
    if (!text.trim()) return

    try {
      const params = new URLSearchParams({ text, lang: 'ru,en', format: 'plain' })
      const res = await fetch(`${SPELLER_URL}?${params}`)
      if (!res.ok) return
      const errors = await res.json()

      editor.view.dispatch(
        editor.view.state.tr.setMeta('spellErrors', errors)
      )

      if (errors.length === 0) {
        alert('Ошибок не найдено.')
        return
      }

      const words = errors.map(e => e.word).join(', ')
      const msg = `Возможные ошибки (${errors.length}): ${words}\n\nВ полноценной интеграции ошибки подсвечиваются в тексте.`
      alert(msg)
    } catch (err) {
      console.error('Yandex Speller error:', err)
      alert('Не удалось подключиться к сервису орфографии. Проверьте интернет-соединение.')
    }
  }, [editor])

  return { check }
}
