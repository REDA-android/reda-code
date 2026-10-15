import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { EVENT_CHANNELS, INVOKE_CHANNELS, type RendererApi } from '../shared/ipc'

const api: RendererApi = {
  invoke(channel, ...args) {
    if (!INVOKE_CHANNELS.includes(channel)) return Promise.reject(new Error(`Blocked channel ${channel}`))
    return ipcRenderer.invoke(channel, ...args)
  },
  on(channel, listener) {
    if (!EVENT_CHANNELS.includes(channel)) throw new Error(`Blocked channel ${channel}`)
    const handler = (_e: IpcRendererEvent, payload: unknown): void => listener(payload as never)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
