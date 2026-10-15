import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ApprovalRequest, ChatMessage, Settings } from '@shared/types'
import { useTranslation } from '../i18n'
import { ApprovalCard } from './ApprovalCard'

interface ChatProps {
  messages: ChatMessage[]
  streamingDelta: string
  isRunning: boolean
  pendingApproval: ApprovalRequest | null
  settings: Settings | null
  onSend: (text: string) => void
  onCancel: () => void
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onToggleAutoMode: () => void
  onPickWorkspace: () => void
}

export function Chat({
  messages,
  streamingDelta,
  isRunning,
  pendingApproval,
  settings,
  onSend,
  onCancel,
  onApprove,
  onDeny,
  onToggleAutoMode,
  onPickWorkspace
}: ChatProps): React.JSX.Element {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingDelta, pendingApproval])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isRunning) {
        onSend(input.trim())
        setInput('')
      }
    }
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-bg">
      {/* Workspace Banner */}
      <div className="flex h-10 items-center justify-between border-b border-border bg-surface px-4 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="text-muted font-medium">Workspace:</span>
          <span className="font-mono text-fg truncate">
            {settings?.workspace || t('chat.noWorkspace')}
          </span>
        </div>
        <button
          className="btn-ghost text-xs px-2 py-1 text-accent hover:text-accent-hover"
          onClick={onPickWorkspace}
        >
          {t('chat.pickWorkspace')}
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingDelta && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center select-none">
            <div className="text-4xl">⚡</div>
            <h1 className="text-xl font-semibold text-fg">{t('chat.welcomeTitle')}</h1>
            <p className="max-w-md text-sm text-muted">{t('chat.welcomeBody')}</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-surface-3 text-fg'
                  : 'bg-surface-2 border border-border text-fg'
              }`}
            >
              {msg.content.map((part, pIdx) => {
                if (part.type === 'text') {
                  return (
                    <div key={pIdx} className="prose prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                    </div>
                  )
                }
                if (part.type === 'tool_call') {
                  return (
                    <div
                      key={pIdx}
                      className="my-1.5 flex items-center gap-2 font-mono text-xs text-muted bg-surface rounded px-2.5 py-1 border border-border"
                    >
                      <span className="text-accent font-semibold">▶ {part.name}</span>
                      <span className="truncate max-w-xs">{JSON.stringify(part.input)}</span>
                    </div>
                  )
                }
                if (part.type === 'tool_result') {
                  return (
                    <div
                      key={pIdx}
                      className={`my-1.5 rounded bg-bg p-2 font-mono text-xs border ${
                        part.isError ? 'border-danger/40 text-danger' : 'border-border text-muted'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-1">
                        {part.name} {part.isError ? '(Error)' : '(Result)'}
                      </div>
                      <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {part.content}
                      </pre>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        ))}

        {/* Streaming Delta */}
        {streamingDelta && (
          <div className="flex flex-col items-start">
            <div className="max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-surface-2 border border-border text-fg">
              <div className="prose prose-invert max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingDelta}</ReactMarkdown>
              </div>
              <div className="inline-block w-2 h-4 ml-1 bg-accent animate-pulse align-middle" />
            </div>
          </div>
        )}

        {/* Pending Approval */}
        {pendingApproval && (
          <ApprovalCard request={pendingApproval} onApprove={onApprove} onDeny={onDeny} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="border-t border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-3">
            <span className="font-medium text-muted">
              {settings?.provider.toUpperCase()} : {settings ? settings.models[settings.provider] : ''}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!settings?.autoMode}
                onChange={onToggleAutoMode}
                className="rounded border-border text-accent focus:ring-0"
              />
              <span className={settings?.autoMode ? 'text-accent font-semibold' : 'text-muted'}>
                {t('chat.autoMode')}
              </span>
            </label>
          </div>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-accent animate-pulse font-medium">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t('chat.thinking')}
            </span>
          )}
        </div>

        <div className="relative flex items-end rounded-lg border border-border bg-surface-2 focus-within:border-accent">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            className="w-full resize-none bg-transparent p-3 text-sm text-fg outline-none placeholder:text-muted"
          />
          <div className="p-2">
            {isRunning ? (
              <button className="btn-danger text-xs px-3 py-1.5" onClick={onCancel}>
                {t('chat.stop')}
              </button>
            ) : (
              <button
                className="btn-primary text-xs px-4 py-1.5 shadow-sm"
                disabled={!input.trim()}
                onClick={() => {
                  if (input.trim()) {
                    onSend(input.trim())
                    setInput('')
                  }
                }}
              >
                {t('chat.send')}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
