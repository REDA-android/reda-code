import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runAgentLoop } from '../src/core/agent/loop'
import { ToolRegistry } from '../src/core/tools/registry'
import { WorkspaceGuard } from '../src/core/tools/guard'
import type { LLMProvider, StreamEvent, ChatRequest } from '../src/core/providers/types'
import type { AgentEvent } from '../src/shared/types'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('runAgentLoop', () => {
  let root: string
  let guard: WorkspaceGuard
  let registry: ToolRegistry

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'loop-test-'))
    guard = new WorkspaceGuard(root)
    registry = new ToolRegistry(guard)
    writeFileSync(join(root, 'test.txt'), 'hello from file')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('runs multi-turn tool calling loop successfully', async () => {
    let callCount = 0
    const mockProvider: LLMProvider = {
      id: 'mock',
      async *stream(_req: ChatRequest): AsyncIterable<StreamEvent> {
        callCount++
        if (callCount === 1) {
          // First turn: model calls read_file
          yield {
            type: 'tool_call',
            call: {
              type: 'tool_call',
              id: 'call_1',
              name: 'read_file',
              input: { path: 'test.txt' }
            }
          }
          yield { type: 'done', stopReason: 'tool_use' }
        } else {
          // Second turn: model answers with content
          yield { type: 'text', delta: 'File says: hello from file' }
          yield { type: 'done', stopReason: 'end_turn' }
        }
      }
    }

    const events: AgentEvent[] = []
    const messages = await runAgentLoop({
      sessionId: 'sess_1',
      provider: mockProvider,
      model: 'test-model',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'read test.txt' }] }],
      toolRegistry: registry,
      autoMode: false,
      onEvent: (ev) => events.push(ev),
      requestApproval: async () => true
    })

    expect(callCount).toBe(2)
    expect(messages.length).toBe(4) // user, assistant(tool_call), tool(tool_result), assistant(text)
    expect(events.some((e) => e.type === 'tool_start')).toBe(true)
    expect(events.some((e) => e.type === 'tool_end')).toBe(true)
    expect(events.some((e) => e.type === 'done')).toBe(true)
  })
})
