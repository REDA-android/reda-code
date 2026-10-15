import { describe, it, expect } from 'vitest'
import { parseSSE } from '../src/core/providers/sse'

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let idx = 0
  return new ReadableStream({
    pull(controller) {
      if (idx < chunks.length) {
        controller.enqueue(encoder.encode(chunks[idx++]))
      } else {
        controller.close()
      }
    }
  })
}

describe('parseSSE', () => {
  it('parses single and multi-line data events', async () => {
    const raw = 'event: message\ndata: hello world\n\nevent: ping\ndata: 123\n\n'
    const stream = makeStream([raw])
    const results = []
    for await (const msg of parseSSE(stream)) {
      results.push(msg)
    }
    expect(results).toEqual([
      { event: 'message', data: 'hello world' },
      { event: 'ping', data: '123' }
    ])
  })

  it('handles fragmented chunks and CRLF', async () => {
    const stream = makeStream(['data: hel', 'lo\r\n', '\r\n'])
    const results = []
    for await (const msg of parseSSE(stream)) {
      results.push(msg)
    }
    expect(results).toEqual([{ event: undefined, data: 'hello' }])
  })
})
