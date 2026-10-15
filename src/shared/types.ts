// Domain types shared by main, preload, renderer and core. No runtime imports.

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'ollama'
export const PROVIDER_IDS: readonly ProviderId[] = ['anthropic', 'openai', 'gemini', 'groq', 'ollama']

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4.1',
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'qwen2.5-coder'
}

export type Locale = 'fr' | 'en'

export interface McpServerConfig {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled?: boolean
}

export interface Settings {
  provider: ProviderId
  models: Record<ProviderId, string>
  ollamaBaseUrl: string
  autoMode: boolean
  locale: Locale
  workspace: string | null
  mcpServers: McpServerConfig[]
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'anthropic',
  models: { ...DEFAULT_MODELS },
  ollamaBaseUrl: 'http://localhost:11434/v1',
  autoMode: false,
  locale: 'fr',
  workspace: null,
  mcpServers: []
}

// ---------- Canonical chat messages (provider-agnostic) ----------
export type TextPart = { type: 'text'; text: string }
export type ToolCallPart = {
  type: 'tool_call'
  id: string
  name: string
  input: Record<string, unknown>
  /** Provider-specific data that must be echoed back (e.g. Gemini thoughtSignature). */
  meta?: Record<string, string>
}
export type ToolResultPart = {
  type: 'tool_result'
  toolCallId: string
  name: string
  content: string
  isError?: boolean
}
export type Part = TextPart | ToolCallPart | ToolResultPart

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  content: Part[]
}

// ---------- Sessions ----------
export interface SessionSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}
export interface Session extends SessionSummary {
  messages: ChatMessage[]
}

// ---------- Agent events streamed to the renderer ----------
export interface ApprovalRequest {
  id: string
  sessionId: string
  tool: string
  input: Record<string, unknown>
  /** Human readable preview: unified diff, command line, etc. */
  preview: string
}

export type AgentEvent =
  | { type: 'text'; sessionId: string; delta: string }
  | { type: 'tool_start'; sessionId: string; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; sessionId: string; id: string; name: string; output: string; isError: boolean }
  | { type: 'approval'; request: ApprovalRequest }
  | { type: 'message'; sessionId: string; message: ChatMessage }
  | { type: 'error'; sessionId: string; error: string }
  | { type: 'done'; sessionId: string }

export interface FileNode {
  name: string
  path: string
  dir: boolean
}

export interface McpStatus {
  name: string
  connected: boolean
  tools: string[]
  error?: string
}
