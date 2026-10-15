import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn, type ChildProcess } from 'node:child_process'
import type { IpcInvokeMap, InvokeChannel } from '../shared/ipc'
import type { FileNode, ProviderId } from '../shared/types'
import { SettingsStore } from '../core/settings'
import { KeyStore } from '../core/keystore'
import { SQLiteStore } from '../core/storage/db'
import { WorkspaceGuard } from '../core/tools/guard'
import { ToolRegistry } from '../core/tools/registry'
import { createProvider } from '../core/providers/factory'
import { runAgentLoop } from '../core/agent/loop'
import { McpManager } from '../core/mcp/client'

type Handler<K extends InvokeChannel> = (
  ...args: Parameters<IpcInvokeMap[K]>
) => ReturnType<IpcInvokeMap[K]> | Promise<Awaited<ReturnType<IpcInvokeMap[K]>>>

export function handle<K extends InvokeChannel>(channel: K, fn: Handler<K>): void {
  ipcMain.handle(channel, (_e, ...args) => fn(...(args as Parameters<IpcInvokeMap[K]>)))
}

let mainWindow: BrowserWindow | null = null
export const getMainWindow = (): BrowserWindow | null => mainWindow

// Active agent cancellations & approvals
const activeAgentControllers: Map<string, AbortController> = new Map()
const pendingApprovals: Map<string, (approved: boolean) => void> = new Map()

