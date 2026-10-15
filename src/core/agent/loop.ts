import type { LLMProvider } from '../providers/types'
import type { ToolRegistry } from '../tools/registry'
import type { AgentEvent, ApprovalRequest, ChatMessage, Part, ToolCallPart } from '../../shared/types'

export interface AgentLoopOptions {
  sessionId: string
  provider: LLMProvider
  model: string
  systemPrompt?: string
  messages: ChatMessage[]
  toolRegistry: ToolRegistry
  autoMode: boolean
  maxTurns?: number
  onEvent: (event: AgentEvent) => void
  requestApproval: (req: ApprovalRequest) => Promise<boolean>
  signal?: AbortSignal
}

export const DEFAULT_SYSTEM_PROMPT = `You are reda-code, an elite AI coding assistant operating inside a local workspace.
You have tools to read, write, and edit files, search code, run shell commands, and browse the web.
Be concise, precise, and proactive. Always explain briefly before making file changes or running shell commands.
Maintain documentation integrity and verify your changes.`

export async function runAgentLoop(opts: AgentLoopOptions): Promise<ChatMessage[]> {
  const {
    sessionId,
    provider,
    model,
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    messages: initialMessages,
    toolRegistry,
    autoMode,
    maxTurns = 20,
    onEvent,
    requestApproval,
    signal
  } = opts

  const conversation: ChatMessage[] = structuredClone(initialMessages)
  const toolSpecs = toolRegistry.getSpecs()

  for (let turn = 0; turn < maxTurns; turn++) {
    if (signal?.aborted) {
      onEvent({ type: 'error', sessionId, error: 'Agent execution aborted by user.' })
      break
    }

    let assistantText = ''
    const toolCalls: ToolCallPart[] = []

    try {
      const stream = provider.stream({
        model,
        system: systemPrompt,
        messages: conversation,
        tools: toolSpecs,
        signal
      })

      for await (const ev of stream) {
        if (ev.type === 'text') {
          assistantText += ev.delta
          onEvent({ type: 'text', sessionId, delta: ev.delta })
        } else if (ev.type === 'tool_call') {
          toolCalls.push(ev.call)
        }
      }
    } catch (err: any) {
      onEvent({ type: 'error', sessionId, error: err?.message || String(err) })
      break
    }

    // Add assistant turn to conversation
    const assistantParts: Part[] = []
    if (assistantText) {
      assistantParts.push({ type: 'text', text: assistantText })
    }
    for (const tc of toolCalls) {
      assistantParts.push(tc)
    }

    if (assistantParts.length > 0) {
      conversation.push({ role: 'assistant', content: assistantParts })
    }

    // If no tool calls were requested, the model finished its response
    if (toolCalls.length === 0) {
      break
    }

    // Execute each tool call
    const toolResultParts: Part[] = []

    for (const tc of toolCalls) {
      onEvent({
        type: 'tool_start',
        sessionId,
        id: tc.id,
        name: tc.name,
        input: tc.input
      })

      const toolDef = toolRegistry.get(tc.name)
      if (!toolDef) {
        const errorMsg = `Tool not found: ${tc.name}`
        toolResultParts.push({
          type: 'tool_result',
          toolCallId: tc.id,
          name: tc.name,
          content: errorMsg,
          isError: true
        })
        onEvent({
          type: 'tool_end',
          sessionId,
          id: tc.id,
          name: tc.name,
          output: errorMsg,
          isError: true
        })
        continue
      }

      // Check approval requirement
      if (toolDef.requiresApproval && !autoMode) {
        let preview = ''
        try {
          preview = toolDef.preview(tc.input)
        } catch {
          preview = JSON.stringify(tc.input, null, 2)
        }

        const approvalReq: ApprovalRequest = {
          id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sessionId,
          tool: tc.name,
          input: tc.input,
          preview
        }

        onEvent({ type: 'approval', request: approvalReq })
        const approved = await requestApproval(approvalReq)

        if (!approved) {
          const rejectedMsg = 'Action rejected by user.'
          toolResultParts.push({
            type: 'tool_result',
            toolCallId: tc.id,
            name: tc.name,
            content: rejectedMsg,
            isError: true
          })
          onEvent({
            type: 'tool_end',
            sessionId,
            id: tc.id,
            name: tc.name,
            output: rejectedMsg,
            isError: true
          })
          continue
        }
      }

      // Execute tool
      try {
        const output = await toolDef.execute(tc.input)
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output)
        toolResultParts.push({
          type: 'tool_result',
          toolCallId: tc.id,
          name: tc.name,
          content: outputStr,
          isError: false
        })
        onEvent({
          type: 'tool_end',
          sessionId,
          id: tc.id,
          name: tc.name,
          output: outputStr,
          isError: false
        })
      } catch (err: any) {
        const errMsg = err?.message || String(err)
        toolResultParts.push({
          type: 'tool_result',
          toolCallId: tc.id,
          name: tc.name,
          content: errMsg,
          isError: true
        })
        onEvent({
          type: 'tool_end',
          sessionId,
          id: tc.id,
          name: tc.name,
          output: errMsg,
          isError: true
        })
      }
    }

    // Add tool responses back to conversation for the next model turn
    conversation.push({ role: 'tool', content: toolResultParts })
  }

  onEvent({ type: 'done', sessionId })
  return conversation
}
