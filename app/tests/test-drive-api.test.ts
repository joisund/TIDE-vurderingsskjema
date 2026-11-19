import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtempSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { seedPilot } from '../server/pilot-accounts.ts'
import { pilotDatabaseFile } from '../server/pilot-config.ts'
import { createTestDriveApi } from '../server/test-drive-api.ts'
import { PilotError, TestDriveStore } from '../server/test-drive-store.ts'
import { testDriveApiPath } from '../src/content/test-drive-api.ts'
import type { CreateTestDrive, TestDriveAdministration, TestDriveDetail, TestDriveWorkspace } from '../src/content/test-drive-api.ts'
import { testDriveV1 } from '../src/content/test-drive.v1.ts'

const bergen = 'opplaering-bergen@pilot.test'
const stavanger = 'opplaering-stavanger@pilot.test'
const candidateOne = 'kandidat-1@pilot.test'
const candidateTwo = 'kandidat-2@pilot.test'
const instructorOne = 'instruktor-bergen@pilot.test'
const instructorTwo = 'instruktor-bergen-2@pilot.test'

async function open(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tide-test-drive-'))
  const file = join(dir, 'pilot.sqlite')
  let now = Date.parse('2026-11-19T12:00:00.000Z')
  let store: TestDriveStore
  let api: ReturnType<typeof createTestDriveApi>
  let server: ReturnType<typeof createServer>
  let origin: string
  async function start(port = 0) {
    store = new TestDriveStore(file)
    seedPilot(store)
    server = createServer((request, response) => void api(request, response))
    server.listen(port, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Fant ikke adressen til testserveren.')
    origin = `http://127.0.0.1:${address.port}`
    api = createTestDriveApi(store, new URL(origin), () => now)
  }
  async function stop() {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    store.database.close()
  }
  await start()
  t.after(async () => {
    await stop()
    rmSync(file, { force: true })
    rmdirSync(dir)
  })

  async function call(path: string, options: { cookie?: string; body?: object; origin?: string; type?: string } = {}) {
    const headers = new Headers({ Connection: 'close' })
    if (options.cookie) headers.set('Cookie', options.cookie)
    if (options.body) {
      headers.set('Origin', options.origin ?? origin)
      headers.set('Content-Type', options.type ?? 'application/json')
    }
    const response = await fetch(`${origin}${testDriveApiPath}${path}`, {
      method: options.body ? 'POST' : 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined,
    })
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    return response
  }

  async function requestCode(email: string) {
    const response = await call('/auth/code', { body: { email } })
    assert.equal(response.status, 202)
    const data = await response.json() as { challengeId: string | null }
    assert.deepEqual(Object.keys(data), ['challengeId'])
    return data.challengeId
  }

  function lastCode(email: string) {
    const row = store.database.prepare("SELECT value FROM pilot_mailbox WHERE email = ? AND kind = 'code' ORDER BY id DESC LIMIT 1").get(email)
    assert.ok(row)
    return String(row.value)
  }

  async function signIn(email: string) {
    const challengeId = await requestCode(email)
    assert.ok(challengeId)
    const response = await call('/auth/verify', { body: { email, challengeId, code: lastCode(email) } })
    assert.equal(response.status, 200)
    const cookie = response.headers.get('set-cookie')
    assert.ok(cookie)
    assert.match(cookie, /Path=\/api\/testkjoring; HttpOnly; SameSite=Strict/)
    return cookie.split(';', 1)[0]!
  }

  function command(options: Partial<CreateTestDrive> = {}): CreateTestDrive {
    return {
      requestId: randomUUID(), departmentId: 'bergen', candidateName: 'Nora Eksempel', candidateEmail: candidateOne,
      instructorId: 'instructor-bergen', expiresAt: new Date(now + 60_000).toISOString(), header: { bus: 'Testbuss 7' },
      ...options,
    }
  }

  async function create(cookie: string, body = command()) {
    const response = await call('/runs', { cookie, body })
    assert.equal(response.status, 201)
    return await response.json() as TestDriveAdministration
  }

  return {
    call, requestCode, lastCode, signIn, command, create,
    get store() { return store }, get now() { return now }, get origin() { return origin },
    advance(milliseconds: number) { now += milliseconds },
    async restart() { const port = Number(new URL(origin).port); await stop(); await start(port) },
  }
}

test('engangskode er kortvarig, begrenset og forbrukes ved separat serverinnlogging', async t => {
  const pilot = await open(t)
  const email = 'kandidat-1@pilot.test'
  const verify = (challengeId: string, code: string, address = email) => pilot.call('/auth/verify', { body: { email: address, challengeId, code } })
  const unknown = await pilot.requestCode('ikke-registrert@pilot.test')
  assert.ok(unknown)
  assert.equal(pilot.store.database.prepare('SELECT count(*) AS total FROM pilot_mailbox').get()?.total, 0)
  assert.equal((await verify(unknown, '123456', 'ikke-registrert@pilot.test')).status, 401)

  const locked = await pilot.requestCode(email)
  assert.ok(locked)
  const secret = pilot.lastCode(email)
  const incorrect = secret === '000000' ? '111111' : '000000'
  assert.equal((await verify(locked, secret, candidateTwo)).status, 401)
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await verify(locked, incorrect)).status, 401)
  assert.equal((await verify(locked, secret)).status, 401)

  const expired = await pilot.requestCode(email)
  assert.ok(expired)
  const expiredCode = pilot.lastCode(email)
  pilot.advance(10 * 60_000)
  assert.equal((await verify(expired, expiredCode)).status, 401)

  const valid = await pilot.requestCode(email)
  assert.ok(valid)
  const code = pilot.lastCode(email)
  const responses = await Promise.all([verify(valid, code), verify(valid, code)])
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 401])
  const cookie = responses.find(response => response.ok)!.headers.get('set-cookie')!.split(';', 1)[0]!
  assert.equal((await pilot.call('/workspace', { cookie })).status, 200)
  assert.equal((await pilot.call('/auth/logout', { cookie, body: {} })).status, 200)
  assert.equal((await pilot.call('/workspace', { cookie })).status, 401)
})

