import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Pool, type QueryResultRow } from 'pg'
import { randomUUID } from 'node:crypto'
import { hashPassword } from './password'

export type DbUserRow = {
  id: string
  email: string
  password_hash: string
}

export type DbCallRow = {
  call_id: string
  room_name: string
  owner_id: string
  owner_email: string
  source_language: 'es' | 'en' | null
  target_language: 'es' | 'en' | null
  translation_enabled: boolean
  translation_dispatch_id: string | null
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://root:root@127.0.0.1:5432/videovoice2voice',
  })

  async onModuleInit() {
    await this.waitForConnection()
    await this.ensureSchema()
  }

  async onModuleDestroy() {
    await this.pool.end()
  }

  query<T extends QueryResultRow>(text: string, params?: unknown[]) {
    return this.pool.query<T>(text, params)
  }

  private async waitForConnection() {
    const maxAttempts = 20
    const delayMs = 1500
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.pool.query('SELECT 1')
        return
      } catch (error) {
        lastError = error
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : 'No se pudo conectar a PostgreSQL'
    throw new Error(`No se pudo conectar a PostgreSQL tras varios intentos: ${message}`)
  }

  async getUserByEmail(email: string) {
    const result = await this.query<DbUserRow>(
      'SELECT id, email, password_hash FROM app_users WHERE email = $1 LIMIT 1',
      [email],
    )
    return result.rows[0] ?? null
  }

  async getUserBySessionToken(accessToken: string) {
    const result = await this.query<{ id: string; email: string }>(
      `
        SELECT u.id, u.email
        FROM auth_sessions s
        INNER JOIN app_users u ON u.id = s.user_id
        WHERE s.access_token = $1
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [accessToken],
    )

    return result.rows[0] ?? null
  }

  async createSession(userId: string) {
    const accessToken = randomUUID()
    await this.query(
      `
        INSERT INTO auth_sessions (access_token, user_id, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '30 days')
      `,
      [accessToken, userId],
    )

    return accessToken
  }

  async createCall(ownerId: string) {
    const callId = randomUUID()
    const roomName = `video-call-${callId}`
    await this.query(
      `
        INSERT INTO calls (call_id, room_name, owner_id)
        VALUES ($1, $2, $3)
      `,
      [callId, roomName, ownerId],
    )

    return { callId, roomName }
  }

  async getCallById(callId: string) {
    const result = await this.query<DbCallRow>(
      `
        SELECT
          c.call_id,
          c.room_name,
          c.owner_id,
          u.email AS owner_email,
          c.source_language,
          c.target_language,
          c.translation_enabled,
          c.translation_dispatch_id
        FROM calls c
        INNER JOIN app_users u ON u.id = c.owner_id
        WHERE c.call_id = $1
        LIMIT 1
      `,
      [callId],
    )

    return result.rows[0] ?? null
  }

  async updateCallTranslation(callId: string, sourceLanguage: 'es' | 'en', targetLanguage: 'es' | 'en') {
    await this.query(
      `
        UPDATE calls
        SET source_language = $2,
            target_language = $3,
            translation_enabled = TRUE,
            updated_at = NOW()
        WHERE call_id = $1
      `,
      [callId, sourceLanguage, targetLanguage],
    )
  }

  async setCallTranslationDispatch(callId: string, dispatchId: string) {
    await this.query(
      `
        UPDATE calls
        SET translation_dispatch_id = $2,
            updated_at = NOW()
        WHERE call_id = $1
      `,
      [callId, dispatchId],
    )
  }

  private async ensureSchema() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await this.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        access_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `)

    await this.query(`
      CREATE TABLE IF NOT EXISTS calls (
        call_id TEXT PRIMARY KEY,
        room_name TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
        source_language TEXT NULL CHECK (source_language IN ('es', 'en')),
        target_language TEXT NULL CHECK (target_language IN ('es', 'en')),
        translation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        translation_dispatch_id TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await this.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`)
    await this.query(`CREATE INDEX IF NOT EXISTS idx_calls_owner_id ON calls(owner_id)`)

    const seedEmail = process.env.DEMO_USER_EMAIL ?? 'demo@app.com'
    const seedPassword = process.env.DEMO_USER_PASSWORD ?? 'demo-demo-demo'
    const existingUser = await this.getUserByEmail(seedEmail)

    if (!existingUser) {
      await this.query(
        `
          INSERT INTO app_users (id, email, password_hash)
          VALUES ($1, $2, $3)
        `,
        ['user_demo_1', seedEmail, await hashPassword(seedPassword)],
      )
    }
  }
}
