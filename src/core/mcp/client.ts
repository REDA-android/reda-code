import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { McpServerConfig, McpStatus } from '../../shared/types'
import type { ToolRegistry } from '../tools/registry'

interface ActiveClient {
  config: McpServerConfig
  client: Client
  transport: StdioClientTransport
  tools: string[]
}

export class McpManager {
  private activeClients: Map<string, ActiveClient> = new Map()

  constructor(private readonly registry?: ToolRegistry) {}

  async connectAll(configs: McpServerConfig[]): Promise<McpStatus[]> {
    await this.disconnectAll()

    const statuses: McpStatus[] = []
    for (const cfg of configs) {
      if (cfg.enabled === false) continue
      const status = await this.connectOne(cfg)
      statuses.push(status)
    }
    return statuses
  }

  async connectOne(cfg: McpServerConfig): Promise<McpStatus> {
    try {
      const envObj: Record<string, string> = {}
      for (const [k, v] of Object.entries({ ...process.env, ...(cfg.env || {}) })) {
        if (typeof v === 'string') envObj[k] = v
      }
      const transport = new StdioClientTransport({
        command: cfg.command,
        args: cfg.args || [],
        env: envObj
      })

      const client = new Client(
        {
          name: 'reda-code',
          version: '0.1.0'
        },
        {
          capabilities: {}
        }
      )

      await client.connect(transport)

      const toolsResult = await client.listTools()
      const toolNames: string[] = []

      for (const t of toolsResult.tools) {
        const fullToolName = `mcp_${cfg.name}_${t.name}`
        toolNames.push(fullToolName)

        if (this.registry) {
          this.registry.registerCustomTool({
            spec: {
              name: fullToolName,
              description: `[MCP:${cfg.name}] ${t.description || t.name}`,
              parameters: (t.inputSchema as any) || { type: 'object', properties: {} }
            },
            requiresApproval: true,
            preview: (input: any) => `MCP Tool [${fullToolName}]: ${JSON.stringify(input, null, 2)}`,
            execute: async (input: any) => {
              const res = await client.callTool({
                name: t.name,
                arguments: input
              })
              return JSON.stringify(res.content, null, 2)
            }
          })
        }
      }

      this.activeClients.set(cfg.name, {
        config: cfg,
        client,
        transport,
        tools: toolNames
      })

      return {
        name: cfg.name,
        connected: true,
        tools: toolNames
      }
    } catch (err: any) {
      return {
        name: cfg.name,
        connected: false,
        tools: [],
        error: err?.message || String(err)
      }
    }
  }

  getStatus(): McpStatus[] {
    const statuses: McpStatus[] = []
    for (const [name, entry] of this.activeClients) {
      statuses.push({
        name,
        connected: true,
        tools: entry.tools
      })
    }
    return statuses
  }

  async disconnectAll(): Promise<void> {
    for (const [, entry] of this.activeClients) {
      if (this.registry) {
        for (const t of entry.tools) {
          this.registry.unregister(t)
        }
      }
      try {
        await entry.client.close()
      } catch {
        // Ignore close errors
      }
    }
    this.activeClients.clear()
  }
}
