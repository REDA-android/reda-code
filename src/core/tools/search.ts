import fg from 'fast-glob'
import { readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { WorkspaceGuard } from './guard'

export interface GlobInput {
  pattern: string
  ignore?: string[]
}

export interface GrepInput {
  query: string
  pattern?: string
  isRegex?: boolean
  maxResults?: number
}

export interface GrepMatch {
  file: string
  line: number
  text: string
}

export class SearchTools {
  constructor(private readonly guard: WorkspaceGuard) {}

  async globFiles(input: GlobInput): Promise<string[]> {
    const root = this.guard.getRoot()
    const entries = await fg(input.pattern || '**/*', {
      cwd: root,
      ignore: input.ignore || ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'],
      dot: true,
      onlyFiles: true
    })
    return entries.slice(0, 200)
  }

  async grepCode(input: GrepInput): Promise<GrepMatch[]> {
    const root = this.guard.getRoot()
    const files = await fg(input.pattern || '**/*', {
      cwd: root,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'],
      onlyFiles: true
    })

    const matches: GrepMatch[] = []
    const max = input.maxResults || 100
    const regex = input.isRegex
      ? new RegExp(input.query, 'i')
      : new RegExp(input.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    for (const relFile of files) {
      if (matches.length >= max) break
      const fullPath = join(root, relFile)
      try {
        const stats = statSync(fullPath)
        // Skip files larger than 1MB
        if (stats.size > 1024 * 1024) continue

        const content = readFileSync(fullPath, 'utf8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({
              file: relFile,
              line: i + 1,
              text: lines[i].trim()
            })
            if (matches.length >= max) break
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
    return matches
  }
}
