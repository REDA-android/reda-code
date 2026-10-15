import { useEffect, useState } from 'react'
import type { FileNode } from '@shared/types'
import { useTranslation } from '../i18n'

interface FileTreeProps {
  workspace: string | null
  activeFile: string | null
  onOpenFile: (path: string) => void
}

export function FileTree({ workspace, activeFile, onOpenFile }: FileTreeProps): React.JSX.Element {
  const { t } = useTranslation()
  const [nodes, setNodes] = useState<FileNode[]>([])

  const loadFiles = async () => {
    if (!workspace) return
    const list = await window.api.invoke('fs:list', '.')
    setNodes(list)
  }

  useEffect(() => {
    if (!workspace) return
    let active = true
    window.api.invoke('fs:list', '.').then((list) => {
      if (active) setNodes(list)
    })
    return () => {
      active = false
    }
  }, [workspace])

  if (!workspace) {
    return (
      <div className="flex-1 p-4 text-xs text-muted text-center italic">
        {t('chat.noWorkspace')}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs">
        <span className="font-semibold text-muted uppercase tracking-wider">{t('panel.files')}</span>
        <button
          className="text-muted hover:text-fg p-1 rounded hover:bg-surface-2"
          onClick={() => void loadFiles()}
          title={t('panel.refresh')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs select-none">
        {nodes.map((node) => {
          const isActive = node.path === activeFile
          return (
            <div
              key={node.path}
              onClick={() => {
                if (!node.dir) onOpenFile(node.path)
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-fg/80 hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <span className="text-muted text-xs">{node.dir ? '📁' : '📄'}</span>
              <span className="truncate">{node.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
