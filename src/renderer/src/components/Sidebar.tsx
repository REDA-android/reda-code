import type { SessionSummary } from '@shared/types'
import { useTranslation } from '../i18n'

interface SidebarProps {
  sessions: SessionSummary[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onOpenSettings: () => void
  locale: string
  onToggleLocale: () => void
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  locale,
  onToggleLocale
}: SidebarProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface select-none">
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2 font-bold text-fg tracking-wide text-base">
          <span className="flex h-3 w-3 rounded-full bg-accent animate-pulse" />
          {t('app.name')}
        </div>
        <button
          className="text-xs font-semibold px-2 py-0.5 rounded border border-border hover:bg-surface-2 text-muted hover:text-fg"
          onClick={onToggleLocale}
          title="Toggle language"
        >
          {locale.toUpperCase()}
        </button>
      </div>

      <div className="p-3">
        <button
          className="btn-primary w-full shadow-sm py-2 flex items-center justify-center gap-2"
          onClick={onNewSession}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('sidebar.newChat')}
        </button>
      </div>

      <div className="mt-2 px-4 panel-title">{t('sidebar.sessions')}</div>

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {sessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted text-center italic">{t('sidebar.empty')}</div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                  isActive ? 'bg-surface-2 text-fg font-medium' : 'text-muted hover:bg-surface-2/60 hover:text-fg'
                }`}
              >
                <span className="truncate flex-1 pr-2">{s.title || 'Untitled'}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger rounded hover:bg-surface-3 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(s.id)
                  }}
                  title={t('sidebar.delete')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-border p-3">
        <button
          className="btn-ghost w-full flex items-center justify-center gap-2"
          onClick={onOpenSettings}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('sidebar.settings')}
        </button>
      </div>
    </aside>
  )
}
