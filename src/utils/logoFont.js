// Шрифт логотипа — Unifix SP, лежит в src/assets/fonts.
//
// Подключается, только если файл на месте (unifix-sp.otf или .woff2):
// нет файла — сборка не падает, а знак набирается следующим шрифтом
// из --font-logo, то есть Onest. Запас нужен не зря: в репозитории долго
// лежала только демо-версия с лицензией Shareware, и на сайте знак был
// набран Onest.
//
// Через FontFace, а не @font-face в CSS: ссылку на несуществующий файл
// из CSS сборка не простит, а пустой glob — пожалуйста.

const files = import.meta.glob('../assets/fonts/unifix-sp.{otf,woff2}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const LOGO_FONT = 'Unifix SP'

export function loadLogoFont() {
  const url = Object.values(files)[0]
  if (!url || typeof FontFace === 'undefined' || !document.fonts) return
  // Добавленный в document.fonts шрифт ведёт себя как правило @font-face:
  // файл грузится, когда им впервые что-то набрано
  document.fonts.add(new FontFace(LOGO_FONT, `url(${url})`, { display: 'swap' }))
}
