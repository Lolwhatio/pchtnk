const { app, BrowserWindow, shell } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 21 }, // по центру шапки 57px, по её левому полю
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#F3F4EF', // холст светлой темы — окно не мигает серым до загрузки
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/favicon.svg'),
  })

  win.loadFile(path.join(__dirname, '../dist/index.html'))

  // В полноэкранном режиме macOS прячет кнопки окна — сообщаем странице,
  // чтобы она убрала отступ под них (см. .is-fullscreen в App.css).
  // Хватает одного класса на <html>, preload ради него не нужен.
  const syncFullscreen = () => {
    win.webContents
      .executeJavaScript(`document.documentElement.classList.toggle('is-fullscreen', ${win.isFullScreen()})`)
      .catch(() => {})
  }
  win.on('enter-full-screen', syncFullscreen)
  win.on('leave-full-screen', syncFullscreen)
  win.webContents.on('did-finish-load', syncFullscreen)

  // Открывать внешние ссылки в браузере, не в Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