// Active terminal processes
const activeTerminals: Map<string, ChildProcess> = new Map()

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
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const userData = app.getPath('userData')
  const settings = new SettingsStore(join(userData, 'settings.json'))
  const keyStore = new KeyStore(join(userData, 'keys.json'))
  const db = new SQLiteStore(join(userData, 'sessions.sqlite'))
  await db.init()

  const guard = new WorkspaceGuard(settings.get().workspace || process.cwd())
  const toolRegistry = new ToolRegistry(guard)
  const mcpManager = new McpManager(toolRegistry)

  // Initialize MCP servers if configured
  void mcpManager.connectAll(settings.get().mcpServers || [])

  // 1. App Info
  handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    encryptionAvailable: true
  }))

  // 2. Settings
  handle('settings:get', () => settings.get())
  handle('settings:set', async (patch) => {
    const updated = settings.set(patch)
    if (patch.workspace) {
      guard.setRoot(patch.workspace)
    }
    if (patch.mcpServers) {
      await mcpManager.connectAll(patch.mcpServers)
    }
    return updated
  })

  // 3. Keys
  handle('keys:set', (provider: ProviderId, key: string) => {
    keyStore.set(provider, key)
  })
  handle('keys:status', () => {
    return {
      anthropic: keyStore.has('anthropic'),
      openai: keyStore.has('openai'),
      gemini: keyStore.has('gemini'),
      groq: keyStore.has('groq'),
      ollama: true
    }
  })

  // 4. Workspace
  handle('workspace:pick', async () => {
    if (!mainWindow) return null
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    const chosen = res.filePaths[0]
    settings.set({ workspace: chosen })
    guard.setRoot(chosen)
    return chosen
  })

  // 5. File System
  handle('fs:list', (dir: string) => {
    const targetDir = guard.resolveSafe(dir || '.')
    try {
      const entries = readdirSync(targetDir)
      const nodes: FileNode[] = []
      for (const entry of entries) {
        if (entry === '.git' || entry === 'node_modules' || entry === 'out' || entry === 'dist') continue
        const full = join(targetDir, entry)
        try {
          const stat = statSync(full)
          nodes.push({
            name: entry,
            path: join(dir || '.', entry),
            dir: stat.isDirectory()
          })
        } catch {
          // ignore stat error
        }
      }
      return nodes.sort((a, b) => (b.dir ? 1 : 0) - (a.dir ? 1 : 0) || a.name.localeCompare(b.name))
    } catch {
      return []
    }
  })

  handle('fs:read', (path: string) => {
    const safePath = guard.resolveSafe(path)
    return readFileSync(safePath, 'utf8')
  })

  handle('fs:write', (path: string, content: string) => {
    const safePath = guard.resolveSafe(path)
    writeFileSync(safePath, content, 'utf8')
  })

  // 6. Sessions
  handle('sessions:list', () => db.listSessions())
  handle('sessions:create', () => db.createSession())
  handle('sessions:get', (id: string) => db.getSession(id))
  handle('sessions:rename', (id: string, title: string) => {
    const session = db.getSession(id)
    if (session) {
      session.title = title
      db.saveSession(session)
    }
  })
  handle('sessions:delete', (id: string) => db.deleteSession(id))

  // 7. Agent Execution
  handle('agent:send', async (sessionId: string, text: string) => {
    const currentSettings = settings.get()
    let session = db.getSession(sessionId)
    if (!session) {
      session = db.createSession(text.slice(0, 30))
    }

    session.messages.push({
      role: 'user',
      content: [{ type: 'text', text }]
    })
    db.saveSession(session)

    const providerId = currentSettings.provider
    const apiKey = keyStore.get(providerId)
    const model = currentSettings.models[providerId]

    const provider = createProvider({
      providerId,
      apiKey,
      settings: currentSettings
    })

    const abortCtrl = new AbortController()
    activeAgentControllers.set(sessionId, abortCtrl)

    void runAgentLoop({
      sessionId,
      provider,
      model,
      messages: session.messages,
      toolRegistry,
      autoMode: currentSettings.autoMode,
      signal: abortCtrl.signal,
      onEvent: (event) => {
        mainWindow?.webContents.send('agent:event', event)
      },
      requestApproval: async (req) => {
        return new Promise<boolean>((resolve) => {
          pendingApprovals.set(req.id, resolve)
        })
      }
    })
      .then((finalMessages) => {
        session!.messages = finalMessages
        db.saveSession(session!)
      })
      .finally(() => {
        activeAgentControllers.delete(sessionId)
      })
  })

  handle('agent:cancel', (sessionId: string) => {
    const ctrl = activeAgentControllers.get(sessionId)
    if (ctrl) {
      ctrl.abort()
      activeAgentControllers.delete(sessionId)
    }
  })

  handle('agent:approve', (requestId: string, approved: boolean) => {
    const resolver = pendingApprovals.get(requestId)
    if (resolver) {
      resolver(approved)
      pendingApprovals.delete(requestId)
    }
  })

  // 8. Terminal
  handle('terminal:create', (_cols: number, _rows: number) => {
    const id = `term_${Date.now()}`
    const isWin = process.platform === 'win32'
    const shellExe = isWin ? 'powershell.exe' : (process.env.SHELL || '/bin/bash')
    const cwd = guard.getRoot()

    const child = spawn(shellExe, [], {
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    })

    activeTerminals.set(id, child)

    child.stdout?.on('data', (data) => {
      mainWindow?.webContents.send('terminal:data', { id, data: data.toString() })
    })

    child.stderr?.on('data', (data) => {
      mainWindow?.webContents.send('terminal:data', { id, data: data.toString() })
    })

    child.on('close', (code) => {
      activeTerminals.delete(id)
      mainWindow?.webContents.send('terminal:exit', { id, code: code ?? 0 })
    })

    return { id, pty: false }
  })

  handle('terminal:write', (id: string, data: string) => {
    const child = activeTerminals.get(id)
    if (child && child.stdin?.writable) {
      child.stdin.write(data)
    }
  })

  handle('terminal:resize', (_id: string, _cols: number, _rows: number) => {
    // Resize handled if PTY available
  })

  handle('terminal:kill', (id: string) => {
    const child = activeTerminals.get(id)
    if (child) {
      child.kill('SIGTERM')
      activeTerminals.delete(id)
    }
  })

  // 9. MCP
  handle('mcp:status', () => mcpManager.getStatus())
  handle('mcp:reload', async () => {
    return mcpManager.connectAll(settings.get().mcpServers || [])
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
