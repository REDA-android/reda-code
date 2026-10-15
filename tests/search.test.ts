import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SearchTools } from '../src/core/tools/search'
import { WorkspaceGuard } from '../src/core/tools/guard'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('SearchTools', () => {
  let root: string
  let guard: WorkspaceGuard
  let search: SearchTools

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'search-test-'))
    guard = new WorkspaceGuard(root)
    search = new SearchTools(guard)

    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src/main.ts'), 'function startApp() {\n  console.log("running");\n}')
    writeFileSync(join(root, 'src/utils.ts'), 'export const PI = 3.14159;\n// running calculation')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('globs files inside workspace', async () => {
    const files = await search.globFiles({ pattern: '**/*.ts' })
    expect(files.sort()).toEqual(['src/main.ts', 'src/utils.ts'])
  })

  it('greps text across workspace files', async () => {
    const matches = await search.grepCode({ query: 'running' })
    expect(matches.length).toBe(2)
    expect(matches.some((m) => m.file === 'src/main.ts' && m.line === 2)).toBe(true)
    expect(matches.some((m) => m.file === 'src/utils.ts' && m.line === 2)).toBe(true)
  })
})
