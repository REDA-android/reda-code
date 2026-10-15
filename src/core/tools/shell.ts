import { spawn } from 'node:child_process'
import type { WorkspaceGuard } from './guard'

export interface RunCommandInput {
  command: string
  cwd?: string
  timeoutMs?: number
}

export interface RunCommandResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

export class ShellTool {
  constructor(private readonly guard: WorkspaceGuard) {}

  async runCommand(input: RunCommandInput): Promise<RunCommandResult> {
    const cwd = input.cwd ? this.guard.resolveSafe(input.cwd) : this.guard.getRoot()
    const timeoutMs = input.timeoutMs || 30000

    return new Promise<RunCommandResult>((resolve, reject) => {
      const isWin = process.platform === 'win32'
      const shell = isWin ? 'cmd.exe' : '/bin/bash'
      const shellArgs = isWin ? ['/d', '/s', '/c', input.command] : ['-c', input.command]

      const child = spawn(shell, shellArgs, {
        cwd,
        env: { ...process.env, CI: '1' }
      })

      let stdout = ''
      let stderr = ''
      let killed = false

      const timer = setTimeout(() => {
        killed = true
        child.kill('SIGTERM')
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${input.command}`))
      }, timeoutMs)

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
        if (stdout.length > 50000) stdout = stdout.slice(-50000)
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
        if (stderr.length > 50000) stderr = stderr.slice(-50000)
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        if (!killed) {
          resolve({ stdout, stderr, exitCode: code })
        }
      })
    })
  }
}
