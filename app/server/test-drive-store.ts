import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { types } from 'node:util'
import { testDrivePath } from '../src/content/test-drive-api.ts'
import type {
  CreateTestDrive, TestDriveAdministration, TestDriveAssignment, TestDriveDetail,
  TestDrivePerson, TestDrivePhase, TestDriveRole, TestDriveWorkspace,
} from '../src/content/test-drive-api.ts'
import { testDriveV1 } from '../src/content/test-drive.v1.ts'

export class PilotError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

const schema = `
  CREATE TABLE IF NOT EXISTS pilot_people (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('candidate', 'instructor', 'administrator'))
  ) STRICT;
  CREATE TABLE IF NOT EXISTS pilot_departments (id TEXT PRIMARY KEY, name TEXT NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS pilot_creation_grants (
    person_id TEXT NOT NULL REFERENCES pilot_people(id),
    department_id TEXT NOT NULL REFERENCES pilot_departments(id),
    PRIMARY KEY (person_id, department_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS pilot_instructors (
    person_id TEXT NOT NULL REFERENCES pilot_people(id),
    department_id TEXT NOT NULL REFERENCES pilot_departments(id),
    PRIMARY KEY (person_id, department_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS test_drive_templates (
    version TEXT PRIMARY KEY, definition TEXT NOT NULL CHECK (json_valid(definition))
  ) STRICT;
  CREATE TABLE IF NOT EXISTS test_drives (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES pilot_departments(id),
    candidate_id TEXT NOT NULL REFERENCES pilot_people(id),
    instructor_id TEXT NOT NULL REFERENCES pilot_people(id),
    creator_id TEXT NOT NULL REFERENCES pilot_people(id),
    created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
    revoked_at INTEGER, revoked_by TEXT REFERENCES pilot_people(id),
    template_version TEXT NOT NULL REFERENCES test_drive_templates(version),
    phase TEXT NOT NULL DEFAULT 'before' CHECK (phase IN ('before', 'driving', 'after', 'closed')),
    header TEXT NOT NULL CHECK (json_valid(header)),
    request_id TEXT NOT NULL, request_hash TEXT NOT NULL, UNIQUE (creator_id, request_id),
    CHECK (candidate_id <> instructor_id),
    CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
  ) STRICT;
  CREATE INDEX IF NOT EXISTS test_drives_by_candidate ON test_drives (candidate_id, expires_at);
  CREATE INDEX IF NOT EXISTS test_drives_by_instructor ON test_drives (instructor_id, expires_at);
  CREATE INDEX IF NOT EXISTS test_drives_by_department ON test_drives (department_id, created_at);
  CREATE TABLE IF NOT EXISTS pilot_login_challenges (
    id TEXT PRIMARY KEY, email TEXT NOT NULL, digest TEXT NOT NULL,
    created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    consumed_at INTEGER
  ) STRICT;
  CREATE INDEX IF NOT EXISTS pilot_challenges_by_email ON pilot_login_challenges (email, created_at);
  CREATE TABLE IF NOT EXISTS pilot_sessions (
    digest TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES pilot_people(id), expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS pilot_mailbox (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('code', 'invitation')),
    value TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER
  ) STRICT;
  CREATE INDEX IF NOT EXISTS pilot_mail_by_email ON pilot_mailbox (email, id);
`

const runQuery = `
  SELECT r.*, d.name AS department_name, c.name AS candidate_name, c.email AS candidate_email,
    i.name AS instructor_name, i.email AS instructor_email
  FROM test_drives r JOIN pilot_departments d ON d.id = r.department_id
    JOIN pilot_people c ON c.id = r.candidate_id JOIN pilot_people i ON i.id = r.instructor_id
`

type Account = TestDrivePerson & { kind: 'candidate' | 'instructor' | 'administrator' }

type RunRow = {
  id: string; department_id: string; department_name: string
  candidate_id: string; candidate_name: string; candidate_email: string
  instructor_id: string; instructor_name: string; instructor_email: string
  expires_at: number; revoked_at: number | null; phase: TestDrivePhase
  template_version: string; header: string; request_hash: string
}

export type AuthorizedTestDrive = RunRow & { role: TestDriveRole }

