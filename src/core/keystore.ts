import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ProviderId } from '../shared/types'

export interface KeyStoreBackend {
  isAvailable(): boolean
  encrypt(plain: string): string
  decrypt(cipher: string): string
}

export class SafeStorageBackend implements KeyStoreBackend {
  private electronSafeStorage: typeof import('electron').safeStorage | null = null

  constructor() {
    if (process.versions.electron) {
      try {
        const electron = require('electron')
        this.electronSafeStorage = electron.safeStorage || null
      } catch {
        this.electronSafeStorage = null
      }
    }
  }

  isAvailable(): boolean {
    return !!this.electronSafeStorage && this.electronSafeStorage.isEncryptionAvailable()
  }

  encrypt(plain: string): string {
    if (this.electronSafeStorage && this.electronSafeStorage.isEncryptionAvailable()) {
      return this.electronSafeStorage.encryptString(plain).toString('base64')
    }
    // Fallback: base64 encoding (e.g. in tests)
    return Buffer.from(plain, 'utf8').toString('base64')
  }

  decrypt(cipher: string): string {
    const buf = Buffer.from(cipher, 'base64')
    if (this.electronSafeStorage && this.electronSafeStorage.isEncryptionAvailable()) {
      return this.electronSafeStorage.decryptString(buf)
    }
    // Fallback: base64 decoding
    return buf.toString('utf8')
  }
}

export class KeyStore {
  private keys: Record<string, string> = {}

  constructor(
    private readonly filePath: string,
    private readonly backend: KeyStoreBackend = new SafeStorageBackend()
  ) {
    this.load()
  }

  get(provider: ProviderId): string | undefined {
    const cipher = this.keys[provider]
    if (!cipher) return undefined
    try {
      return this.backend.decrypt(cipher)
    } catch {
      return undefined
    }
  }

  set(provider: ProviderId, apiKey: string): void {
    if (!apiKey) {
      delete this.keys[provider]
    } else {
      this.keys[provider] = this.backend.encrypt(apiKey)
    }
    this.save()
  }

  has(provider: ProviderId): boolean {
    return !!this.keys[provider]
  }

  listConfigured(): ProviderId[] {
    return Object.keys(this.keys) as ProviderId[]
  }

  private load(): void {
    if (!existsSync(this.filePath)) return
    try {
      this.keys = JSON.parse(readFileSync(this.filePath, 'utf8'))
    } catch {
      this.keys = {}
    }
  }

  private save(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(this.keys, null, 2), 'utf8')
  }
}
