import { describe, it, expect } from 'vitest'
import { AnthropicProvider } from '../src/core/providers/anthropic'
import { OpenAICompatibleProvider } from '../src/core/providers/openai'
import { GeminiProvider } from '../src/core/providers/gemini'
import { createProvider } from '../src/core/providers/factory'
import { DEFAULT_SETTINGS } from '../src/shared/types'

function makeMockResponse(sseLines: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of sseLines) {
        controller.enqueue(encoder.encode(line + '\n'))
      }
      controller.close()
    }
  })
  return new Response(stream, { status, headers: { 'content-type': 'text/event-stream' } })
}

describe('AnthropicProvider', () => {
  it('streams text and tool calls correctly', async () => {
    const sse = [
      'event: content_block_start',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_1","name":"read_file"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"path\\":\\"src/index.ts\\"}"}}',
      '',
      'event: content_block_stop',
      'data: {"type":"content_block_stop","index":0}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}',
      ''
    ]

    const provider = new AnthropicProvider({
      apiKey: 'test-key',
      fetch: async () => makeMockResponse(sse)
    })

    const events = []
    for await (const ev of provider.stream({
      model: 'claude-3-5-sonnet',
      system: 'You are an agent',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
      tools: []
    })) {
      events.push(ev)
    }

    expect(events).toEqual([
      {
        type: 'tool_call',
        call: {
          type: 'tool_call',
          id: 'tool_1',
          name: 'read_file',
          input: { path: 'src/index.ts' }
        }
      },
      { type: 'done', stopReason: 'tool_use' }
    ])
  })
})

describe('OpenAICompatibleProvider', () => {
  it('streams text deltas and done finish_reason', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Bonjour"},"finish_reason":null}]}',
      '',
      'data: {"choices":[{"delta":{"content":"!"},"finish_reason":null}]}',
      '',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
      '',
      'data: [DONE]',
      ''
    ]

    const provider = new OpenAICompatibleProvider({
      id: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'test-key',
      fetch: async () => makeMockResponse(sse)
    })

    const events = []
    for await (const ev of provider.stream({
      model: 'llama-3.3-70b-versatile',
      system: '',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      tools: []
    })) {
      events.push(ev)
    }

    expect(events).toEqual([
      { type: 'text', delta: 'Bonjour' },
      { type: 'text', delta: '!' },
      { type: 'done', stopReason: 'stop' }
    ])
  })
})

describe('GeminiProvider', () => {
  it('streams text from candidates', async () => {
    const sse = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello from Gemini"}]},"finishReason":"STOP"}]}',
      ''
    ]

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      fetch: async () => makeMockResponse(sse)
    })

    const events = []
    for await (const ev of provider.stream({
      model: 'gemini-2.5-flash',
      system: '',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      tools: []
    })) {
      events.push(ev)
    }

    expect(events).toEqual([
      { type: 'text', delta: 'Hello from Gemini' },
      { type: 'done', stopReason: 'STOP' }
    ])
  })
})

describe('Provider Factory', () => {
  it('creates appropriate provider instances', () => {
    const anthropic = createProvider({ providerId: 'anthropic', apiKey: 'k', settings: DEFAULT_SETTINGS })
    expect(anthropic.id).toBe('anthropic')

    const ollama = createProvider({ providerId: 'ollama', settings: DEFAULT_SETTINGS })
    expect(ollama.id).toBe('ollama')
  })
})
