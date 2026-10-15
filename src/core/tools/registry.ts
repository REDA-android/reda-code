import type { ToolSpec } from '../providers/types'
import type { WorkspaceGuard } from './guard'
import { FsTools, type ReadFileInput, type WriteFileInput, type EditFileInput } from './fs'
import { SearchTools, type GlobInput, type GrepInput } from './search'
import { ShellTool, type RunCommandInput } from './shell'
import { WebTools, type FetchUrlInput, type SearchWebInput } from './web'

export interface ToolDefinition {
  spec: ToolSpec
  requiresApproval: boolean
  preview: (input: any) => string
  execute: (input: any) => Promise<string> | string
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()
  readonly fs: FsTools
  readonly search: SearchTools
  readonly shell: ShellTool
  readonly web: WebTools

  constructor(private readonly guard: WorkspaceGuard) {
    this.fs = new FsTools(this.guard)
    this.search = new SearchTools(this.guard)
    this.shell = new ShellTool(this.guard)
    this.web = new WebTools()

    this.registerBuiltins()
  }

  getSpecs(): ToolSpec[] {
    return Array.from(this.tools.values()).map((t) => t.spec)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  registerCustomTool(def: ToolDefinition): void {
    this.tools.set(def.spec.name, def)
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  private registerBuiltins(): void {
    // 1. read_file
    this.tools.set('read_file', {
      spec: {
        name: 'read_file',
        description: 'Read the contents of a file within the workspace with line numbers.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to file in workspace' },
            startLine: { type: 'number', description: 'Optional 1-indexed start line' },
            endLine: { type: 'number', description: 'Optional 1-indexed end line' }
          },
          required: ['path']
        }
      },
      requiresApproval: false,
      preview: (input: ReadFileInput) => `Read file: ${input.path}`,
      execute: (input: ReadFileInput) => this.fs.readFile(input)
    })

    // 2. write_file
    this.tools.set('write_file', {
      spec: {
        name: 'write_file',
        description: 'Create or overwrite a file in the workspace.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to file in workspace' },
            content: { type: 'string', description: 'Complete content to write' }
          },
          required: ['path', 'content']
        }
      },
      requiresApproval: true,
      preview: (input: WriteFileInput) => this.fs.previewWrite(input),
      execute: (input: WriteFileInput) => {
        this.fs.writeFile(input)
        return `Successfully wrote ${input.path}`
      }
    })

    // 3. edit_file
    this.tools.set('edit_file', {
      spec: {
        name: 'edit_file',
        description: 'Edit a specific block of text in an existing file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to file in workspace' },
            targetContent: { type: 'string', description: 'Exact string to be replaced' },
            replacementContent: { type: 'string', description: 'Replacement string' }
          },
          required: ['path', 'targetContent', 'replacementContent']
        }
      },
      requiresApproval: true,
      preview: (input: EditFileInput) => this.fs.previewEdit(input),
      execute: (input: EditFileInput) => {
        this.fs.editFile(input)
        return `Successfully edited ${input.path}`
      }
    })

    // 4. glob_files
    this.tools.set('glob_files', {
      spec: {
        name: 'glob_files',
        description: 'Search for files matching a glob pattern (e.g. "**/*.ts").',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Glob pattern' }
          },
          required: ['pattern']
        }
      },
      requiresApproval: false,
      preview: (input: GlobInput) => `Find files matching: ${input.pattern}`,
      execute: async (input: GlobInput) => {
        const files = await this.search.globFiles(input)
        return files.length === 0 ? 'No matching files found.' : files.join('\n')
      }
    })

    // 5. grep_code
    this.tools.set('grep_code', {
      spec: {
        name: 'grep_code',
        description: 'Search for text or regex in workspace code files.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search string or regex' },
            pattern: { type: 'string', description: 'Optional glob pattern to filter files' },
            isRegex: { type: 'boolean', description: 'Whether query is a regex' }
          },
          required: ['query']
        }
      },
      requiresApproval: false,
      preview: (input: GrepInput) => `Search code for: ${input.query}`,
      execute: async (input: GrepInput) => {
        const matches = await this.search.grepCode(input)
        if (matches.length === 0) return 'No matches found.'
        return matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
      }
    })

    // 6. run_command
    this.tools.set('run_command', {
      spec: {
        name: 'run_command',
        description: 'Execute a shell command inside the workspace.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Shell command string' },
            cwd: { type: 'string', description: 'Optional subdirectory within workspace' }
          },
          required: ['command']
        }
      },
      requiresApproval: true,
      preview: (input: RunCommandInput) => `$ ${input.command}`,
      execute: async (input: RunCommandInput) => {
        const res = await this.shell.runCommand(input)
        return `Exit code: ${res.exitCode}\nStdout:\n${res.stdout}\nStderr:\n${res.stderr}`
      }
    })

    // 7. fetch_url
    this.tools.set('fetch_url', {
      spec: {
        name: 'fetch_url',
        description: 'Fetch and parse content from a web URL.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Full HTTP/HTTPS URL' }
          },
          required: ['url']
        }
      },
      requiresApproval: false,
      preview: (input: FetchUrlInput) => `Fetch URL: ${input.url}`,
      execute: (input: FetchUrlInput) => this.web.fetchUrl(input)
    })

    // 8. search_web
    this.tools.set('search_web', {
      spec: {
        name: 'search_web',
        description: 'Search the web for documentation or technical questions.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Web search query' }
          },
          required: ['query']
        }
      },
      requiresApproval: false,
      preview: (input: SearchWebInput) => `Web search: ${input.query}`,
      execute: (input: SearchWebInput) => this.web.searchWeb(input)
    })
  }
}
