import type { ChatRequest, FetchLike, LLMProvider, StreamEvent, ToolSpec } from './types'
import { ensureOk, safeJsonObject } from './types'
import { parseSSE } from './sse'
import type { ChatMessage, Part } from '../../shared/types'

export interface AnthropicConfig {
  apiKey: string
  baseUrl?: string
  fetch?: FetchLike
}

export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic'
  private apiKey: string
  private baseUrl: string
  private fetchFn: FetchLike

  constructor(cfg: AnthropicConfig) {
    this.apiKey = cfg.apiKey
    this.baseUrl = (cfg.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
    this.fetchFn = cfg.fetch || ((input, init) => fetch(input, init))
  }

  async *stream(req: ChatRequest): AsyncIterable<StreamEvent> {
    const tools = req.tools.map((t: ToolSpec) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }))

    const messages = toAnthropicMessages(req.messages)

    const payload: Record<string, unknown> = {
      model: req.model,
      max_tokens: req.maxTokens || 4096,
      stream: true,
      messages
    }
    if (req.system) {
      payload.system = req.system
    }
    if (tools.length > 0) {
      payload.tools = tools
    }

    const res = await this.fetchFn(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      signal: req.signal
    })

    await ensureOk(res, 'Anthropic')
    if (!res.body) return

    let currentToolId = ''
    let currentToolName = ''
    let currentToolJson = ''

    for await (const sse of parseSSE(res.body)) {
      if (!sse.data || sse.data === '[DONE]') continue
      let data: any
      try {
        data = JSON.parse(sse.data)
      } catch {
        continue
      }

      if (data.type === 'content_block_start') {
        if (data.content_block?.type === 'tool_use') {
          currentToolId = data.content_block.id
          currentToolName = data.content_block.name
          currentToolJson = ''
        }
      } else if (data.type === 'content_block_delta') {
        if (data.delta?.type === 'text_delta') {
          yield { type: 'text', delta: data.delta.text }
        } else if (data.delta?.type === 'input_json_delta') {
          currentToolJson += data.delta.partial_json || ''
        }
      } else if (data.type === 'content_block_stop') {
        if (currentToolId) {
          yield {
            type: 'tool_call',
            call: {
              type: 'tool_call',
              id: currentToolId,
              name: currentToolName,
              input: safeJsonObject(currentToolJson)
            }
          }
          currentToolId = ''
          currentToolName = ''
          currentToolJson = ''
        }
      } else if (data.type === 'message_delta') {
        if (data.delta?.stop_reason) {
          yield { type: 'done', stopReason: data.delta.stop_reason }
        }
      }
    }
  }
}

function toAnthropicMessages(messages: ChatMessage[]) {
  const result: Array<{ role: 'user' | 'assistant'; content: unknown[] }> = []

  for (const m of messages) {
    if (m.role === 'user') {
      const content = m.content.map((p) => {
        if (p.type === 'text') return { type: 'text', text: p.text }
        return { type: 'text', text: '' }
      })
      result.push({ role: 'user', content })
    } else if (m.role === 'assistant') {
      const content = m.content.map((p: Part) => {
        if (p.type === 'text') return { type: 'text', text: p.text }
        if (p.type === 'tool_call') {
          return {
            type: 'tool_use',
            id: p.id,
            name: p.name,
            input: p.input
          }
        }
        return { type: 'text', text: '' }
      })
      result.push({ role: 'assistant', content })
    } else if (m.role === 'tool') {
      const content = m.content.map((p: Part) => {
        if (p.type === 'tool_result') {
          return {
            type: 'tool_result',
            tool_use_id: p.toolCallId,
            content: p.content,
            is_error: p.isError
          }
        }
        return { type: 'text', text: '' }
      })
      result.push({ role: 'user', content })
    }
  }
  return result
}
