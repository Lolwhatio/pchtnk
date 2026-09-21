import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифты — из сборки, а не с Google Fonts: см. --font-* в styles/variables.css
import '@fontsource-variable/onest/wght.css'
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './index.css'
import App from './App.jsx'
import { loadLogoFont } from './utils/logoFont'

loadLogoFont()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
