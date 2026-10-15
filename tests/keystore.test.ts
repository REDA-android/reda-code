import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KeyStore } from '../src/core/keystore'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('KeyStore', () => {
  let tempDir: string
  let keyPath: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'keystore-test-'))
    keyPath = join(tempDir, 'keys.json')
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('stores and retrieves encrypted keys', () => {
    const store = new KeyStore(keyPath)
    expect(store.has('anthropic')).toBe(false)

    store.set('anthropic', 'sk-ant-12345')
    expect(store.has('anthropic')).toBe(true)
    expect(store.get('anthropic')).toBe('sk-ant-12345')

    // Reload from file to verify persistence
    const reloaded = new KeyStore(keyPath)
    expect(reloaded.get('anthropic')).toBe('sk-ant-12345')

    // Delete key
    reloaded.set('anthropic', '')
    expect(reloaded.has('anthropic')).toBe(false)
    expect(reloaded.get('anthropic')).toBeUndefined()
  })
})
