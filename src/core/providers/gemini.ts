import type { ChatRequest, FetchLike, LLMProvider, StreamEvent, ToolSpec } from './types'
import { ensureOk } from './types'
import { parseSSE } from './sse'
import type { ChatMessage } from '../../shared/types'

export interface GeminiConfig {
  apiKey: string
  baseUrl?: string
  fetch?: FetchLike
}

export class GeminiProvider implements LLMProvider {
  readonly id = 'gemini'
  private apiKey: string
  private baseUrl: string
  private fetchFn: FetchLike

  constructor(cfg: GeminiConfig) {
    this.apiKey = cfg.apiKey
    this.baseUrl = (cfg.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')
    this.fetchFn = cfg.fetch || ((input, init) => fetch(input, init))
  }

  async *stream(req: ChatRequest): AsyncIterable<StreamEvent> {
    const contents = toGeminiContents(req.messages)

    const payload: Record<string, unknown> = {
      contents
    }

    if (req.system) {
      payload.systemInstruction = {
        parts: [{ text: req.system }]
      }
    }

    if (req.tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: req.tools.map((t: ToolSpec) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }
      ]
    }

    const url = `${this.baseUrl}/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`

    const res = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: req.signal
    })

    await ensureOk(res, 'Gemini')
    if (!res.body) return

    for await (const sse of parseSSE(res.body)) {
      if (!sse.data) continue
      let chunk: any
      try {
        chunk = JSON.parse(sse.data)
      } catch {
        continue
      }

      const candidate = chunk.candidates?.[0]
      if (!candidate) continue

      const parts = candidate.content?.parts || []
      for (const part of parts) {
        if (part.text) {
          yield { type: 'text', delta: part.text }
        }
        if (part.functionCall) {
          yield {
            type: 'tool_call',
            call: {
              type: 'tool_call',
              id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: part.functionCall.name,
              input: part.functionCall.args || {}
            }
          }
        }
      }

      if (candidate.finishReason) {
        yield { type: 'done', stopReason: candidate.finishReason }
      }
    }
  }
}

function toGeminiContents(messages: ChatMessage[]) {
  const result: Array<{ role: 'user' | 'model'; parts: unknown[] }> = []

  for (const m of messages) {
    if (m.role === 'user') {
      const parts = m.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => ({ text: p.text }))
      result.push({ role: 'user', parts })
    } else if (m.role === 'assistant') {
      const parts: unknown[] = []
      for (const p of m.content) {
        if (p.type === 'text') parts.push({ text: p.text })
        else if (p.type === 'tool_call') {
          parts.push({
            functionCall: {
              name: p.name,
              args: p.input
            }
          })
        }
      }
      result.push({ role: 'model', parts })
    } else if (m.role === 'tool') {
      const parts: unknown[] = []
      for (const p of m.content) {
        if (p.type === 'tool_result') {
          parts.push({
            functionResponse: {
              name: p.name,
              response: { content: p.content, error: p.isError }
            }
          })
        }
      }
      result.push({ role: 'user', parts })
    }
  }
  return result
}
