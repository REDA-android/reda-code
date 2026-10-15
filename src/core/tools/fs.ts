import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { createPatch } from 'diff'
import type { WorkspaceGuard } from './guard'

export interface ReadFileInput {
  path: string
  startLine?: number
  endLine?: number
}

export interface WriteFileInput {
  path: string
  content: string
}

export interface EditFileInput {
  path: string
  targetContent: string
  replacementContent: string
}

export class FsTools {
  constructor(private readonly guard: WorkspaceGuard) {}

  readFile(input: ReadFileInput): string {
    const safePath = this.guard.resolveSafe(input.path)
    if (!existsSync(safePath)) {
      throw new Error(`File not found: ${input.path}`)
    }
    const content = readFileSync(safePath, 'utf8')
    const lines = content.split('\n')
    const start = Math.max(1, input.startLine || 1) - 1
    const end = input.endLine ? Math.min(lines.length, input.endLine) : lines.length
    const slice = lines.slice(start, end)
    return slice.map((line, idx) => `${start + idx + 1}: ${line}`).join('\n')
  }

  writeFile(input: WriteFileInput): { success: boolean; preview: string } {
    const safePath = this.guard.resolveSafe(input.path)
    mkdirSync(dirname(safePath), { recursive: true })
    const oldContent = existsSync(safePath) ? readFileSync(safePath, 'utf8') : ''
    writeFileSync(safePath, input.content, 'utf8')
    const rel = relative(this.guard.getRoot(), safePath)
    const preview = createPatch(rel, oldContent, input.content)
    return { success: true, preview }
  }

  editFile(input: EditFileInput): { success: boolean; preview: string } {
    const safePath = this.guard.resolveSafe(input.path)
    if (!existsSync(safePath)) {
      throw new Error(`File not found: ${input.path}`)
    }
    const oldContent = readFileSync(safePath, 'utf8')
    if (!oldContent.includes(input.targetContent)) {
      throw new Error(`Target content not found in file: ${input.path}`)
    }
    const newContent = oldContent.replace(input.targetContent, input.replacementContent)
    writeFileSync(safePath, newContent, 'utf8')
    const rel = relative(this.guard.getRoot(), safePath)
    const preview = createPatch(rel, oldContent, newContent)
    return { success: true, preview }
  }

  previewWrite(input: WriteFileInput): string {
    const safePath = this.guard.resolveSafe(input.path)
    const oldContent = existsSync(safePath) ? readFileSync(safePath, 'utf8') : ''
    const rel = relative(this.guard.getRoot(), safePath)
    return createPatch(rel, oldContent, input.content)
  }

  previewEdit(input: EditFileInput): string {
    const safePath = this.guard.resolveSafe(input.path)
    const oldContent = existsSync(safePath) ? readFileSync(safePath, 'utf8') : ''
    if (!oldContent.includes(input.targetContent)) {
      return `[Preview error: target content not found in ${input.path}]`
    }
    const newContent = oldContent.replace(input.targetContent, input.replacementContent)
    const rel = relative(this.guard.getRoot(), safePath)
    return createPatch(rel, oldContent, newContent)
  }
}
