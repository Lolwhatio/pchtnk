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
  server: {
    // Зеркало netlify.toml: сокращатель ссылок в dev-режиме
    proxy: {
      '/api/shorten': {
        target: 'https://is.gd',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/shorten/, '/create.php'),
      },
    },
  },
})