test('kodeutstedelse bruker fiktive adresser, gjenbrukbar tidligere kode og en felles kvote som nullstilles etter utløp', async t => {
  const pilot = await open(t)
  assert.equal((await pilot.call('/auth/code', { body: { email: 'kandidat@example.org' } })).status, 400)
  assert.equal((await pilot.call('/auth/verify', { body: { email: 'kandidat@example.org', challengeId: randomUUID(), code: '123456' } })).status, 400)
  const first = await pilot.requestCode(candidateOne)
  const firstCode = pilot.lastCode(candidateOne)
  for (let index = 0; index < 4; index++) assert.ok(await pilot.requestCode(candidateOne))
  assert.equal(await pilot.requestCode(candidateOne), null)
  for (let index = 0; index < 55; index++) assert.ok(await pilot.requestCode(`ukjent-${index}@pilot.test`))
  assert.equal(await pilot.requestCode(candidateTwo), null)
  assert.equal(await pilot.requestCode('ukjent-over-grensen@pilot.test'), null)
  assert.equal(pilot.store.database.prepare('SELECT count(*) AS total FROM pilot_login_challenges').get()?.total, 60)
  assert.equal((await pilot.call('/auth/verify', { body: { email: candidateOne, challengeId: first, code: firstCode } })).status, 200)

  pilot.advance(10 * 60_000)
  assert.ok(await pilot.requestCode(candidateOne))
  assert.ok(await pilot.requestCode(candidateTwo))
  assert.equal(pilot.store.database.prepare('SELECT count(*) AS total FROM pilot_login_challenges').get()?.total, 2)
})

