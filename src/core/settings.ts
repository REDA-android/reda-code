import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_SETTINGS, PROVIDER_IDS, type Settings } from '../shared/types'

/** JSON-file backed settings with defaults merging and atomic-ish writes. */
export class SettingsStore {
  private value: Settings

  constructor(private readonly file: string) {
    this.value = this.load()
  }

  get(): Settings {
    return structuredClone(this.value)
  }

  set(patch: Partial<Settings>): Settings {
    const next: Settings = { ...this.value, ...patch }
    if (patch.models) next.models = { ...this.value.models, ...patch.models }
    if (!PROVIDER_IDS.includes(next.provider)) throw new Error(`Unknown provider: ${String(next.provider)}`)
    this.value = next
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(this.value, null, 2), 'utf8')
    return this.get()
  }

  private load(): Settings {
    if (!existsSync(this.file)) return structuredClone(DEFAULT_SETTINGS)
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<Settings>
      return {
        ...structuredClone(DEFAULT_SETTINGS),
        ...raw,
        models: { ...DEFAULT_SETTINGS.models, ...(raw.models ?? {}) }
      }
    } catch {
      return structuredClone(DEFAULT_SETTINGS)
    }
  }
}
