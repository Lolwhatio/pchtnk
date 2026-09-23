import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const isElectron = process.env.ELECTRON === '1'

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/',
  define: {
    'import.meta.env.VITE_IS_ELECTRON': JSON.stringify(isElectron ? '1' : ''),
  },
  build: {
    // Шрифты не встраиваем строкой data: — CSP в index.html пускает шрифты
    // только со своего адреса, и самый мелкий кусок JetBrains Mono (2 КБ)
    // иначе молча не загрузился бы
    assetsInlineLimit: (file) => (/\.(woff2?|otf|ttf)$/.test(file) ? false : undefined),
  },
  // Сокращатель ссылок живёт в netlify/functions — в чистом vite dev его нет,
  // и шеринг честно отдаёт полную ссылку. Для локальной проверки функций:
  // npx netlify dev (поднимет vite + функции на одном порту).
})