test('to pilotporter bruker uavhengige øktcookies', async t => {
  const pilot = await open(t)
  const otherPilot = await open(t)
  const cookieOne = await pilot.signIn(candidateOne)
  const cookieTwo = await otherPilot.signIn(candidateTwo)
  assert.match(cookieOne, new RegExp(`^tide_test_drive_${new URL(pilot.origin).port}=`))
  assert.match(cookieTwo, new RegExp(`^tide_test_drive_${new URL(otherPilot.origin).port}=`))
  const cookie = `${cookieOne}; ${cookieTwo}`
  assert.equal((await pilot.call('/workspace', { cookie })).status, 200)
  assert.equal((await otherPilot.call('/workspace', { cookie })).status, 200)
  const logout = await pilot.call('/auth/logout', { cookie, body: {} })
  assert.match(logout.headers.get('set-cookie') ?? '', new RegExp(`^tide_test_drive_${new URL(pilot.origin).port}=;`))
  assert.equal((await pilot.call('/workspace', { cookie })).status, 401)
  assert.equal((await otherPilot.call('/workspace', { cookie })).status, 200)
})

test('avdelingsfullmakt og eksakt tildeling skilles fra faglig lesing, også etter restart', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const otherAdmin = await pilot.signIn(stavanger)
  const instructor = await pilot.signIn(instructorOne)
  const otherInstructor = await pilot.signIn(instructorTwo)
  const candidate = await pilot.signIn(candidateOne)
  const sameName = await pilot.signIn(candidateTwo)
  const body = pilot.command()

  assert.equal((await pilot.call('/runs', { body })).status, 401)
  assert.equal((await pilot.call('/runs', { cookie: instructor, body })).status, 403)
  assert.equal((await pilot.call('/runs', { cookie: otherAdmin, body })).status, 403)
  assert.equal((await pilot.call('/runs', { cookie: admin, body: { ...body, instructorId: 'instructor-stavanger' } })).status, 400)
  const run = await pilot.create(admin, body)
  const otherRun = await pilot.create(admin, pilot.command({ candidateEmail: candidateTwo, instructorId: 'instructor-bergen-2' }))
  assert.equal(run.candidate.name, otherRun.candidate.name)
  assert.notEqual(run.candidate.id, otherRun.candidate.id)
  assert.equal(run.instructor.name, otherRun.instructor.name)
  assert.notEqual(run.instructor.id, otherRun.instructor.id)

  const path = `/runs/${run.id}`
  assert.equal((await pilot.call(path)).status, 401)
  for (const cookie of [admin, otherAdmin, sameName, otherInstructor]) assert.equal((await pilot.call(path, { cookie })).status, 404)
  assert.equal((await pilot.call(`/runs/${otherRun.id}`, { cookie: candidate })).status, 404)
  const candidateView = await (await pilot.call(path, { cookie: candidate })).json()
  const instructorView = await (await pilot.call(path, { cookie: instructor })).json()
  assert.deepEqual(candidateView.template, instructorView.template)
  assert.equal(candidateView.template.criteria.length, 22)
  assert.equal(candidateView.template.source.year, 2018)
  assert.equal(new Set(candidateView.template.criteria.map((criterion: { id: string }) => criterion.id)).size, 22)
  assert.deepEqual(candidateView.header, { bus: 'Testbuss 7' })
  assert.equal(candidateView.role, 'candidate')
  assert.equal(instructorView.role, 'instructor')

  const manage = await (await pilot.call('/workspace', { cookie: admin })).json() as TestDriveWorkspace
  assert.deepEqual(manage.assignments, [])
  assert.equal(manage.administration.length, 2)
  assert.equal('header' in manage.administration[0]!, false)
  const otherDept = await (await pilot.call('/workspace', { cookie: otherAdmin })).json() as TestDriveWorkspace
  assert.deepEqual(otherDept.administration, [])
  assert.deepEqual(otherDept.departments.map(item => item.id), ['stavanger'])

  const earlierTemplate = { ...testDriveV1, version: 'test-drive-historisk', criteria: [{ id: 'td-historisk', label: 'Historisk kriterium' }] }
  pilot.store.database.prepare('INSERT INTO test_drive_templates VALUES (?, ?)').run(earlierTemplate.version, JSON.stringify(earlierTemplate))
  pilot.store.database.prepare('UPDATE test_drives SET template_version = ? WHERE id = ?').run(earlierTemplate.version, run.id)
  await pilot.restart()
  const recovered = await pilot.call('/runs', { cookie: admin, body })
  assert.equal(recovered.status, 200)
  assert.deepEqual(await recovered.json(), run)
  assert.equal((await pilot.call('/runs', { cookie: admin, body: { ...body, header: { bus: 'Ulikt innhold' } } })).status, 409)
  for (const cookie of [candidate, instructor]) {
    const reopened = await (await pilot.call(path, { cookie })).json()
    assert.equal(reopened.template.version, earlierTemplate.version)
    assert.deepEqual(reopened.template.criteria, earlierTemplate.criteria)
  }
  const historicalSubmission = `${path}/candidate/before/submit`
  const historicalCommand = { requestId: randomUUID(), revision: 0 }
  assert.equal((await pilot.call(historicalSubmission, { cookie: candidate, body: { ...historicalCommand, answers: { 'td-01': 'ok' } } })).status, 400)
  const submitted = await pilot.call(historicalSubmission, { cookie: candidate, body: { ...historicalCommand, answers: { 'td-historisk': 'ok' } } })
  assert.equal(submitted.status, 200)
  assert.equal((await submitted.json()).phase, 'driving')
  const invitations = pilot.store.database.prepare("SELECT value FROM pilot_mailbox WHERE email = ? AND kind = 'invitation'").all(candidateOne)
  assert.equal(invitations.length, 1)
  assert.equal(invitations[0]?.value, `${pilot.origin}/testkjoring/?lop=${run.id}`)
})

