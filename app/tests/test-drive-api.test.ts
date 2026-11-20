import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtempSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { seedPilot } from '../server/pilot-accounts.ts'
import { pilotDatabaseFile } from '../server/pilot-config.ts'
import { createTestDriveApi } from '../server/test-drive-api.ts'
import { PilotError, TestDriveStore } from '../server/test-drive-store.ts'
import { testDriveApiPath, testDriveCommentLimits } from '../src/content/test-drive-api.ts'
import type {
  CreateTestDrive, TestDriveAdministration, TestDriveClosedDetail, TestDriveClosedDocument, TestDriveOpenDetail, TestDriveWorkspace,
} from '../src/content/test-drive-api.ts'
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

  async function call(path: string, options: { cookie?: string; body?: object | string; origin?: string; type?: string } = {}) {
    const headers = new Headers({ Connection: 'close' })
    if (options.cookie) headers.set('Cookie', options.cookie)
    if (options.body !== undefined) {
      headers.set('Origin', options.origin ?? origin)
      headers.set('Content-Type', options.type ?? 'application/json')
    }
    const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    const response = await fetch(`${origin}${testDriveApiPath}${path}`, { method: body === undefined ? 'GET' : 'POST', headers, body })
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    return response
  }

  async function callChunks(path: string, cookie: string, chunks: string[], afterFirstChunk?: () => Promise<void>) {
    const response = Promise.withResolvers<Response>()
    const outgoing = request(`${origin}${testDriveApiPath}${path}`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
    }, async incoming => {
      try {
        const buffers: Buffer[] = []
        for await (const chunk of incoming) buffers.push(Buffer.from(chunk))
        assert.equal(incoming.headers['cache-control'], 'no-store')
        response.resolve(new Response(Buffer.concat(buffers), { status: incoming.statusCode }))
      } catch (error) { response.reject(error) }
    })
    outgoing.on('error', response.reject)
    try {
      for (const [index, chunk] of chunks.entries()) {
        await new Promise<void>((resolve, reject) => outgoing.write(chunk, error => error ? reject(error) : resolve()))
        if (index === 0) await afterFirstChunk?.()
      }
      outgoing.end()
    } catch (error) {
      outgoing.destroy()
      response.reject(error)
    }
    return response.promise
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
    call, callChunks, requestCode, lastCode, signIn, command, create, file,
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
  const { instructorChoices, resultChoices, ...commonTemplate } = instructorView.template
  assert.deepEqual(candidateView.template, commonTemplate)
  assert.deepEqual(instructorChoices, testDriveV1.instructorChoices)
  assert.deepEqual(resultChoices, testDriveV1.resultChoices)
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

  const earlierTemplate = {
    ...testDriveV1,
    version: 'test-drive-historisk',
    criteria: [{ id: 'td-historisk', label: 'Historisk kriterium' }],
    instructorChoices: [{ id: 'fail', label: 'Historisk instruktørvalg' }],
    resultChoices: [{ id: 'no', label: 'Historisk resultat' }],
  }
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
  const instructorSubmission = `${path}/instructor/submit`
  const instructorCommand = { ...historicalCommand, answers: { 'td-historisk': 'fail' }, comments: {}, overallComment: '', result: 'no' }
  for (const fields of [{ answers: { 'td-historisk': 'ok' } }, { result: 'conditional' }]) {
    const invalid = await pilot.call(instructorSubmission, { cookie: instructor, body: { ...instructorCommand, ...fields } })
    assert.equal(invalid.status, 400)
    assert.deepEqual(await invalid.json(), { error: 'invalid_input' })
  }
  const instructorSubmitted = await pilot.call(instructorSubmission, { cookie: instructor, body: instructorCommand })
  assert.equal(instructorSubmitted.status, 200)
  const historicalInstructorView = await instructorSubmitted.json()
  assert.equal(historicalInstructorView.phase, 'driving')
  assert.equal(historicalInstructorView.instructorAssessment.result, 'no')
  assert.deepEqual(historicalInstructorView.template.instructorChoices, earlierTemplate.instructorChoices)
  assert.deepEqual(historicalInstructorView.template.resultChoices, earlierTemplate.resultChoices)
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
    return await response.json() as TestDriveOpenDetail
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

