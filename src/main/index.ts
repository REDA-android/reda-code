import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import type { IpcInvokeMap, InvokeChannel } from '../shared/ipc'
import { SettingsStore } from '../core/settings'

type Handler<K extends InvokeChannel> = (
  ...args: Parameters<IpcInvokeMap[K]>
) => ReturnType<IpcInvokeMap[K]> | Promise<Awaited<ReturnType<IpcInvokeMap[K]>>>

export function handle<K extends InvokeChannel>(channel: K, fn: Handler<K>): void {
  ipcMain.handle(channel, (_e, ...args) => fn(...(args as Parameters<IpcInvokeMap[K]>)))
}

let mainWindow: BrowserWindow | null = null
export const getMainWindow = (): BrowserWindow | null => mainWindow

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0d0f12',
    title: 'reda-code',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env['ELECTRON_RENDERER_URL']) void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  const settings = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
  handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    encryptionAvailable: false
  }))
  handle('settings:get', () => settings.get())
  handle('settings:set', (patch) => settings.set(patch))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