test('aktiv økt mister kandidattilgang ved utløp og tilbakekall, mens tildelt instruktør og historikk består', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const otherAdmin = await pilot.signIn(stavanger)
  const instructor = await pilot.signIn(instructorOne)
  const expiring = await pilot.create(admin)
  const newlyInvited = 'ny-kandidat@pilot.test'
  const revoked = await pilot.create(admin, pilot.command({
    candidateEmail: newlyInvited, candidateName: 'Ny Eksempel', expiresAt: new Date(pilot.now + 2 * 60_000).toISOString(),
  }))
  const session = await pilot.signIn(candidateOne)
  const otherSession = await pilot.signIn(newlyInvited)
  assert.equal((await pilot.call(`/runs/${expiring.id}`, { cookie: session })).status, 200)
  assert.equal((await pilot.call(`/runs/${revoked.id}`, { cookie: otherSession })).status, 200)
  assert.equal((await pilot.call(`/runs/${revoked.id}/revoke`, { cookie: otherAdmin, body: {} })).status, 404)
  const response = await pilot.call(`/runs/${revoked.id}/revoke`, { cookie: admin, body: {} })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).access, 'revoked')
  pilot.advance(60_000)
  const staleRevoke = await pilot.call(`/runs/${expiring.id}/revoke`, { cookie: admin, body: {} })
  assert.equal(staleRevoke.status, 200)
  assert.equal((await staleRevoke.json()).access, 'expired')

  for (const [run, cookie] of [[expiring, session], [revoked, otherSession]] as const) {
    const workspace = await pilot.call('/workspace', { cookie })
    assert.equal(workspace.status, 200, 'Innloggingsøkten består ved utløp og tilbakekall')
    assert.deepEqual((await workspace.json()).assignments, [])
    assert.equal((await pilot.call(`/runs/${run.id}`, { cookie })).status, 404)
    assert.equal((await pilot.call(`/runs/${run.id}/candidate/before/save`, {
      cookie, body: { requestId: randomUUID(), revision: 0, answers: { 'td-01': 'ok' } },
    })).status, 404)
    assert.equal((await pilot.call(`/runs/${run.id}`, { cookie: instructor })).status, 200)
    assert.throws(() => pilot.store.withAssignment(run.candidate.id, run.id, pilot.now, () => {
      assert.fail('Skriveoperasjonen skal avvises før lagring')
    }, 'candidate'), (error: unknown) => error instanceof PilotError && error.code === 'run_unavailable')
  }
  const rows = pilot.store.database.prepare('SELECT phase FROM test_drives ORDER BY id').all()
  assert.deepEqual(rows.map(row => row.phase), ['before', 'before'])
  const history = await (await pilot.call('/workspace', { cookie: admin })).json() as TestDriveWorkspace
  assert.deepEqual(history.administration.map(row => row.access).sort(), ['expired', 'revoked'])
})

