import { describe, it, expect } from 'vitest'
import { McpManager } from '../src/core/mcp/client'
import { ToolRegistry } from '../src/core/tools/registry'
import { WorkspaceGuard } from '../src/core/tools/guard'
import { tmpdir } from 'node:os'

describe('McpManager', () => {
  it('instantiates and reports empty status when no servers configured', async () => {
    const guard = new WorkspaceGuard(tmpdir())
    const registry = new ToolRegistry(guard)
    const manager = new McpManager(registry)

    const statuses = await manager.connectAll([])
    expect(statuses).toEqual([])
    expect(manager.getStatus()).toEqual([])
  })

  it('handles server failure gracefully and reports error', async () => {
    const guard = new WorkspaceGuard(tmpdir())
    const registry = new ToolRegistry(guard)
    const manager = new McpManager(registry)

    const statuses = await manager.connectAll([
      {
        name: 'non-existent',
        command: 'non_existent_command_12345678',
        args: []
      }
    ])

    expect(statuses.length).toBe(1)
    expect(statuses[0].connected).toBe(false)
    expect(statuses[0].error).toBeDefined()
  })
})