const loginCodeLifetime = 10 * 60_000
const maxCodeAttempts = 5
const maxCodeRequestsPerAddress = 5
const maxCodeRequests = 60
export const pilotSessionLifetime = 12 * 60 * 60_000

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function person({ id, name, email }: TestDrivePerson): TestDrivePerson {
  return { id, name, email }
}

function assignment(row: AuthorizedTestDrive): TestDriveAssignment {
  return {
    id: row.id,
    department: { id: row.department_id, name: row.department_name },
    role: row.role,
    candidateName: row.candidate_name,
    instructorName: row.instructor_name,
    expiresAt: new Date(row.expires_at).toISOString(),
    phase: row.phase,
  }
}

type PilotMail = { email: string; kind: 'code' | 'invitation'; value: string; now: number; expiresAt: number }
type EnqueueMail = (database: DatabaseSync, message: PilotMail) => void
type SyncResult<T> = T & (Extract<T, PromiseLike<unknown>> extends never ? unknown : never)

function enqueueLocalMail(database: DatabaseSync, mail: PilotMail) {
  database.prepare(`INSERT INTO pilot_mailbox (email, kind, value, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`)
    .run(mail.email, mail.kind, mail.value, mail.now, mail.expiresAt)
}

export class TestDriveStore {
  readonly database: DatabaseSync
  readonly enqueueMail: EnqueueMail