test('kandidaten leverer egne før- og etterrevisjoner med tildelt fasekvittering', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const firstClient = await pilot.signIn(candidateOne)
  const secondClient = await pilot.signIn(candidateOne)
  const otherCandidate = await pilot.signIn(candidateTwo)
  const instructor = await pilot.signIn(instructorOne)
  const otherInstructor = await pilot.signIn(instructorTwo)
  const run = await pilot.create(admin)
  const path = `/runs/${run.id}`
  const before = `${path}/candidate/before`
  const after = `${path}/candidate/after`
  const complete = `${path}/complete-driving`
  const command = (revision: number, answers: Record<string, string>) => ({ requestId: randomUUID(), revision, answers })
  const partial = command(0, { 'td-01': 'improve' })
  const empty = { revision: 0, submittedAt: null, answers: {} }

  async function detail(cookie: string) {
    const response = await pilot.call(path, { cookie })
    assert.equal(response.status, 200)
    return await response.json() as TestDriveDetail
  }

  async function expectFailure(path: string, cookie: string, body: object, status: number, error: string) {
    const response = await pilot.call(path, { cookie, body })
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error })
  }

  for (const cookie of [admin, otherCandidate, instructor, otherInstructor]) {
    await expectFailure(`${before}/save`, cookie, partial, 404, 'run_unavailable')
  }
  for (const cookie of [admin, firstClient, otherCandidate, otherInstructor]) {
    await expectFailure(complete, cookie, {}, 404, 'run_unavailable')
  }
  await expectFailure(complete, instructor, {}, 409, 'before_not_submitted')
  await expectFailure(`${after}/save`, firstClient, partial, 409, 'assessment_not_open')
  await expectFailure(`${before}/submit`, firstClient, partial, 400, 'assessment_incomplete')
  await expectFailure(`${before}/save`, firstClient, command(0, { 'td-01': 'fail' }), 400, 'invalid_input')
  await expectFailure(`${before}/save`, firstClient, command(0, { unrelated: 'ok' }), 400, 'invalid_input')
  assert.deepEqual((await detail(firstClient)).candidateAssessments, { before: empty, after: empty })

  const firstSave = await pilot.call(`${before}/save`, { cookie: firstClient, body: partial })
  assert.equal(firstSave.status, 200)
  const saved = { revision: 1, submittedAt: null, answers: partial.answers }
  assert.deepEqual((await firstSave.json()).candidateAssessments, { before: saved, after: empty })
  await pilot.restart()
  assert.deepEqual((await detail(secondClient)).candidateAssessments, { before: saved, after: empty })
  assert.deepEqual((await detail(instructor)).candidateAssessments, {
    before: { revision: 1, submittedAt: null }, after: { revision: 0, submittedAt: null },
  })
  await expectFailure(`${before}/save`, secondClient, command(0, { 'td-01': 'ok' }), 409, 'stale_revision')

  const criteria = (await detail(secondClient)).template.criteria
  const source = readFileSync(new URL('../../_bmad-output/implementation-artifacts/epic-4-testkjoring-teknisk-grunnlag.md', import.meta.url), 'utf8')
  const sourceCriteria = [...source.matchAll(/^\| \d+ \| (.+?) \|\r?$/gm)].map(match => match[1])
  assert.equal(sourceCriteria.length, 22)
  assert.deepEqual(criteria.map(criterion => criterion.label), sourceCriteria)
  assert.deepEqual((await detail(secondClient)).template.candidateChoices, [
    { id: 'ok', label: 'OK' }, { id: 'improve', label: 'Kan bli bedre' },
  ])

  const beforeAnswers = Object.fromEntries(criteria.map(({ id }) => [id, 'ok']))
  const submission = command(1, beforeAnswers)
  pilot.store.database.exec(`
    CREATE TEMP TRIGGER reject_driving_transition BEFORE UPDATE OF phase ON test_drives
    WHEN OLD.phase = 'before' AND NEW.phase = 'driving'
    BEGIN SELECT RAISE(ABORT, 'simulert fasefeil'); END;
  `)
  try {
    await expectFailure(`${before}/submit`, secondClient, submission, 500, 'server_error')
    const rolledBack = await detail(firstClient)
    assert.equal(rolledBack.phase, 'before')
    assert.deepEqual(rolledBack.candidateAssessments, { before: saved, after: empty })
    assert.equal(pilot.store.database.prepare('SELECT 1 FROM test_drive_candidate_requests WHERE drive_id = ? AND request_id = ?')
      .get(run.id, submission.requestId), undefined)
  } finally {
    pilot.store.database.exec('DROP TRIGGER reject_driving_transition')
  }
  const submitted = await pilot.call(`${before}/submit`, { cookie: secondClient, body: submission })
  assert.equal(submitted.status, 200)
  const submittedAt = new Date(pilot.now).toISOString()
  const lockedBefore = { revision: 2, submittedAt, answers: beforeAnswers }
  assert.equal((await detail(firstClient)).phase, 'driving')
  assert.deepEqual((await detail(firstClient)).candidateAssessments, { before: lockedBefore, after: empty })
  await expectFailure(`${after}/submit`, firstClient, command(0, beforeAnswers), 409, 'assessment_not_open')
  await expectFailure(`${before}/save`, firstClient, command(2, partial.answers), 409, 'assessment_locked')
  await expectFailure(`${before}/submit`, firstClient, command(2, beforeAnswers), 409, 'assessment_locked')

  const opened = await pilot.call(complete, { cookie: instructor, body: {} })
  assert.equal(opened.status, 200)
  const instructorView = await opened.json()
  assert.equal(instructorView.phase, 'after')
  assert.deepEqual(instructorView.candidateAssessments, {
    before: { revision: 2, submittedAt }, after: { revision: 0, submittedAt: null },
  })
  assert.deepEqual(await (await pilot.call(complete, { cookie: instructor, body: {} })).json(), instructorView)
  const reordered = Object.fromEntries(Object.entries(beforeAnswers).reverse())
  assert.equal((await pilot.call(`${before}/submit`, { cookie: firstClient, body: { ...submission, answers: reordered } })).status, 200)
  await expectFailure(`${before}/submit`, firstClient, { ...submission, answers: partial.answers }, 409, 'candidate_request_conflict')

  pilot.advance(1000)
  const afterAnswers = { ...beforeAnswers, 'td-01': 'improve' }
  const afterSave = command(0, { 'td-01': 'improve' })
  const competingSave = command(0, { 'td-01': 'ok' })
  const saves = await Promise.all([afterSave, competingSave].map(body => pilot.call(`${after}/save`, { cookie: firstClient, body })))
  assert.deepEqual(saves.map(response => response.status).sort(), [200, 409])
  const finish = command(1, afterAnswers)
  assert.equal((await pilot.call(`${after}/submit`, { cookie: firstClient, body: finish })).status, 200)
  assert.equal((await pilot.call(`${after}/submit`, { cookie: secondClient, body: finish })).status, 200)
  await expectFailure(`${after}/save`, firstClient, command(2, beforeAnswers), 409, 'assessment_locked')
  const final = await detail(secondClient)
  assert.equal(final.phase, 'after')
  assert.deepEqual(final.candidateAssessments, {
    before: lockedBefore, after: { revision: 2, submittedAt: new Date(pilot.now).toISOString(), answers: afterAnswers },
  })
  assert.deepEqual((await detail(instructor)).candidateAssessments, {
    before: { revision: 2, submittedAt }, after: { revision: 2, submittedAt: new Date(pilot.now).toISOString() },
  })
  const originalSaveRetry = await pilot.call(`${before}/save`, { cookie: secondClient, body: partial })
  assert.equal(originalSaveRetry.status, 200)
  assert.deepEqual(await originalSaveRetry.json(), final)
})

