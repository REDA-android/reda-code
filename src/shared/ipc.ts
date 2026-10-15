import type {
  AgentEvent,
  FileNode,
  McpStatus,
  ProviderId,
  Session,
  SessionSummary,
  Settings
} from './types'

/** Request/response IPC contract (renderer → main via ipcRenderer.invoke). */
export interface IpcInvokeMap {
  'app:info': () => { version: string; platform: string; encryptionAvailable: boolean }
  'settings:get': () => Settings
  'settings:set': (patch: Partial<Settings>) => Settings
  'keys:set': (provider: ProviderId, key: string) => void
  'keys:status': () => Record<ProviderId, boolean>
  'workspace:pick': () => string | null
  'fs:list': (dir: string) => FileNode[]
  'fs:read': (path: string) => string
  'fs:write': (path: string, content: string) => void
  'sessions:list': () => SessionSummary[]
  'sessions:create': () => Session
  'sessions:get': (id: string) => Session | null
  'sessions:rename': (id: string, title: string) => void
  'sessions:delete': (id: string) => void
  'agent:send': (sessionId: string, text: string) => void
  'agent:cancel': (sessionId: string) => void
  'agent:approve': (requestId: string, approved: boolean) => void
  'terminal:create': (cols: number, rows: number) => { id: string; pty: boolean }
  'terminal:write': (id: string, data: string) => void
  'terminal:resize': (id: string, cols: number, rows: number) => void
  'terminal:kill': (id: string) => void
  'mcp:status': () => McpStatus[]
  'mcp:reload': () => McpStatus[]
}

/** Push events (main → renderer via webContents.send). */
export interface IpcEventMap {
  'agent:event': AgentEvent
  'terminal:data': { id: string; data: string }
  'terminal:exit': { id: string; code: number }
}

export type InvokeChannel = keyof IpcInvokeMap
export type EventChannel = keyof IpcEventMap

export const INVOKE_CHANNELS: readonly InvokeChannel[] = [
  'app:info',
  'settings:get',
  'settings:set',
  'keys:set',
  'keys:status',
  'workspace:pick',
  'fs:list',
  'fs:read',
  'fs:write',
  'sessions:list',
  'sessions:create',
  'sessions:get',
  'sessions:rename',
  'sessions:delete',
  'agent:send',
  'agent:cancel',
  'agent:approve',
  'terminal:create',
  'terminal:write',
  'terminal:resize',
  'terminal:kill',
  'mcp:status',
  'mcp:reload'
]
export const EVENT_CHANNELS: readonly EventChannel[] = ['agent:event', 'terminal:data', 'terminal:exit']

export interface RendererApi {
  invoke<K extends InvokeChannel>(
    channel: K,
    ...args: Parameters<IpcInvokeMap[K]>
  ): Promise<Awaited<ReturnType<IpcInvokeMap[K]>>>
  on<K extends EventChannel>(channel: K, listener: (payload: IpcEventMap[K]) => void): () => void
}