  constructor(file: string, enqueueMail = enqueueLocalMail) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
    this.database = new DatabaseSync(file)
    this.enqueueMail = enqueueMail
    this.database.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    this.database.exec(schema)
    const definition = JSON.stringify(testDriveV1)
    this.database.prepare('INSERT OR IGNORE INTO test_drive_templates VALUES (?, ?)').run(testDriveV1.version, definition)
    const saved = this.database.prepare('SELECT definition FROM test_drive_templates WHERE version = ?').get(testDriveV1.version)
    if (saved?.definition !== definition) throw new Error('En lagret malversjon kan ikke endres.')
  }

  transaction<T>(work: () => SyncResult<T>): T {
    if (types.isAsyncFunction(work)) throw new TypeError('SQLite-transaksjoner må være synkrone.')
    this.database.exec('BEGIN IMMEDIATE')
    try {
      const result = work()
      if (result != null && typeof (result as { then?: unknown }).then === 'function') {
        throw new TypeError('SQLite-transaksjoner må være synkrone.')
      }
      this.database.exec('COMMIT')
      return result
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  authenticate(token: string, now: number): TestDrivePerson {
    const account = this.database.prepare(`
      SELECT p.id, p.name, p.email FROM pilot_sessions s JOIN pilot_people p ON p.id = s.person_id
      WHERE s.digest = ? AND s.expires_at > ?
    `).get(digest(token), now) as TestDrivePerson | undefined
    if (!account) throw new PilotError(401, 'sign_in_required')
    return account
  }

  requestCode(email: string, now: number) {
    return this.transaction(() => {
      this.database.prepare('DELETE FROM pilot_login_challenges WHERE expires_at <= ?').run(now)
      this.database.prepare("DELETE FROM pilot_mailbox WHERE kind = 'code' AND expires_at <= ?").run(now)
      const recent = this.database.prepare(`
        SELECT count(*) AS total, count(CASE WHEN email = ? THEN 1 END) AS address_total FROM pilot_login_challenges
      `).get(email)
      if (Number(recent?.total) >= maxCodeRequests || Number(recent?.address_total) >= maxCodeRequestsPerAddress) return null

      const id = randomUUID()
      const code = String(randomInt(1_000_000)).padStart(6, '0')
      const expiresAt = now + loginCodeLifetime
      this.database.prepare(`
        INSERT INTO pilot_login_challenges (id, email, digest, created_at, expires_at) VALUES (?, ?, ?, ?, ?)
      `).run(id, email, digest(`${id}:${code}`), now, expiresAt)
      if (this.database.prepare('SELECT 1 FROM pilot_people WHERE email = ?').get(email)) {
        this.enqueueMail(this.database, { email, kind: 'code', value: code, now, expiresAt })
      }
      return id
    })
  }

  verifyCode(email: string, id: string, code: string, now: number) {
    const token = this.transaction(() => {
      const challenge = this.database.prepare(`
        SELECT digest FROM pilot_login_challenges WHERE id = ? AND email = ?
          AND expires_at > ? AND consumed_at IS NULL AND attempts < ?
      `).get(id, email, now, maxCodeAttempts)
      if (!challenge) return
      this.database.prepare('UPDATE pilot_login_challenges SET attempts = attempts + 1 WHERE id = ?').run(id)
      const expected = Buffer.from(String(challenge.digest), 'hex')
      if (!timingSafeEqual(expected, Buffer.from(digest(`${id}:${code}`), 'hex'))) return
      const account = this.database.prepare('SELECT id FROM pilot_people WHERE email = ?').get(email)
      if (!account) return

      const sessionToken = `${randomUUID()}${randomUUID()}`
      this.database.prepare('UPDATE pilot_login_challenges SET consumed_at = ? WHERE id = ?').run(now, id)
      this.database.prepare('DELETE FROM pilot_sessions WHERE expires_at <= ?').run(now)
      this.database.prepare('INSERT INTO pilot_sessions (digest, person_id, expires_at) VALUES (?, ?, ?)')
        .run(digest(sessionToken), String(account.id), now + pilotSessionLifetime)
      return sessionToken
    })
    if (!token) throw new PilotError(401, 'invalid_code')
    return token
  }

  signOut(token: string) {
    this.database.prepare('DELETE FROM pilot_sessions WHERE digest = ?').run(digest(token))
  }

  requireAssignment(personId: string, id: string, now: number, role?: TestDriveRole): AuthorizedTestDrive {
    const row = this.database.prepare(`${runQuery}
      WHERE r.id = ? AND (
        (r.candidate_id = ? AND r.expires_at > ? AND r.revoked_at IS NULL) OR r.instructor_id = ?
      )
    `).get(id, personId, now, personId) as RunRow | undefined
    if (!row) throw new PilotError(404, 'run_unavailable')
    const assignmentRole = row.candidate_id === personId ? 'candidate' : 'instructor'
    if (role && role !== assignmentRole) throw new PilotError(404, 'run_unavailable')
    return { ...row, role: assignmentRole }
  }

  withAssignment<T>(personId: string, id: string, now: number, work: (run: AuthorizedTestDrive) => SyncResult<T>, role?: TestDriveRole): T {
    if (types.isAsyncFunction(work)) throw new TypeError('SQLite-transaksjoner må være synkrone.')
    return this.transaction<T>(() => work(this.requireAssignment(personId, id, now, role)))
  }

  template(row: AuthorizedTestDrive): typeof testDriveV1 {
    const template = this.database.prepare('SELECT definition FROM test_drive_templates WHERE version = ?')
      .get(row.template_version)
    return JSON.parse(String(template?.definition))
  }

  detail(row: AuthorizedTestDrive): TestDriveDetail {
    const { version, source, headerFields, criteria, candidateChoices } = this.template(row)
    return {
      ...assignment(row),
      header: JSON.parse(row.header),
      template: { version, source, headerFields, criteria, candidateChoices },
    }
  }

  workspace(account: TestDrivePerson, now: number, origin: string): TestDriveWorkspace {
    const assignments = this.database.prepare(`${runQuery}
      WHERE (r.candidate_id = ? AND r.expires_at > ? AND r.revoked_at IS NULL) OR r.instructor_id = ?
      ORDER BY r.created_at DESC, r.id
    `).all(account.id, now, account.id) as RunRow[]
    const grants = this.database.prepare(`
      SELECT d.id, d.name FROM pilot_creation_grants g JOIN pilot_departments d ON d.id = g.department_id
      WHERE g.person_id = ? ORDER BY d.name
    `).all(account.id) as { id: string; name: string }[]
    const instructors = this.database.prepare(`
      SELECT p.id, p.name, p.email FROM pilot_instructors i JOIN pilot_people p ON p.id = i.person_id
      WHERE i.department_id = ? ORDER BY p.name, p.email
    `)
    const managed = this.database.prepare(`${runQuery}
      JOIN pilot_creation_grants g ON g.department_id = r.department_id WHERE g.person_id = ?
      ORDER BY r.created_at DESC, r.id
    `).all(account.id) as RunRow[]
    return {
      person: person(account),
      assignments: assignments.map(row => assignment({ ...row, role: row.candidate_id === account.id ? 'candidate' : 'instructor' })),
      departments: grants.map(department => ({ ...department, instructors: instructors.all(department.id) as TestDrivePerson[] })),
      administration: managed.map(row => this.administration(row, now, origin)),
    }
  }

  createRun(creator: TestDrivePerson, input: CreateTestDrive, now: number, origin: string) {
    return this.transaction(() => {
      this.requireGrant(creator.id, input.departmentId)
      const requestHash = digest(JSON.stringify(input))
      const saved = this.database.prepare(`${runQuery} WHERE r.creator_id = ? AND r.request_id = ?`)
        .get(creator.id, input.requestId) as RunRow | undefined
      if (saved) {
        if (saved.request_hash !== requestHash) throw new PilotError(409, 'request_conflict')
        return { created: false, run: this.administration(saved, now, origin) }
      }

      const expiresAt = Date.parse(input.expiresAt)
      if (expiresAt <= now) throw new PilotError(400, 'invalid_expiry')
      if (!this.database.prepare(`SELECT 1 FROM pilot_instructors WHERE department_id = ? AND person_id = ?`)
        .get(input.departmentId, input.instructorId)) throw new PilotError(400, 'invalid_instructor')

      const existing = this.database.prepare('SELECT * FROM pilot_people WHERE email = ?')
        .get(input.candidateEmail) as Account | undefined
      if (existing && (existing.kind !== 'candidate' || existing.name !== input.candidateName)) {
        throw new PilotError(409, 'candidate_conflict')
      }
      const candidateId = existing?.id ?? randomUUID()
      if (!existing) this.database.prepare("INSERT INTO pilot_people VALUES (?, ?, ?, 'candidate')")
        .run(candidateId, input.candidateName, input.candidateEmail)

      const id = randomUUID()
      this.database.prepare(`
        INSERT INTO test_drives (id, department_id, candidate_id, instructor_id, creator_id, created_at,
          expires_at, template_version, header, request_id, request_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, input.departmentId, candidateId, input.instructorId, creator.id, now, expiresAt,
        testDriveV1.version, JSON.stringify(input.header), input.requestId, requestHash)
      const run = this.administration(this.getRun(id), now, origin)
      this.enqueueMail(this.database, { email: input.candidateEmail, kind: 'invitation', value: run.invitationUrl, now, expiresAt })
      return { created: true, run }
    })
  }

  revokeCandidate(creator: TestDrivePerson, id: string, now: number, origin: string) {
    return this.transaction(() => {
      if (!this.database.prepare(`
        SELECT 1 FROM test_drives r JOIN pilot_creation_grants g ON g.department_id = r.department_id
        WHERE r.id = ? AND g.person_id = ?
      `).get(id, creator.id)) throw new PilotError(404, 'run_unavailable')
      this.database.prepare('UPDATE test_drives SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL AND expires_at > ?')
        .run(now, creator.id, id, now)
      return this.administration(this.getRun(id), now, origin)
    })
  }

  private requireGrant(personId: string, departmentId: string) {
    if (!this.database.prepare('SELECT 1 FROM pilot_creation_grants WHERE person_id = ? AND department_id = ?')
      .get(personId, departmentId)) throw new PilotError(403, 'department_forbidden')
  }

  private getRun(id: string) {
    const row = this.database.prepare(`${runQuery} WHERE r.id = ?`).get(id) as RunRow | undefined
    if (!row) throw new PilotError(404, 'run_unavailable')
    return row
  }

  private administration(row: RunRow, now: number, origin: string): TestDriveAdministration {
    return {
      id: row.id,
      department: { id: row.department_id, name: row.department_name },
      candidate: { id: row.candidate_id, name: row.candidate_name, email: row.candidate_email },
      instructor: { id: row.instructor_id, name: row.instructor_name, email: row.instructor_email },
      expiresAt: new Date(row.expires_at).toISOString(),
      revokedAt: row.revoked_at === null ? null : new Date(row.revoked_at).toISOString(),
      access: row.revoked_at !== null ? 'revoked' : row.expires_at <= now ? 'expired' : 'active',
      invitationUrl: new URL(`${testDrivePath}?lop=${row.id}`, origin).href,
    }
  }
}