test('pilotdatabasen avvises i public og dist, også via et mappealias', () => {
  const publicFolder = fileURLToPath(new URL('../public', import.meta.url))
  const distFolder = fileURLToPath(new URL('../dist', import.meta.url))
  for (const publishedFolder of [publicFolder, distFolder]) {
    assert.throws(() => pilotDatabaseFile(join(publishedFolder, 'undermappe', 'pilot.sqlite')), /utenfor public og dist/)
  }
  const directory = mkdtempSync(join(tmpdir(), 'tide-pilot-alias-'))
  const alias = join(directory, 'alias')
  symlinkSync(publicFolder, alias, process.platform === 'win32' ? 'junction' : 'dir')
  try {
    assert.throws(() => pilotDatabaseFile(join(alias, 'undermappe', 'pilot.sqlite')), /utenfor public og dist/)
  } finally { unlinkSync(alias); rmdirSync(directory) }
})

test('transaksjoner avviser asynkrone funksjoner og ruller tilbake ved et uventet promise-resultat', () => {
  const store = new TestDriveStore(':memory:')
  try {
    const insert = () => store.database.prepare("INSERT INTO pilot_departments VALUES ('test', 'Test')").run()
    const asynchronous = async () => { insert() }
    assert.throws(() => store.transaction(asynchronous as unknown as () => void), /må være synkrone/)
    const promisedResult = () => { insert(); return Promise.resolve() }
    assert.throws(() => store.transaction(promisedResult as unknown as () => void), /må være synkrone/)
    assert.equal(store.database.prepare('SELECT count(*) AS total FROM pilot_departments').get()?.total, 0)
    assert.equal(store.transaction(() => insert().changes), 1)
  } finally { store.database.close() }
})

