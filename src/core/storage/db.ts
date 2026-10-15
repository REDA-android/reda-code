import initSqlJs, { type Database } from 'sql.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ChatMessage, Session, SessionSummary } from '../../shared/types'

export class SQLiteStore {
  private db: Database | null = null
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs()
    if (existsSync(this.dbPath)) {
      try {
        const fileBuffer = readFileSync(this.dbPath)
        this.db = new SQL.Database(fileBuffer)
      } catch {
        this.db = new SQL.Database()
      }
    } else {
      this.db = new SQL.Database()
    }

    this.runMigrations()
  }

  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized')

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_sessionId ON messages(sessionId);
    `)
    this.save()
  }

  listSessions(): SessionSummary[] {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(
      'SELECT id, title, createdAt, updatedAt FROM sessions ORDER BY updatedAt DESC'
    )
    const list: SessionSummary[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      list.push({
        id: row.id,
        title: row.title,
        createdAt: Number(row.createdAt),
        updatedAt: Number(row.updatedAt)
      })
    }
    stmt.free()
    return list
  }

  createSession(title = 'Nouvelle session'): Session {
    if (!this.db) throw new Error('Database not initialized')
    const now = Date.now()
    const id = `sess_${now}_${Math.random().toString(36).slice(2, 7)}`

    this.db.run(
      'INSERT INTO sessions (id, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [id, title, now, now]
    )
    this.save()

    return {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messages: []
    }
  }

  getSession(id: string): Session | null {
    if (!this.db) throw new Error('Database not initialized')
    const sStmt = this.db.prepare('SELECT id, title, createdAt, updatedAt FROM sessions WHERE id = ?')
    sStmt.bind([id])
    if (!sStmt.step()) {
      sStmt.free()
      return null
    }
    const sRow = sStmt.getAsObject() as any
    sStmt.free()

    const mStmt = this.db.prepare(
      'SELECT role, content FROM messages WHERE sessionId = ? ORDER BY id ASC'
    )
    mStmt.bind([id])
    const messages: ChatMessage[] = []
    while (mStmt.step()) {
      const mRow = mStmt.getAsObject() as any
      try {
        messages.push({
          role: mRow.role,
          content: JSON.parse(mRow.content)
        })
      } catch {
        // Skip malformed
      }
    }
    mStmt.free()

    return {
      id: sRow.id,
      title: sRow.title,
      createdAt: Number(sRow.createdAt),
      updatedAt: Number(sRow.updatedAt),
      messages
    }
  }

  saveSession(session: Session): void {
    if (!this.db) throw new Error('Database not initialized')
    const now = Date.now()

    this.db.run(
      'INSERT OR REPLACE INTO sessions (id, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [session.id, session.title, session.createdAt, now]
    )

    // Clear existing messages for session and re-insert
    this.db.run('DELETE FROM messages WHERE sessionId = ?', [session.id])
    for (const msg of session.messages) {
      this.db.run(
        'INSERT INTO messages (sessionId, role, content, createdAt) VALUES (?, ?, ?, ?)',
        [session.id, msg.role, JSON.stringify(msg.content), now]
      )
    }

    this.save()
  }

  deleteSession(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.run('DELETE FROM messages WHERE sessionId = ?', [id])
    this.db.run('DELETE FROM sessions WHERE id = ?', [id])
    this.save()
  }

  private save(): void {
    if (!this.db) return
    mkdirSync(dirname(this.dbPath), { recursive: true })
    const data = this.db.export()
    writeFileSync(this.dbPath, Buffer.from(data))
  }
}
