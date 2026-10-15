import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useTranslation } from '../i18n'

interface MonacoEditorProps {
  filePath: string | null
}

export function MonacoEditor({ filePath }: MonacoEditorProps): React.JSX.Element {
  const { t } = useTranslation()
  const [content, setContent] = useState<string>('')
  const [isSaved, setIsSaved] = useState<boolean>(true)

  useEffect(() => {
    if (!filePath) {
      setContent('')
      return
    }
    void window.api.invoke('fs:read', filePath).then((text) => {
      setContent(text)
      setIsSaved(true)
    })
  }, [filePath])

  const handleSave = async () => {
    if (!filePath) return
    await window.api.invoke('fs:write', filePath, content)
    setIsSaved(true)
  }

  if (!filePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted">
        {t('panel.noFile')}
      </div>
    )
  }

  // Infer language from file extension
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    py: 'python',
    sh: 'shell',
    rs: 'rust',
    go: 'go'
  }
  const language = langMap[ext] || 'plaintext'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex h-9 items-center justify-between border-b border-border bg-surface px-3 text-xs">
        <span className="font-mono text-fg truncate">{filePath}</span>
        <button
          className="btn-primary text-xs px-2.5 py-1"
          disabled={isSaved}
          onClick={() => void handleSave()}
        >
          {isSaved ? t('panel.saved') : t('panel.save')}
        </button>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={content}
          onChange={(val) => {
            setContent(val || '')
            setIsSaved(false)
          }}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true
          }}
        />
      </div>
    </div>
  )
}
