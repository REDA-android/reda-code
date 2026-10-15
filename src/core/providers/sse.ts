export interface SSEMessage {
  event?: string
  data: string
}

/** Minimal, spec-compliant-enough Server-Sent Events parser over a byte stream. */
export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEMessage> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let event: string | undefined
  let data: string[] = []

  const flush = (): SSEMessage | null => {
    if (data.length === 0) {
      event = undefined
      return null
    }
    const msg: SSEMessage = { event, data: data.join('\n') }
    event = undefined
    data = []
    return msg
  }

  const handleLine = (line: string): SSEMessage | null => {
    if (line === '') return flush()
    if (line.startsWith(':')) return null
    const idx = line.indexOf(':')
    const field = idx === -1 ? line : line.slice(0, idx)
    let value = idx === -1 ? '' : line.slice(idx + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
    return null
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.search(/\r\n|\r|\n/)) !== -1) {
        // A lone trailing CR may be the first half of a CRLF split across chunks.
        if (buffer[nl] === '\r' && nl === buffer.length - 1) break
        const line = buffer.slice(0, nl)
        const sepLen = buffer[nl] === '\r' && buffer[nl + 1] === '\n' ? 2 : 1
        buffer = buffer.slice(nl + sepLen)
        const msg = handleLine(line)
        if (msg) yield msg
      }
    }
    buffer += decoder.decode()
    if (buffer) {
      const msg = handleLine(buffer.replace(/\r$/, '')) = flush()
    if (last) yield last
  } finally {
    reader.releaseLock()
  }
}
