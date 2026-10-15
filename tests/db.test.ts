import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SQLiteStore } from '../src/core/storage/db'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('SQLiteStore', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'db-test-'))
    dbPath = join(tempDir, 'sessions.sqlite')
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('creates, saves, retrieves, and deletes sessions and messages', async () => {
    const store = new SQLiteStore(dbPath)
    await store.init()

    expect(store.listSessions()).toEqual([])

    const session = store.createSession('Test Session')
    expect(session.title).toBe('Test Session')
    expect(session.id).toBeDefined()

    // Add a message and save
    session.messages.push({
      role: 'user',
      content: [{ type: 'text', text: 'Hello SQLite' }]
    })
    session.messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello human!' }]
    })
    store.saveSession(session)

    // Reopen from disk in a fresh instance
    const reloaded = new SQLiteStore(dbPath)
    await reloaded.init()

    const sessions = reloaded.listSessions()
    expect(sessions.length).toBe(1)
    expect(sessions[0].id).toBe(session.id)

    const loadedSession = reloaded.getSession(session.id)
    expect(loadedSession).not.toBeNull()
    expect(loadedSession?.messages.length).toBe(2)
    expect(loadedSession?.messages[0].content).toEqual([{ type: 'text', text: 'Hello SQLite' }])

    // Delete session
    reloaded.deleteSession(session.id)
    expect(reloaded.listSessions().length).toBe(0)
    expect(reloaded.getSession(session.id)).toBeNull()
  })
})
