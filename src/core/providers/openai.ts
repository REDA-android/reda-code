import type { ChatRequest, FetchLike, LLMProvider, StreamEvent, ToolSpec } from './types'
import { ensureOk, safeJsonObject } from './types'
import { parseSSE } from './sse'
import type { ChatMessage, Part } from '../../shared/types'

export interface OpenAICompatibleConfig {
  id?: string
  apiKey?: string
  baseUrl: string
  fetch?: FetchLike
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly id: string
  private apiKey?: string
  private baseUrl: string
  private fetchFn: FetchLike

  constructor(cfg: OpenAICompatibleConfig) {
    this.id = cfg.id || 'openai'
    this.apiKey = cfg.apiKey
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '')
    this.fetchFn = cfg.fetch || ((input, init) => fetch(input, init))
  }

  async *stream(req: ChatRequest): AsyncIterable<StreamEvent> {
    const messages = toOpenAIMessages(req.system, req.messages)

    const payload: Record<string, unknown> = {
      model: req.model,
      stream: true,
      messages
    }

    if (req.tools.length > 0) {
      payload.tools = req.tools.map((t: ToolSpec) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }))
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json'
    }
    if (this.apiKey) {
      headers['authorization'] = `Bearer ${this.apiKey}`
    }

    const res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: req.signal
    })

    await ensureOk(res, this.id)
    if (!res.body) return

    // Track in-flight tool calls by index
    const pendingToolCalls: Map<number, { id: string; name: string; args: string }> = new Map()

    for await (const sse of parseSSE(res.body)) {
      if (!sse.data) continue
      if (sse.data.trim() === '[DONE]') break
      let chunk: any
      try {
        chunk = JSON.parse(sse.data)
      } catch {
        continue
      }

      const choice = chunk.choices?.[0]
      if (!choice) continue

      const delta = choice.delta
      if (delta?.content) {
        yield { type: 'text', delta: delta.content }
      }

      if (Array.isArray(delta?.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          let existing = pendingToolCalls.get(idx)
          if (!existing) {
            existing = {
              id: tc.id || `tc_${idx}_${Date.now()}`,
              name: tc.function?.name || '',
              args: ''
            }
            pendingToolCalls.set(idx, existing)
          }
          if (tc.id) existing.id = tc.id
          if (tc.function?.name) existing.name += tc.function.name
          if (tc.function?.arguments) existing.args += tc.function.arguments
        }
      }

      if (choice.finish_reason) {
        // Emit any completed tool calls
        for (const [, tc] of pendingToolCalls) {
          yield {
            type: 'tool_call',
            call: {
              type: 'tool_call',
              id: tc.id,
              name: tc.name,
              input: safeJsonObject(tc.args)
            }
          }
        }
        pendingToolCalls.clear()
        yield { type: 'done', stopReason: choice.finish_reason }
      }
    }
  }
}

function toOpenAIMessages(system: string, messages: ChatMessage[]) {
  const result: Array<Record<string, unknown>> = []
  if (system) {
    result.push({ role: 'system', content: system })
  }

  for (const m of messages) {
    if (m.role === 'user') {
      const text = m.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
      result.push({ role: 'user', content: text })
    } else if (m.role === 'assistant') {
      let content = ''
      const toolCalls: Array<Record<string, unknown>> = []
      for (const p of m.content) {
        if (p.type === 'text') content += p.text
        else if (p.type === 'tool_call') {
          toolCalls.push({
            id: p.id,
            type: 'function',
            function: {
              name: p.name,
              arguments: JSON.stringify(p.input)
            }
          })
        }
      }
      const msg: Record<string, unknown> = { role: 'assistant', content: content || null }
      if (toolCalls.length > 0) {
        msg.tool_calls = toolCalls
      }
      result.push(msg)
    } else if (m.role === 'tool') {
      for (const p of m.content) {
        if (p.type === 'tool_result') {
          result.push({
            role: 'tool',
            tool_call_id: p.toolCallId,
            content: p.content
          })
        }
      }
    }
  }
  return result
}
