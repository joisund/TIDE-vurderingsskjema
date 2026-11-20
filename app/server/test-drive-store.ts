import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { types } from 'node:util'
import { testDriveCommentLimits, testDrivePath } from '../src/content/test-drive-api.ts'
import type {
  CreateTestDrive, TestDriveAdministration, TestDriveAssessmentAction, TestDriveAssignment,
  TestDriveCandidateAssessment, TestDriveCandidatePart, TestDriveCandidateWrite, TestDriveDetail,
  TestDriveClosedDocument,
  TestDriveInstructorAssessment, TestDriveInstructorFields, TestDriveInstructorWrite,
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
  CREATE TABLE IF NOT EXISTS test_drive_candidate_assessments (
    drive_id TEXT NOT NULL REFERENCES test_drives(id),
    part TEXT NOT NULL CHECK (part IN ('before', 'after')),
    revision INTEGER NOT NULL CHECK (revision > 0),
    answers TEXT NOT NULL CHECK (json_type(answers) = 'object'),
    submitted_at INTEGER,
    PRIMARY KEY (drive_id, part)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS test_drive_candidate_requests (
    drive_id TEXT NOT NULL, part TEXT NOT NULL,
    request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
    PRIMARY KEY (drive_id, part, request_id),
    FOREIGN KEY (drive_id, part) REFERENCES test_drive_candidate_assessments(drive_id, part)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS test_drive_instructor_assessments (
    drive_id TEXT PRIMARY KEY REFERENCES test_drives(id),
    revision INTEGER NOT NULL CHECK (revision > 0),
    author_id TEXT NOT NULL REFERENCES pilot_people(id),
    assessment TEXT NOT NULL CHECK (json_type(assessment) = 'object'),
    submitted_at INTEGER
  ) STRICT;
  CREATE TABLE IF NOT EXISTS test_drive_instructor_requests (
    drive_id TEXT NOT NULL REFERENCES test_drive_instructor_assessments(drive_id),
    request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision > 0),
    author_id TEXT NOT NULL REFERENCES pilot_people(id),
    PRIMARY KEY (drive_id, request_id), UNIQUE (drive_id, revision)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS test_drive_closed_documents (
    drive_id TEXT PRIMARY KEY REFERENCES test_drives(id),
    document TEXT NOT NULL CHECK (json_type(document) = 'object')
  ) STRICT;
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
type AssignmentRow = Pick<RunRow, 'id' | 'department_id' | 'department_name' | 'candidate_id' |
  'candidate_name' | 'instructor_name' | 'expires_at' | 'phase'>

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

function assignment(row: AssignmentRow & { role: TestDriveRole }, document?: TestDriveClosedDocument): TestDriveAssignment {
  return {
    id: row.id,
    department: document?.department ?? { id: row.department_id, name: row.department_name },
    role: row.role,
    candidateName: document?.candidate.name ?? row.candidate_name,
    instructorName: document?.instructor.name ?? row.instructor_name,
    expiresAt: new Date(row.expires_at).toISOString(),
    phase: row.phase,
  }
}

type PilotMail = { email: string; kind: 'code' | 'invitation'; value: string; now: number; expiresAt: number }
type EnqueueMail = (database: DatabaseSync, message: PilotMail) => void
type SyncResult<T> = T & (Extract<T, PromiseLike<unknown>> extends never ? unknown : never)
type UnvalidatedInstructorWrite = Pick<TestDriveInstructorWrite, 'requestId' | 'revision'> & {
  answers: Record<string, unknown>
  comments: Record<string, unknown>
  overallComment: unknown
  result: unknown
}

function instructorComment(value: unknown, limit: number) {
  if (typeof value !== 'string' || value.length > limit) throw new PilotError(400, 'invalid_input')
  for (const character of value) {
    const code = character.charCodeAt(0)
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) {
      throw new PilotError(400, 'invalid_input')
    }
  }
  return value
}

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

  transaction<T>(work: () => SyncResult<T>, begin: 'BEGIN' | 'BEGIN IMMEDIATE' = 'BEGIN IMMEDIATE'): T {
    if (types.isAsyncFunction(work)) throw new TypeError('SQLite-transaksjoner må være synkrone.')
    this.database.exec(begin)
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
    if (row.phase === 'closed') return this.exportSource(row).template
    const template = this.database.prepare('SELECT definition FROM test_drive_templates WHERE version = ?')
      .get(row.template_version)
    return JSON.parse(String(template?.definition))
  }

  detail(row: AuthorizedTestDrive): TestDriveDetail {
    if (row.phase === 'closed') {
      const document = this.exportSource(row)
      return { ...assignment(row, document), phase: 'closed', document }
    }
    const { version, source, headerFields, criteria, candidateChoices, instructorChoices, resultChoices } = this.template(row)
    const common = {
      ...assignment(row),
      phase: row.phase,
      header: JSON.parse(row.header),
      template: { version, source, headerFields, criteria, candidateChoices },
    }
    const before = this.candidateAssessment(row.id, 'before')
    const after = this.candidateAssessment(row.id, 'after')
    if (row.role === 'candidate') {
      return { ...common, role: 'candidate', candidateAssessments: { before, after } }
    }
    return {
      ...common,
      role: 'instructor',
      template: { ...common.template, instructorChoices, resultChoices },
      candidateAssessments: {
        before: { revision: before.revision, submittedAt: before.submittedAt },
        after: { revision: after.revision, submittedAt: after.submittedAt },
      },
      instructorAssessment: this.instructorAssessment(row.id),
    }
  }

  candidateAssessment(driveId: string, part: TestDriveCandidatePart): TestDriveCandidateAssessment {
    const saved = this.database.prepare(`
      SELECT revision, answers, submitted_at FROM test_drive_candidate_assessments WHERE drive_id = ? AND part = ?
    `).get(driveId, part) as { revision: number; answers: string; submitted_at: number | null } | undefined
    if (!saved) return { revision: 0, answers: {}, submittedAt: null }
    return {
      revision: saved.revision,
      answers: JSON.parse(saved.answers),
      submittedAt: saved.submitted_at === null ? null : new Date(saved.submitted_at).toISOString(),
    }
  }

  writeCandidateAssessment(run: AuthorizedTestDrive, part: TestDriveCandidatePart, action: TestDriveAssessmentAction,
    input: Omit<TestDriveCandidateWrite, 'answers'> & { answers: Record<string, unknown> }, now: number) {
    if (run.role !== 'candidate') throw new PilotError(404, 'run_unavailable')
    const { criteria, candidateChoices } = this.template(run)
    const criterionIds = new Set<string>(criteria.map(criterion => criterion.id))
    const choiceIds = new Set<unknown>(candidateChoices.map(choice => choice.id))
    const answerIds = Object.keys(input.answers).sort()
    if (answerIds.some(id => !criterionIds.has(id) || !choiceIds.has(input.answers[id]))) {
      throw new PilotError(400, 'invalid_input')
    }
    const answers = JSON.stringify(Object.fromEntries(answerIds.map(id => [id, input.answers[id]])))
    const requestHash = digest(JSON.stringify([action, input.revision, answers]))
    const receipt = this.database.prepare(`
      SELECT request_hash FROM test_drive_candidate_requests WHERE drive_id = ? AND part = ? AND request_id = ?
    `).get(run.id, part, input.requestId)
    if (receipt) {
      if (receipt.request_hash !== requestHash) throw new PilotError(409, 'candidate_request_conflict')
      return this.detail(run)
    }

    const saved = this.candidateAssessment(run.id, part)
    if (saved.submittedAt !== null) throw new PilotError(409, 'assessment_locked')
    if (run.phase !== part) throw new PilotError(409, 'assessment_not_open')
    if (input.revision !== saved.revision) throw new PilotError(409, 'stale_revision')
    const submitted = action === 'submit'
    if (submitted && answerIds.length !== criteria.length) throw new PilotError(400, 'assessment_incomplete')

    this.database.prepare(`
      INSERT INTO test_drive_candidate_assessments (drive_id, part, revision, answers, submitted_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (drive_id, part) DO UPDATE
      SET revision = excluded.revision, answers = excluded.answers, submitted_at = excluded.submitted_at
    `).run(run.id, part, saved.revision + 1, answers, submitted ? now : null)
    this.database.prepare(`
      INSERT INTO test_drive_candidate_requests (drive_id, part, request_id, request_hash) VALUES (?, ?, ?, ?)
    `).run(run.id, part, input.requestId, requestHash)
    if (submitted && part === 'before') {
      this.database.prepare("UPDATE test_drives SET phase = 'driving' WHERE id = ?").run(run.id)
      return this.detail({ ...run, phase: 'driving' })
    }
    return this.detail(run)
  }

  instructorAssessment(driveId: string): TestDriveInstructorAssessment {
    const saved = this.database.prepare(`
      SELECT revision, author_id, assessment, submitted_at FROM test_drive_instructor_assessments WHERE drive_id = ?
    `).get(driveId) as { revision: number; author_id: string; assessment: string; submitted_at: number | null } | undefined
    if (!saved) {
      return { revision: 0, authorId: null, submittedAt: null, answers: {}, comments: {}, overallComment: '', result: null }
    }
    const assessment = JSON.parse(saved.assessment) as TestDriveInstructorFields
    return {
      ...assessment,
      revision: saved.revision,
      authorId: saved.author_id,
      submittedAt: saved.submitted_at === null ? null : new Date(saved.submitted_at).toISOString(),
    }
  }

  writeInstructorAssessment(run: AuthorizedTestDrive, action: TestDriveAssessmentAction, input: UnvalidatedInstructorWrite, now: number) {
    if (run.role !== 'instructor') throw new PilotError(404, 'run_unavailable')
    const { criteria, instructorChoices, resultChoices } = this.template(run)
    const criterionIds = new Set<string>(criteria.map(({ id }) => id))
    const answers: TestDriveInstructorFields['answers'] = {}
    const comments: TestDriveInstructorFields['comments'] = {}
    const answerIds = Object.keys(input.answers).sort()
    for (const id of answerIds) {
      const choice = instructorChoices.find(choice => choice.id === input.answers[id])
      if (!criterionIds.has(id) || !choice) throw new PilotError(400, 'invalid_input')
      answers[id] = choice.id
    }
    for (const id of Object.keys(input.comments).sort()) {
      if (!criterionIds.has(id)) throw new PilotError(400, 'invalid_input')
      comments[id] = instructorComment(input.comments[id], testDriveCommentLimits.criterion)
    }
    const overallComment = instructorComment(input.overallComment, testDriveCommentLimits.overall)
    const result = resultChoices.find(choice => choice.id === input.result)?.id ?? null
    if (result === null && input.result !== null) throw new PilotError(400, 'invalid_input')

    const assessment = JSON.stringify({ answers, comments, overallComment, result })
    const requestHash = digest(JSON.stringify([action, input.revision, assessment]))
    const receipt = this.database.prepare(`
      SELECT request_hash, author_id FROM test_drive_instructor_requests WHERE drive_id = ? AND request_id = ?
    `).get(run.id, input.requestId)
    if (receipt) {
      if (receipt.request_hash !== requestHash || receipt.author_id !== run.instructor_id) {
        throw new PilotError(409, 'instructor_request_conflict')
      }
      return this.detail(run)
    }

    const saved = this.instructorAssessment(run.id)
    if (saved.submittedAt !== null) throw new PilotError(409, 'assessment_locked')
    if (run.phase !== 'driving' && run.phase !== 'after') throw new PilotError(409, 'assessment_not_open')
    if (input.revision !== saved.revision) throw new PilotError(409, 'stale_revision')
    const submitted = action === 'submit'
    if (submitted && answerIds.length !== criteria.length) throw new PilotError(400, 'assessment_incomplete')
    if (submitted && result === null) throw new PilotError(400, 'result_required')

    const revision = saved.revision + 1
    this.database.prepare(`
      INSERT INTO test_drive_instructor_assessments (drive_id, revision, author_id, assessment, submitted_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (drive_id) DO UPDATE SET revision = excluded.revision, author_id = excluded.author_id,
        assessment = excluded.assessment, submitted_at = excluded.submitted_at
    `).run(run.id, revision, run.instructor_id, assessment, submitted ? now : null)
    this.database.prepare(`
      INSERT INTO test_drive_instructor_requests (drive_id, request_id, request_hash, revision, author_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(run.id, input.requestId, requestHash, revision, run.instructor_id)
    return this.detail(run)
  }

  completeDriving(run: AuthorizedTestDrive) {
    if (run.role !== 'instructor') throw new PilotError(404, 'run_unavailable')
    if (run.phase === 'after' || run.phase === 'closed') return this.detail(run)
    if (run.phase !== 'driving') throw new PilotError(409, 'before_not_submitted')
    this.database.prepare("UPDATE test_drives SET phase = 'after' WHERE id = ?").run(run.id)
    return this.detail({ ...run, phase: 'after' })
  }

  closeRun(run: AuthorizedTestDrive, now: number) {
    if (run.role !== 'instructor') throw new PilotError(404, 'run_unavailable')
    if (run.phase === 'closed') return this.detail(run)

    const before = this.candidateAssessment(run.id, 'before')
    const after = this.candidateAssessment(run.id, 'after')
    const instructor = this.instructorAssessment(run.id)
    if (run.phase !== 'after' || !before.submittedAt || !after.submittedAt || !instructor.submittedAt ||
      instructor.result === null) throw new PilotError(409, 'run_incomplete')
    if (instructor.authorId !== run.instructor_id) throw new Error('Den leverte vurderingen har feil avsender.')

    const document: TestDriveClosedDocument = {
      documentVersion: 1,
      runId: run.id,
      department: { id: run.department_id, name: run.department_name },
      header: JSON.parse(run.header),
      template: this.template(run),
      candidate: { id: run.candidate_id, name: run.candidate_name, email: run.candidate_email },
      instructor: { id: instructor.authorId, name: run.instructor_name },
      closedAt: new Date(now).toISOString(),
      closedBy: run.instructor_id,
      candidateAssessments: {
        before: { ...before, submittedAt: before.submittedAt },
        after: { ...after, submittedAt: after.submittedAt },
      },
      instructorAssessment: { ...instructor, submittedAt: instructor.submittedAt, authorId: instructor.authorId, result: instructor.result },
    }
    this.database.prepare('INSERT INTO test_drive_closed_documents VALUES (?, ?)').run(run.id, JSON.stringify(document))
    this.database.prepare("UPDATE test_drives SET phase = 'closed' WHERE id = ?").run(run.id)
    return this.detail({ ...run, phase: 'closed' })
  }

  exportSource(run: AuthorizedTestDrive): TestDriveClosedDocument {
    if (run.phase !== 'closed') throw new PilotError(409, 'run_not_closed')
    const source = this.database.prepare('SELECT document FROM test_drive_closed_documents WHERE drive_id = ?')
      .get(run.id)
    if (typeof source?.document !== 'string') throw new Error('Avsluttet testkjøring mangler dokumentkilde.')
    return JSON.parse(source.document)
  }

  readExportSource(token: string, id: string, clock: () => number) {
    return this.transaction(() => {
      const now = clock()
      const account = this.authenticate(token, now)
      return this.exportSource(this.requireAssignment(account.id, id, now))
    }, 'BEGIN')
  }

  workspace(account: TestDrivePerson, now: number, origin: string): TestDriveWorkspace {
    const assignments = this.database.prepare(`
      SELECT r.id, r.phase, r.expires_at, r.candidate_id,
        coalesce(json_extract(s.document, '$.department.id'), r.department_id) AS department_id,
        coalesce(json_extract(s.document, '$.department.name'), r.department_name) AS department_name,
        coalesce(json_extract(s.document, '$.candidate.name'), r.candidate_name) AS candidate_name,
        coalesce(json_extract(s.document, '$.instructor.name'), r.instructor_name) AS instructor_name
      FROM (${runQuery}) r
        LEFT JOIN test_drive_closed_documents s ON s.drive_id = r.id AND r.phase = 'closed'
      WHERE (r.candidate_id = ? AND r.expires_at > ? AND r.revoked_at IS NULL) OR r.instructor_id = ?
      ORDER BY r.created_at DESC, r.id
    `).all(account.id, now, account.id) as AssignmentRow[]
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