test('instruktørvurderingen har skjermet innsyn og uavhengige, idempotente revisjoner', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const candidate = await pilot.signIn(candidateOne)
  const otherCandidate = await pilot.signIn(candidateTwo)
  const instructor = await pilot.signIn(instructorOne)
  const otherInstructor = await pilot.signIn(instructorTwo)
  const run = await pilot.create(admin)
  const path = `/runs/${run.id}`
  const criterionIds = testDriveV1.criteria.map(({ id }) => id)
  const candidateAnswers = Object.fromEntries(criterionIds.map(id => [id, 'ok']))
  const instructorAnswers = { ...candidateAnswers, 'td-01': 'fail', 'td-02': 'improve' }
  const secret = 'Skjermet prøve: «Påkjøring»\nÅ, æ og ø.'
  const draft = {
    requestId: randomUUID(), revision: 0, answers: { 'td-01': 'fail' },
    comments: { 'td-01': secret }, overallComment: 'Ut på tur.\nGå gjennom «beslutningsevne».', result: null,
  }
  const afterDraft = { requestId: randomUUID(), revision: 0, answers: { 'td-01': 'improve' } }

  function write(action: 'save' | 'submit', body: object | string, cookie = instructor) {
    return pilot.call(`${path}/instructor/${action}`, { cookie, body })
  }

  async function assertError(response: Response, status: number, error: string) {
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error })
  }

  async function detail(cookie: string) {
    const response = await pilot.call(path, { cookie })
    assert.equal(response.status, 200)
    return await response.json() as TestDriveOpenDetail
  }

  async function assertShielded(afterRevision: number) {
    const view = await detail(candidate)
    assert.equal(view.role, 'candidate')
    assert.equal(view.candidateAssessments.after.revision, afterRevision)
    assert.ok(!('instructorAssessment' in view))
    assert.ok(!('instructorChoices' in view.template))
    assert.ok(!('resultChoices' in view.template))
    assert.doesNotMatch(JSON.stringify(view), /Skjermet prøve|Ut på tur/)
    const workspace = await pilot.call('/workspace', { cookie: candidate })
    assert.doesNotMatch(await workspace.text(), /Skjermet prøve|Ut på tur|instructorAssessment/)
    await assertError(await pilot.call(`${path}/export-source`, { cookie: candidate }), 409, 'run_not_closed')
  }

  for (const cookie of [admin, candidate, otherCandidate, otherInstructor]) {
    await assertError(await write('save', draft, cookie), 404, 'run_unavailable')
    await assertError(await write('submit', draft, cookie), 404, 'run_unavailable')
  }
  await assertError(await write('save', draft), 409, 'assessment_not_open')
  const before = await pilot.call(`${path}/candidate/before/submit`, {
    cookie: candidate, body: { requestId: randomUUID(), revision: 0, answers: candidateAnswers },
  })
  assert.equal(before.status, 200)
  assert.doesNotMatch(await before.text(), /instructorAssessment/)

  const firstSave = await write('save', { ...draft, authorId: 'instructor-bergen-2' })
  assert.equal(firstSave.status, 200)
  const first = await firstSave.json() as TestDriveOpenDetail
  assert.equal(first.role, 'instructor')
  assert.equal(first.phase, 'driving')
  assert.deepEqual(first.template.instructorChoices, testDriveV1.instructorChoices)
  assert.deepEqual(first.template.resultChoices, testDriveV1.resultChoices)
  assert.deepEqual(first.instructorAssessment, {
    revision: 1, submittedAt: null, authorId: run.instructor.id, answers: draft.answers, comments: draft.comments,
    overallComment: draft.overallComment, result: null,
  })
  assert.deepEqual(first.candidateAssessments.before, { revision: 1, submittedAt: new Date(pilot.now).toISOString() })
  await assertShielded(0)
  for (const cookie of [admin, otherCandidate, otherInstructor]) {
    await assertError(await pilot.call(path, { cookie }), 404, 'run_unavailable')
  }

  const next = { ...draft, requestId: randomUUID(), revision: 1, answers: instructorAnswers }
  await assertError(await write('submit', { ...next, answers: draft.answers, result: 'pass' }), 400, 'assessment_incomplete')
  await assertError(await write('submit', next), 400, 'result_required')
  for (const fields of [
    { answers: { 'td-01': 'pass' } }, { answers: { unrelated: 'ok' } }, { result: 'ok' },
    { comments: { unrelated: 'Kommentar' } }, { comments: { 'td-01': 123 } },
    { comments: { 'td-01': 'a'.repeat(testDriveCommentLimits.criterion + 1) } },
    { overallComment: 'a'.repeat(testDriveCommentLimits.overall + 1) }, { overallComment: 'A\u0000B' },
  ]) {
    await assertError(await write('save', { ...next, ...fields }), 400, 'invalid_input')
  }
  await assertError(await write('save', { ...draft, requestId: randomUUID() }), 409, 'stale_revision')

  assert.equal((await pilot.call(`${path}/complete-driving`, { cookie: instructor, body: {} })).status, 200)
  const criterionComment = 'æ'.repeat(testDriveCommentLimits.criterion - 8) + '\n«ø»"å🙂'
  const overallComment = 'æ'.repeat(testDriveCommentLimits.overall - secret.length) + secret
  assert.equal(criterionComment.length, testDriveCommentLimits.criterion)
  const large = {
    ...next, overallComment, result: 'conditional',
    comments: Object.fromEntries(criterionIds.map(id => [id, criterionComment])),
  }
  const escaped = JSON.stringify(large).replaceAll('æ', '\\u00e6')
  assert.ok(Buffer.byteLength(escaped) > 200_000)
  const writes = await Promise.all([
    write('save', escaped),
    pilot.call(`${path}/candidate/after/save`, { cookie: candidate, body: afterDraft }),
  ])
  assert.deepEqual(writes.map(response => response.status), [200, 200])
  const concurrent = await detail(instructor)
  assert.equal(concurrent.role, 'instructor')
  assert.equal(concurrent.candidateAssessments.after.revision, 1)
  assert.equal(concurrent.instructorAssessment.revision, 2)
  assert.deepEqual(concurrent.instructorAssessment.comments, large.comments)
  assert.equal(concurrent.instructorAssessment.overallComment, overallComment)
  const candidateView = await detail(candidate)
  assert.equal(candidateView.role, 'candidate')
  assert.deepEqual(candidateView.candidateAssessments.after.answers, afterDraft.answers)
  await assertShielded(1)
  await assertError(await pilot.call(`${path}/candidate/after/save`, { cookie: candidate, body: escaped }), 413, 'body_too_large')
  await assertError(await write('save', escaped + ' '.repeat(10_000)), 413, 'body_too_large')

  const submit = { ...large, requestId: randomUUID(), revision: 2 }
  pilot.store.database.exec(`
    CREATE TEMP TRIGGER reject_instructor_receipt BEFORE INSERT ON test_drive_instructor_requests
    BEGIN SELECT RAISE(ABORT, 'simulert kvitteringsfeil'); END;
  `)
  try {
    await assertError(await write('submit', submit), 500, 'server_error')
    assert.deepEqual(await detail(instructor), concurrent)
  } finally {
    pilot.store.database.exec('DROP TRIGGER reject_instructor_receipt')
  }
  pilot.advance(1000)
  const submitted = await write('submit', submit)
  assert.equal(submitted.status, 200)
  const locked = await submitted.json() as TestDriveOpenDetail
  assert.equal(locked.role, 'instructor')
  assert.equal(locked.instructorAssessment.revision, 3)
  assert.equal(locked.instructorAssessment.authorId, run.instructor.id)
  assert.equal(locked.instructorAssessment.submittedAt, new Date(pilot.now).toISOString())
  assert.equal(locked.instructorAssessment.result, 'conditional')
  await pilot.restart()
  pilot.advance(1000)
  const duplicate = await write('submit', { ...submit, comments: Object.fromEntries(Object.entries(submit.comments).reverse()) })
  assert.equal(duplicate.status, 200)
  assert.deepEqual(await duplicate.json(), locked)
  await assertError(await write('submit', { ...submit, result: 'pass' }), 409, 'instructor_request_conflict')
  await assertError(await write('submit', { ...submit, requestId: randomUUID(), revision: 3 }), 409, 'assessment_locked')
  await assertError(await write('save', { ...submit, requestId: randomUUID(), revision: 3 }), 409, 'assessment_locked')
  assert.deepEqual(pilot.store.database.prepare(`
    SELECT revision, author_id FROM test_drive_instructor_requests WHERE drive_id = ? ORDER BY revision
  `).all(run.id).map(row => ({ ...row })), [
    { revision: 1, author_id: run.instructor.id }, { revision: 2, author_id: run.instructor.id },
    { revision: 3, author_id: run.instructor.id },
  ])
  await assertShielded(1)
})

