// Картинка в документе — это строка base64 внутри самого документа: своего
// хранилища у Печатников нет, всё живёт в localStorage. Скриншот с ретины
// весит 2–4 МБ, в base64 — на треть больше, и четыре таких вставки уже дают
// документ на 8 МБ, который переписывается целиком при каждом автосохранении.
// Отсюда и «вкладка съела память и перезагрузилась».
//
// Поэтому перед вставкой картинку ужимаем: больше 1600 px по длинной стороне
// в колонке шириной 600–840 px всё равно не видно, а вес падает в десятки раз.

const MAX_DIM = 1600
const JPEG_QUALITY = 0.85

// Векторы и анимацию не трогаем: SVG растеризовать нельзя, у GIF пропадёт
// анимация. Их отдаём как есть.
const PASS_THROUGH = ['image/svg+xml', 'image/gif']

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = reject
  img.src = src
})

// Прозрачность переживёт только PNG, поэтому в JPEG жмём лишь тогда,
// когда прозрачных точек нет.
function hasAlpha(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h)
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true
  return false
}

export async function fileToImageSrc(file) {
  const original = await readFile(file)
  if (PASS_THROUGH.includes(file.type)) return original

  let img
  try { img = await loadImage(original) } catch { return original }

  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)

  const out = hasAlpha(ctx, w, h)
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', JPEG_QUALITY)

  // Пережатие иногда выходит дороже оригинала (мелкие и уже сжатые картинки) —
  // тогда оставляем то, что было
  return out.length < original.length ? out : original
}
