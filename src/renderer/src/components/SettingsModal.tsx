import { useState, useEffect } from 'react'
import type { McpServerConfig, McpStatus, ProviderId, Settings } from '@shared/types'
import { PROVIDER_IDS } from '@shared/types'
import { useTranslation } from '../i18n'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onUpdateSettings: (patch: Partial<Settings>) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}: SettingsModalProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const [provider, setProvider] = useState<ProviderId>(settings.provider)
  const [models, setModels] = useState<Record<ProviderId, string>>({ ...settings.models })
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaBaseUrl)
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<Record<ProviderId, boolean>>({
    anthropic: false,
    openai: false,
    gemini: false,
    groq: false,
    ollama: true
  })
  const [mcpJson, setMcpJson] = useState(JSON.stringify(settings.mcpServers || [], null, 2))
  const [mcpStatuses, setMcpStatuses] = useState<McpStatus[]>([])
  const [savedKeySuccess, setSavedKeySuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      void window.api.invoke('keys:status').then(setKeyStatus)
      void window.api.invoke('mcp:status').then(setMcpStatuses)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return
    await window.api.invoke('keys:set', provider, apiKey.trim())
    setApiKey('')
    setSavedKeySuccess(true)
    setTimeout(() => setSavedKeySuccess(false), 2000)
    setKeyStatus(await window.api.invoke('keys:status'))
  }

  const handleSaveSettings = async () => {
    let parsedMcp: McpServerConfig[]
    try {
      parsedMcp = JSON.parse(mcpJson)
    } catch {
      alert(t('settings.mcpInvalid'))
      return
    }

    onUpdateSettings({
      provider,
      models,
      ollamaBaseUrl: ollamaUrl,
      mcpServers: parsedMcp
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-base font-semibold text-fg">{t('settings.title')}</h2>
          <button className="text-muted hover:text-fg text-lg" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              {t('settings.provider')}
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            >
              {PROVIDER_IDS.map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Model for Selected Provider */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              {t('settings.model')} ({provider.toUpperCase()})
            </label>
            <input
              type="text"
              value={models[provider] || ''}
              onChange={(e) => setModels({ ...models, [provider]: e.target.value })}
              className="input"
            />
          </div>

          {/* API Key */}
          {provider !== 'ollama' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">
                  {t('settings.apiKey')} ({provider.toUpperCase()})
                </label>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    keyStatus[provider]
                      ? 'bg-success/20 text-success'
                      : 'bg-warning/20 text-warning'
                  }`}
                >
                  {keyStatus[provider] ? t('settings.apiKeySet') : t('settings.apiKeyMissing')}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input flex-1"
                />
                <button
                  className="btn-primary text-xs px-3 py-1.5"
                  onClick={() => void handleSaveApiKey()}
                >
                  {savedKeySuccess ? '✓' : t('settings.saveKey')}
                </button>
              </div>
            </div>
          )}

          {/* Ollama URL */}
          {provider === 'ollama' && (
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                {t('settings.ollamaUrl')}
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="input"
              />
            </div>
          )}

          {/* MCP Servers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                {t('settings.mcp')}
              </label>
              {mcpStatuses.length > 0 && (
                <span className="text-xs text-muted">
                  {mcpStatuses.filter((s) => s.connected).length} active
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={mcpJson}
              onChange={(e) => setMcpJson(e.target.value)}
              className="w-full font-mono text-xs rounded-md border border-border bg-surface-2 p-2.5 text-fg outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button className="btn-ghost text-xs px-4 py-2" onClick={onClose}>
            {t('settings.close')}
          </button>
          <button
            className="btn-primary text-xs px-4 py-2 shadow-sm"
            onClick={() => void handleSaveSettings()}
          >
            {t('panel.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