test('avslutning publiserer én atomisk dokumentkilde med frosne navn, kvitteringer og separat tilgang', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const candidate = await pilot.signIn(candidateOne)
  const instructor = await pilot.signIn(instructorOne)
  const other = await pilot.signIn(instructorTwo)
  const run = await pilot.create(admin)
  const path = `/runs/${run.id}`
  const fields = Object.fromEntries(testDriveV1.criteria.map(({ id }) => [id, 'ok']))
  const close = (cookie = instructor, body = {}) => pilot.call(`${path}/close`, { cookie, body })
  const source = (cookie: string) => pilot.call(`${path}/export-source`, { cookie })
  const documentCount = () => pilot.store.database.prepare('SELECT count(*) AS count FROM test_drive_closed_documents').get()?.count

  async function expectError(response: Response, status: number, error: string) {
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error })
  }

  async function post(action: string, cookie: string, body: object) {
    assert.equal((await pilot.call(`${path}/${action}`, { cookie, body })).status, 200)
    return new Date(pilot.now).toISOString()
  }

  for (const cookie of [candidate, admin, other]) await expectError(await close(cookie), 404, 'run_unavailable')
  for (const cookie of [admin, other]) await expectError(await source(cookie), 404, 'run_unavailable')
  for (const cookie of [candidate, instructor]) await expectError(await source(cookie), 409, 'run_not_closed')
  await expectError(await close(instructor, { closedBy: 'admin-bergen' }), 400, 'invalid_input')
  await expectError(await close(), 409, 'run_incomplete')

  const beforeBody = { requestId: randomUUID(), revision: 0, answers: fields }
  const beforeAt = await post('candidate/before/submit', candidate, beforeBody)
  pilot.advance(1)
  await post('complete-driving', instructor, {})
  const instructorBody = {
    requestId: randomUUID(), revision: 0, answers: { ...fields, 'td-01': 'fail' },
    comments: { 'td-01': 'Øv på speil, «sving» og VTL § 3.' }, overallComment: 'Øvelse\nÅpen merknad.', result: 'conditional',
  }
  const instructorAt = await post('instructor/submit', instructor, instructorBody)
  await expectError(await close(), 409, 'run_incomplete')
  assert.equal(documentCount(), 0)
  const stillShielded = await pilot.call(path, { cookie: candidate })
  assert.doesNotMatch(await stillShielded.text(), /Øvelse|instructorAssessment|closedAt/)
  pilot.advance(1)
  const afterAnswers = { ...fields, 'td-01': 'improve' }
  const afterBody = { ...beforeBody, requestId: randomUUID(), answers: afterAnswers }
  const afterAt = await post('candidate/after/submit', candidate, afterBody)
  pilot.advance(1)

  pilot.store.database.exec(`
    CREATE TRIGGER interrupt_close BEFORE UPDATE OF phase ON test_drives WHEN NEW.phase = 'closed'
    BEGIN SELECT raise(ABORT, 'Simulert avbrutt avslutning'); END;
  `)
  await expectError(await close(), 500, 'server_error')
  assert.equal(documentCount(), 0)
  const interrupted = await pilot.call(path, { cookie: candidate })
  assert.equal((await interrupted.json()).phase, 'after')
  await expectError(await source(candidate), 409, 'run_not_closed')
  pilot.store.database.exec('DROP TRIGGER interrupt_close')

  pilot.advance(1)
  const closedAt = new Date(pilot.now).toISOString()
  const results = await Promise.all([close(), close()])
  const snapshots = await Promise.all(results.map(async response => {
    assert.equal(response.status, 200)
    return (await response.json() as TestDriveClosedDetail).document
  }))
  const [document] = snapshots
  assert.deepEqual(document, snapshots[1])
  assert.equal(documentCount(), 1)
  assert.equal(document.documentVersion, 1)
  assert.equal(document.runId, run.id)
  assert.equal(document.closedAt, closedAt)
  assert.equal(document.closedBy, 'instructor-bergen')
  assert.deepEqual(document.candidate, { id: 'candidate-1', name: 'Nora Eksempel', email: candidateOne })
  assert.deepEqual(document.instructor, { id: 'instructor-bergen', name: 'Emil Eksempel' })
  assert.deepEqual(document.department, { id: 'bergen', name: 'Bergen' })
  assert.deepEqual(document.template, testDriveV1)
  assert.deepEqual(document.header, { bus: 'Testbuss 7' })
  assert.deepEqual(document.candidateAssessments, {
    before: { revision: 1, answers: fields, submittedAt: beforeAt },
    after: { revision: 1, answers: afterAnswers, submittedAt: afterAt },
  })
  const { requestId: _, revision: __, ...instructorFields } = instructorBody
  assert.deepEqual(document.instructorAssessment, { ...instructorFields, revision: 1, authorId: document.closedBy, submittedAt: instructorAt })

  pilot.store.database.exec(`
    UPDATE pilot_people SET name = 'Omdøpt' WHERE id IN ('candidate-1', 'instructor-bergen');
    UPDATE pilot_departments SET name = 'Omdøpt avdeling' WHERE id = 'bergen';
    UPDATE test_drives SET header = '{"bus":"Ny buss"}';
  `)
  await pilot.restart()
  const candidateNewSession = await pilot.signIn(candidateOne)
  const changedTemplate = { ...testDriveV1, criteria: testDriveV1.criteria.slice(1) }
  pilot.store.database.prepare('UPDATE test_drive_templates SET definition = ? WHERE version = ?')
    .run(JSON.stringify(changedTemplate), testDriveV1.version)
  for (const cookie of [candidateNewSession, instructor]) {
    const view = await pilot.call(path, { cookie })
    const closed = await view.json() as TestDriveClosedDetail
    assert.equal(closed.phase, 'closed')
    assert.equal(closed.candidateName, document.candidate.name)
    assert.equal(closed.instructorName, document.instructor.name)
    assert.deepEqual(closed.department, document.department)
    assert.deepEqual(closed.document, document)
    const exported = await source(cookie)
    assert.equal(exported.status, 200)
    assert.deepEqual(await exported.json() as TestDriveClosedDocument, document)

    const workspace = await pilot.call('/workspace', { cookie })
    assert.equal(workspace.status, 200)
    const { assignments } = await workspace.json() as TestDriveWorkspace
    assert.deepEqual(assignments, [{
      id: document.runId, department: document.department, role: closed.role,
      candidateName: document.candidate.name, instructorName: document.instructor.name,
      expiresAt: closed.expiresAt, phase: 'closed',
    }])
  }
  for (const { section, cookie, body } of [
    { section: 'candidate/before', cookie: candidateNewSession, body: beforeBody },
    { section: 'candidate/after', cookie: candidateNewSession, body: afterBody },
    { section: 'instructor', cookie: instructor, body: instructorBody },
  ]) {
    const retry = await pilot.call(`${path}/${section}/submit`, { cookie, body })
    assert.equal(retry.status, 200)
    assert.deepEqual((await retry.json() as TestDriveClosedDetail).document, document)
    for (const action of ['save', 'submit']) {
      const write = await pilot.call(`${path}/${section}/${action}`, {
        cookie, body: { ...body, requestId: randomUUID(), revision: 1 },
      })
      await expectError(write, 409, 'assessment_locked')
    }
  }
  const writer = new DatabaseSync(pilot.file)
  try {
    writer.exec("BEGIN IMMEDIATE; UPDATE test_drives SET revoked_at = created_at, revoked_by = 'admin-bergen'")
    const exported = await source(candidateNewSession)
    assert.equal(exported.status, 200)
    assert.deepEqual(await exported.json(), document)

    pilot.advance(60_000)
    await expectError(await source(candidateNewSession), 404, 'run_unavailable')
  } finally {
    writer.close()
  }
  const retry = await close()
  assert.equal(retry.status, 200)
  assert.deepEqual((await retry.json() as TestDriveClosedDetail).document, document)
  await expectError(await source(candidate), 404, 'run_unavailable')
  await expectError(await pilot.call(path, { cookie: candidateNewSession }), 404, 'run_unavailable')
  assert.equal((await source(instructor)).status, 200)
  assert.equal(documentCount(), 1)
})

