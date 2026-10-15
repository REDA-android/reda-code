import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SettingsStore } from '../src/core/settings'
import { DEFAULT_SETTINGS } from '../src/shared/types'

const tmp = (): string => join(mkdtempSync(join(tmpdir(), 'rc-set-')), 'settings.json')

describe('SettingsStore', () => {
  it('returns defaults when file missing', () => {
    expect(new SettingsStore(tmp()).get()).toEqual(DEFAULT_SETTINGS)
  })
  it('persists patches and merges models', () => {
    const f = tmp()
    const s = new SettingsStore(f)
    s.set({ autoMode: true, models: { ...DEFAULT_SETTINGS.models, openai: 'gpt-x' } })
    const reloaded = new SettingsStore(f).get()
    expect(reloaded.autoMode).toBe(true)
    expect(reloaded.models.openai).toBe('gpt-x')
    expect(reloaded.models.anthropic).toBe(DEFAULT_SETTINGS.models.anthropic)
    expect(JSON.parse(readFileSync(f, 'utf8')).autoMode).toBe(true)
  })
  it('recovers from corrupt file', () => {
    const f = tmp()
    writeFileSync(f, '{nope')
    expect(new SettingsStore(f).get().provider).toBe('anthropic')
  })
  it('rejects unknown provider', () => {
    // @ts-expect-error testing runtime validation
    expect(() => new SettingsStore(tmp()).set({ provider: 'bogus' })).toThrow(/Unknown provider/)
  })
  it('get() returns a copy', () => {
    const s = new SettingsStore(tmp())
    s.get().mcpServers.push({ name: 'x', command: 'y' })
    expect(s.get().mcpServers).toHaveLength(0)
  })
})
