import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export function TerminalView(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#0d0f12',
        foreground: '#e6e8eb',
        cursor: '#d97757',
        selectionBackground: 'rgba(217, 119, 87, 0.3)'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    // Initialize backend terminal process
    void window.api.invoke('terminal:create', term.cols, term.rows).then((res) => {
      termIdRef.current = res.id

      // Send terminal input to backend
      term.onData((data) => {
        if (termIdRef.current) {
          void window.api.invoke('terminal:write', termIdRef.current, data)
        }
      })
    })

    // Listen for data from backend
    const unlistenData = window.api.on('terminal:data', ({ id, data }) => {
      if (id === termIdRef.current) {
        term.write(data)
      }
    })

    const handleResize = () => {
      try {
        fitAddon.fit()
        if (termIdRef.current) {
          void window.api.invoke('terminal:resize', termIdRef.current, term.cols, term.rows)
        }
      } catch {
        // ignore resize error
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      unlistenData()
      if (termIdRef.current) {
        void window.api.invoke('terminal:kill', termIdRef.current)
      }
      term.dispose()
    }
  }, [])

  return (
    <div className="flex-1 bg-bg p-2 overflow-hidden flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  )
}