test('instruktør-API autoriserer før og etter lesing av en kropp sendt i flere deler', async t => {
  const pilot = await open(t)
  const admin = await pilot.signIn(bergen)
  const instructor = await pilot.signIn(instructorOne)
  const candidate = await pilot.signIn(candidateOne)
  const run = await pilot.create(admin)
  const path = `/runs/${run.id}/instructor/save`
  const template = { ...testDriveV1, version: 'test-drive-kroppsgrense', criteria: testDriveV1.criteria.slice(0, 1) }
  pilot.store.database.prepare('INSERT INTO test_drive_templates VALUES (?, ?)').run(template.version, JSON.stringify(template))
  pilot.store.database.prepare("UPDATE test_drives SET template_version = ?, phase = 'driving' WHERE id = ?").run(template.version, run.id)
  const input = {
    requestId: randomUUID(), revision: 0, answers: { 'td-01': 'ok' }, result: null,
    comments: { 'td-01': 'æ'.repeat(testDriveCommentLimits.criterion) },
    overallComment: 'ø'.repeat(testDriveCommentLimits.overall),
  }
  const body = JSON.stringify(input).replaceAll('æ', '\\u00e6').replaceAll('ø', '\\u00f8')
  const chunks = body.match(/.{1,8192}/g)!
  assert.ok(chunks.length > 2)

  async function assertError(response: Response, status: number, error: string) {
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error })
  }

  const oversizedChunks = [...chunks, ' '.repeat(8192), ' '.repeat(8192)]
  await assertError(await pilot.call(path, { body: oversizedChunks.join('') }), 401, 'sign_in_required')
  await assertError(await pilot.call(path, { cookie: candidate, body: oversizedChunks.join('') }), 404, 'run_unavailable')
  await assertError(await pilot.call(path, { cookie: instructor, body: '' }), 400, 'invalid_input')
  await assertError(await pilot.call('/auth/code', { body: '' }), 400, 'invalid_input')
  await assertError(await pilot.callChunks(path, instructor, oversizedChunks), 413, 'body_too_large')
  const accepted = await pilot.callChunks(path, instructor, chunks)
  assert.equal(accepted.status, 200)
  const detail = await accepted.json() as TestDriveOpenDetail
  assert.equal(detail.role, 'instructor')
  assert.equal(detail.instructorAssessment.revision, 1)
  assert.deepEqual(detail.instructorAssessment.comments, input.comments)
  assert.equal(detail.instructorAssessment.overallComment, input.overallComment)

  const templateRead = Promise.withResolvers<void>()
  const readTemplate = pilot.store.template.bind(pilot.store)
  const spy = t.mock.method(pilot.store, 'template', (row: Parameters<TestDriveStore['template']>[0]) => {
    templateRead.resolve()
    return readTemplate(row)
  })
  const interrupted = JSON.stringify({ ...input, requestId: randomUUID(), revision: 1, overallComment: 'Neste revisjon' })
  const stopped = await pilot.callChunks(path, instructor, [interrupted.slice(0, 20), interrupted.slice(20)], async () => {
    await templateRead.promise
    assert.equal((await pilot.call('/auth/logout', { cookie: instructor, body: {} })).status, 200)
  })
  spy.mock.restore()
  await assertError(stopped, 401, 'sign_in_required')
  assert.equal(pilot.store.instructorAssessment(run.id).revision, 1)
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