test('API krever kontrollert origin, JSON og avgrenset forespørselsstørrelse', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const body = pilot.command()
  assert.equal((await pilot.call('/runs', { cookie: admin, body, origin: 'https://feil.example' })).status, 403)
  assert.equal((await pilot.call('/runs', { cookie: admin, body, type: 'text/plain' })).status, 415)
  assert.equal((await pilot.call('/runs', { cookie: admin, body: { ...body, candidateName: 'a'.repeat(9000) } })).status, 413)
  assert.equal((await pilot.call('/runs', { cookie: admin, body: { ...body, expiresAt: new Date(pilot.now).toISOString() } })).status, 400)
  assert.equal(pilot.store.database.prepare('SELECT count(*) AS total FROM test_drives').get()?.total, 0)
})

test('feil ved lokal levering ruller tilbake kandidat og løp, og samme innsending kan gjentas', () => {
  const origin = 'http://127.0.0.1:4173'
  const now = Date.now()
  let fail = true
  const store = new TestDriveStore(':memory:', (database, message) => {
    if (fail) throw new Error('simulert leveringsfeil')
    database.prepare('INSERT INTO pilot_mailbox (email, kind, value, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(message.email, message.kind, message.value, message.now, message.expiresAt)
  })
  try {
    seedPilot(store)
    const creator = { id: 'admin-bergen', name: 'Siri Eksempel', email: bergen }
    const input = {
      requestId: randomUUID(), candidateName: 'Ny Eksempel', candidateEmail: 'ny@pilot.test',
      departmentId: 'bergen', instructorId: 'instructor-bergen', expiresAt: new Date(now + 60_000).toISOString(), header: {},
    }
    assert.throws(() => store.createRun(creator, input, now, origin), /simulert leveringsfeil/)
    assert.equal(store.database.prepare('SELECT id FROM pilot_people WHERE email = ?').get(input.candidateEmail), undefined)
    assert.equal(store.database.prepare('SELECT id FROM test_drives').get(), undefined)
    fail = false
    const first = store.createRun(creator, input, now, origin)
    const second = store.createRun(creator, input, now, origin)
    assert.equal(first.created, true)
    assert.equal(second.created, false)
    assert.equal(first.run.id, second.run.id)
  } finally { store.database.close() }
})
