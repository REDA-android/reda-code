import { useEffect, useState } from 'react'
import type {
  AgentEvent,
  ApprovalRequest,
  ChatMessage,
  Locale,
  Session,
  SessionSummary,
  Settings
} from '@shared/types'
import { LocaleContext, translate } from './i18n'
import { Sidebar } from './components/Sidebar'
import { Chat } from './components/Chat'
import { FileTree } from './components/FileTree'
import { MonacoEditor } from './components/MonacoEditor'
import { TerminalView } from './components/TerminalView'
import { SettingsModal } from './components/SettingsModal'

type PanelTab = 'files' | 'editor' | 'terminal'

export function App(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<PanelTab>('files')
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Agent in-flight state
  const [isRunning, setIsRunning] = useState(false)
  const [streamingDelta, setStreamingDelta] = useState('')
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null)

  const locale: Locale = settings?.locale ?? 'fr'
  const t = (k: Parameters<typeof translate>[1]): string => translate(locale, k)

  // Initial load
  useEffect(() => {
    void window.api.invoke('settings:get').then(setSettings)
    void refreshSessions()
  }, [])

  const refreshSessions = async () => {
    const list = await window.api.invoke('sessions:list')
    setSessions(list)
    if (list.length > 0 && !activeSession) {
      const full = await window.api.invoke('sessions:get', list[0].id)
      if (full) setActiveSession(full)
    }
  }

  // Listen to IPC Agent Events
  useEffect(() => {
    const unlisten = window.api.on('agent:event', (event: AgentEvent) => {
      if (event.type === 'text') {
        setStreamingDelta((prev) => prev + event.delta)
      } else if (event.type === 'tool_start') {
        // Show tool invocation
      } else if (event.type === 'tool_end') {
        // Tool ended
      } else if (event.type === 'approval') {
        setPendingApproval(event.request)
      } else if (event.type === 'error') {
        setIsRunning(false)
        setStreamingDelta('')
        setPendingApproval(null)
        if (activeSession) {
          const updated = { ...activeSession }
          updated.messages.push({
            role: 'assistant',
            content: [{ type: 'text', text: `❌ ${event.error}` }]
          })
          setActiveSession(updated)
        }
      } else if (event.type === 'done') {
        setIsRunning(false)
        setStreamingDelta('')
        setPendingApproval(null)
        if (activeSession) {
          void window.api.invoke('sessions:get', activeSession.id).then((fresh) => {
            if (fresh) setActiveSession(fresh)
          })
        }
        void refreshSessions()
      }
    })
    return () => unlisten()
  }, [activeSession])

  const handleNewSession = async () => {
    const created = await window.api.invoke('sessions:create')
    setSessions((prev) => [created, ...prev])
    setActiveSession(created)
  }

  const handleSelectSession = async (id: string) => {
    const session = await window.api.invoke('sessions:get', id)
    if (session) setActiveSession(session)
  }

  const handleDeleteSession = async (id: string) => {
    await window.api.invoke('sessions:delete', id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSession?.id === id) {
      setActiveSession(null)
    }
  }

  const handleSend = async (text: string) => {
    let sess = activeSession
    if (!sess) {
      sess = await window.api.invoke('sessions:create')
      setActiveSession(sess)
      setSessions((prev) => [sess!, ...prev])
    }

    // Optimistically add user message
    const updatedMessages: ChatMessage[] = [
      ...sess.messages,
      { role: 'user', content: [{ type: 'text', text }] }
    ]
    setActiveSession({ ...sess, messages: updatedMessages })
    setIsRunning(true)
    setStreamingDelta('')

    await window.api.invoke('agent:send', sess.id, text)
  }

  const handleCancel = async () => {
    if (activeSession) {
      await window.api.invoke('agent:cancel', activeSession.id)
      setIsRunning(false)
      setStreamingDelta('')
      setPendingApproval(null)
    }
  }

  const handleApprove = async (id: string) => {
    setPendingApproval(null)
    await window.api.invoke('agent:approve', id, true)
  }

  const handleDeny = async (id: string) => {
    setPendingApproval(null)
    await window.api.invoke('agent:approve', id, false)
  }

  const handleToggleAutoMode = async () => {
    if (!settings) return
    const updated = await window.api.invoke('settings:set', { autoMode: !settings.autoMode })
    setSettings(updated)
  }

  const handlePickWorkspace = async () => {
    const picked = await window.api.invoke('workspace:pick')
    if (picked && settings) {
      setSettings({ ...settings, workspace: picked })
    }
  }

  const handleToggleLocale = async () => {
    if (!settings) return
    const nextLocale = locale === 'fr' ? 'en' : 'fr'
    const updated = await window.api.invoke('settings:set', { locale: nextLocale })
    setSettings(updated)
  }

  const handleUpdateSettings = async (patch: Partial<Settings>) => {
    const updated = await window.api.invoke('settings:set', patch)
    setSettings(updated)
  }

  return (
    <LocaleContext.Provider value={locale}>
      <div className="flex h-full w-full select-none overflow-hidden bg-bg text-fg">
        {/* Left Sidebar */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSession?.id || null}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          locale={locale}
          onToggleLocale={handleToggleLocale}
        />

        {/* Central Chat */}
        <Chat
          messages={activeSession?.messages || []}
          streamingDelta={streamingDelta}
          isRunning={isRunning}
          pendingApproval={pendingApproval}
          settings={settings}
          onSend={handleSend}
          onCancel={handleCancel}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onToggleAutoMode={handleToggleAutoMode}
          onPickWorkspace={handlePickWorkspace}
        />

        {/* Right Workspace Panel */}
        <section className="flex w-[32rem] shrink-0 flex-col border-l border-border bg-surface">
          {/* Tabs header */}
          <div className="flex h-10 items-center justify-between border-b border-border px-3 bg-surface-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'files'
                    ? 'bg-surface text-fg font-semibold shadow-xs'
                    : 'text-muted hover:text-fg'
                }`}
                onClick={() => setActiveTab('files')}
              >
                {t('panel.files')}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'editor'
                    ? 'bg-surface text-fg font-semibold shadow-xs'
                    : 'text-muted hover:text-fg'
                }`}
                onClick={() => setActiveTab('editor')}
              >
                {t('panel.editor')}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'terminal'
                    ? 'bg-surface text-fg font-semibold shadow-xs'
                    : 'text-muted hover:text-fg'
                }`}
                onClick={() => setActiveTab('terminal')}
              >
                {t('panel.terminal')}
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'files' && (
              <FileTree
                workspace={settings?.workspace || null}
                activeFile={activeFile}
                onOpenFile={(path) => {
                  setActiveFile(path)
                  setActiveTab('editor')
                }}
              />
            )}
            {activeTab === 'editor' && <MonacoEditor filePath={activeFile} />}
            {activeTab === 'terminal' && <TerminalView />}
          </div>
        </section>

        {/* Settings Modal */}
        {settings && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </div>
    </LocaleContext.Provider>
  )
}
