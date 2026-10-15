import type { ChatMessage, ToolCallPart } from '../../shared/types'

export interface JsonSchema {
  type?: string
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: unknown[]
  [key: string]: unknown
}

export interface ToolSpec {
  name: string
  description: string
  parameters: JsonSchema
}

export interface ChatRequest {
  model: string
  system: string
  messages: ChatMessage[]
  tools: ToolSpec[]
  maxTokens?: number
  signal?: AbortSignal
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; call: ToolCallPart }
  | { type: 'done'; stopReason: string }

export interface LLMProvider {
  readonly id: string
  stream(req: ChatRequest): AsyncIterable<StreamEvent>
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export async function ensureOk(res: Response, provider: string): Promise<void> {
  if (res.ok) return
  let body = ''
  try {
    body = await res.text()
  } catch {
    /* ignore */
  }
  throw new Error(`${provider} HTTP ${res.status}: ${body.slice(0, 500)}`)
}

export function safeJsonObject(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  try {
    const v: unknown = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : { value: v }
  } catch {
    return { _raw: raw }
  }
}
