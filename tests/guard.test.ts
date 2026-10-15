import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WorkspaceGuard } from '../src/core/tools/guard'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('WorkspaceGuard', () => {
  let root: string
  let guard: WorkspaceGuard

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'guard-test-'))
    guard = new WorkspaceGuard(root)
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('allows paths inside root', () => {
    const p = guard.resolveSafe('src/index.ts')
    expect(p).toBe(join(root, 'src/index.ts'))
    expect(guard.isSafe('src/index.ts')).toBe(true)
  })

  it('blocks path traversal escaping root', () => {
    expect(() => guard.resolveSafe('../../../etc/passwd')).toThrow(/Access denied/)
    expect(guard.isSafe('../../../etc/passwd')).toBe(false)
  })
})
