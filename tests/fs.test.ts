import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FsTools } from '../src/core/tools/fs'
import { WorkspaceGuard } from '../src/core/tools/guard'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('FsTools', () => {
  let root: string
  let guard: WorkspaceGuard
  let fsTools: FsTools

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fs-test-'))
    guard = new WorkspaceGuard(root)
    fsTools = new FsTools(guard)
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writes and reads files', () => {
    const res = fsTools.writeFile({ path: 'hello.txt', content: 'line 1\nline 2\nline 3' })
    expect(res.success).toBe(true)

    const read = fsTools.readFile({ path: 'hello.txt' })
    expect(read).toContain('1: line 1')
    expect(read).toContain('2: line 2')
    expect(read).toContain('3: line 3')
  })

  it('edits file and produces diff', () => {
    fsTools.writeFile({ path: 'code.ts', content: 'const x = 1;\nconsole.log(x);' })
    const editRes = fsTools.editFile({
      path: 'code.ts',
      targetContent: 'const x = 1;',
      replacementContent: 'const x = 42;'
    })
    expect(editRes.success).toBe(true)
    expect(editRes.preview).toContain('-const x = 1;')
    expect(editRes.preview).toContain('+const x = 42;')

    const read = fsTools.readFile({ path: 'code.ts' })
    expect(read).toContain('const x = 42;')
  })
})
