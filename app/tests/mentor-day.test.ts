import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { baselineOf, confirmBaseline, updateBaselineDraft } from '../src/domain/baseline.ts'
import { confirmDriverDay, driverAfterOf, updateDriverDayDraft } from '../src/domain/driver-day.ts'
import {
  driverReadyForMentorDay, driverRelevance, mentorAssessmentIssues, mentorDayOf,
  reviewRelevance, updateMentorDay, validateSavedMentorDays,
} from '../src/domain/mentor-day.ts'
import type { MentorDayChanges, ReviewInput } from '../src/domain/mentor-day.ts'
import { validateReason } from '../src/domain/reason.ts'
import { createRun } from '../src/domain/run.ts'
import type { Actor, Day, Run } from '../src/domain/run.ts'

const newId = () => crypto.randomUUID()
const mentor: Actor = { id: newId(), role: 'fadder' }
const driver: Actor = { id: newId(), role: 'sjåfør' }
const fields = { driverName: 'Nora Eksempel', employeeNumber: 'DEMO-12', mentorName: 'Emil Eksempel',
  firstDate: '2027-03-28', initialLastDay: '2' }
const ids = approvedContent.criteria.map(({ id }) => id)
const [first, second] = ids
const ok = { value: 'ok', reason: null } as const
const coach = { value: 'needs_improvement', reason: null } as const
const irrelevant = (reason: string) => ({ value: 'not_relevant' as const, reason })
const app = new RunApplication(new IndexedDbRunStore(new IDBFactory()), approvedContent, newId)

function start() {
  return createRun(app.newCreateCommand(mentor, fields), approvedContent)
}

function command(run: Run, actor: Actor, day = run.firstDay as Day) {
  return { commandId: newId(), runId: run.id, expectedRevision: run.revision, actor, dayId: day.id }
}

function save(run: Run, changes: MentorDayChanges, day?: Day, actor = mentor) {
  const { dayId, ...base } = command(run, actor, day)
  return updateMentorDay(run, { ...base, payload: { dayId, changes } })
}

function review(run: Run, id: string, choice: ReviewInput) {
  const { dayId, ...base } = command(run, mentor)
  return reviewRelevance(run, { ...base, payload: { dayId, criterionId: id, ...choice } })
}

function lockBefore(run: Run) {
  const changes = Object.fromEntries(ids.map(id => [id, id === first ? irrelevant('Ingen rygging') : ok]))
  const filled = updateBaselineDraft(run, app.newBaselineDraftCommand(driver, run.id, run.revision, changes))
  return confirmBaseline(filled, app.newConfirmBaselineCommand(driver, filled.id, filled.revision))
}

function driverAfter(run: Run, reason: string | null) {
  const { dayId, ...base } = command(run, driver)
  return updateDriverDayDraft(run, { ...base, payload: { dayId, planRevision: 1, changes: {
    answers: Object.fromEntries(ids.slice(1).map(id => [id, id === second && reason ? irrelevant(reason) : ok])),
    evaluation: { decision: 'skipped' },
  } } })
}

function target(run: Run, criterionId: string) {
  const answer = run.firstDay.driverAfterAnswers!.find(row => row.criterionId === criterionId)!
  return { answerRevision: answer.answerRevision, answerId: answer.id }
}

test('fadder får nøyaktig 22 egne, ordnede svar per dag før sjåførens bekreftelser', () => {
  const initial = start()
  const draft = mentorDayOf(initial, initial.firstDay)
  assert.deepEqual(draft.answers.map(answer => answer.criterionId), ids)
  assert.ok(draft.answers.every(answer => answer.phase === 'mentor' && answer.value === null && answer.answerRevision === 0))
  assert.equal(new Set(draft.answers.map(answer => answer.id)).size, 22)
  const saved = save(initial, { answers: { [first]: coach }, comments: { [second]: 'X' } })
  assert.equal(saved.firstDay.mentorDay!.answers[0].id, draft.answers[0].id)
  assert.equal(saved.firstDay.mentorDay!.answers[0].actor?.name, initial.firstDay.mentorName)
  assert.equal(saved.firstDay.mentorDay!.comments[second]?.text, 'X')
  assert.equal(saved.firstDay.mentorDay!.answers[1].value, null)
  assert.throws(() => save(saved, { comments: { fremmed: 'X' } }), { code: 'invalid_command' })
  assert.throws(() => save(saved, { answers: { [first]: ok } }, undefined, driver), { code: 'wrong_role' })
  assert.throws(() => save(saved, { answers: { [first]: ok } }, { ...saved.firstDay, id: newId() }), { code: 'day_missing' })
  const day: Day & { number: 2 } = { ...initial.firstDay, id: newId(), number: 2, date: '2027-03-29' }
  const locked = lockBefore(saved)
  const run = { ...locked, laterDays: [day] }
  const later = save(run, { answers: { [first]: ok } }, day)
  const positions = [baselineOf(run).answers, ...[run.firstDay, day].flatMap(item => [
    driverAfterOf(run, item).answers, mentorDayOf(run, item).answers,
  ])].flat()
  assert.equal(new Set(positions.map(answer => answer.id)).size, 110)
  assert.deepEqual(later.firstDay, run.firstDay)
  assert.deepEqual(later.laterDays![0].mentorDay!.answers.map(answer => answer.criterionId), ids)
  const corrupt = structuredClone(later)
  corrupt.firstDay.mentorDay!.answers[1] = corrupt.firstDay.mentorDay!.answers[0]
  assert.throws(() => validateSavedMentorDays(corrupt), { code: 'storage_read' })
  const swapped = structuredClone(later)
  const rows = swapped.firstDay.mentorDay!.answers
  rows.splice(0, 2, rows[1], rows[0])
  assert.throws(() => validateSavedMentorDays(swapped), { code: 'storage_read' })
})

test('A10 validerer begge slags begrunnelse mens fri kommentar og råtekst er uavhengige', () => {
  const run = lockBefore(start())
  const origin = target(run, first)
  for (const [raw, valid] of [
    ['Ingen rygging', true], ['Ingen billettering', true], ['\u00a0Ingen\r\n rygging ', true],
    ['A\u030a 12345678', true], ['A\u030a 1234567', false], ['abc 123456', true], ['abc 12345', false],
    ['Enkeltordmedmangetegn', false], ['... 1234567', false], ['abc 1234😀', false], [' ', false],
  ] as const) {
    const reason = validateReason(raw)
    assert.equal(reason.valid, valid, raw)
    if (valid) {
      assert.equal(save(run, { answers: { [first]: irrelevant(reason.text) } }).firstDay.mentorDay!.answers[0].reason, reason.text)
      assert.equal(review(run, first, { ...origin, decision: 'rejected', rejectionComment: reason.text })
        .firstDay.mentorDay!.reviews[first]?.rejectionComment, reason.text)
    } else {
      assert.throws(() => save(run, { answers: { [first]: irrelevant(reason.text) } }), { code: 'validation' })
      assert.throws(() => review(run, first, { ...origin, decision: 'rejected', rejectionComment: reason.text }), { code: 'validation' })
    }
  }
  const partial = save(run, { answers: { [first]: { ...ok, reasonDraft: '  u\n' } },
    comments: { [first]: 'X' }, rejectionDrafts: { [first]: ' Y\n' } })
  const pending = mentorAssessmentIssues(partial.firstDay.mentorDay!.answers, driverRelevance(partial, partial.firstDay),
    { [first]: 'Ettord', [second]: 'Ettord' })
  assert.ok(pending.some(issue => issue.criterionId === first && issue.field === 'review'))
  assert.ok(!pending.some(issue => issue.criterionId === first && issue.field === 'reason'))
  assert.ok(pending.some(issue => issue.criterionId === second && issue.field === 'reason'))
  const actor = { id: newId(), role: 'fadder' } as const
  const next = save({ ...partial, firstDay: { ...partial.firstDay, mentorName: 'Ny Fadder' } },
    { answers: { [first]: irrelevant('Ingen billettering') } }, undefined, actor)
  const decision = review(next, first, { ...origin, decision: 'rejected', rejectionComment: 'Vi rygget tidligere' })
  const assessment = decision.firstDay.mentorDay!
  assert.equal(assessment.answers[0].actor?.name, 'Ny Fadder')
  assert.equal(assessment.answers[0].reason, 'Ingen billettering')
  assert.equal(assessment.comments[first]?.actor.name, fields.mentorName)
  assert.equal(assessment.comments[first]?.text, 'X')
  assert.equal(assessment.reviews[first]?.rejectionComment, 'Vi rygget tidligere')
  assert.equal(assessment.rejectionDrafts[first], undefined)
  assert.deepEqual(decision.firstDay.driverAfterAnswers, run.firstDay.driverAfterAnswers)
  assert.deepEqual(decision.baselineConfirmation, run.baselineConfirmation)
})

test('behandling av ettersvar følger svar-ID og revisjon før og etter sjåførlås', () => {
  const run = driverAfter(lockBefore(start()), 'Ingen billettering')
  assert.notEqual(run.baseline!.answers[0].id, target(run, first).answerId)
  const own = save(run, { answers: Object.fromEntries(ids.map(id => [id, coach])), comments: { [second]: 'Egen merknad' } })
  const inherited = review(own, first, { ...target(own, first), decision: 'accepted' })
  const approved = review(inherited, second, { ...target(inherited, second), decision: 'accepted' })
  const complete = mentorAssessmentIssues(approved.firstDay.mentorDay!.answers, driverRelevance(approved, approved.firstDay))
  assert.deepEqual(complete, [])
  assert.equal(driverReadyForMentorDay(approved, approved.firstDay), false)
  const changed = driverAfter(approved, 'Ingen billettsalg')
  assert.equal(driverRelevance(changed, changed.firstDay)[second].state, 'outdated')
  assert.throws(() => review(changed, second, { ...target(approved, second), decision: 'accepted' }), { code: 'stale' })
  assert.throws(() => review(changed, first, { ...target(changed, second), decision: 'accepted' }), { code: 'stale' })
  assert.deepEqual(changed.firstDay.mentorDay, approved.firstDay.mentorDay)
  const noLonger = driverAfter(changed, null)
  assert.equal(driverRelevance(noLonger, noLonger.firstDay)[second].state, 'not_applicable')
  const { dayId, ...base } = command(changed, driver)
  const locked = confirmDriverDay(changed, { ...base, payload: { dayId, planRevision: 1, confirmedAt: '2027-03-28T11:00:00Z' } })
  assert.equal(driverReadyForMentorDay(locked, locked.firstDay), true)
  assert.equal(driverRelevance(locked, locked.firstDay)[second].state, 'outdated')
  const rejected = review(locked, second, { ...target(locked, second), decision: 'rejected', rejectionComment: 'Billettering ble øvd' })
  assert.deepEqual(mentorAssessmentIssues(rejected.firstDay.mentorDay!.answers, driverRelevance(rejected, rejected.firstDay)), [])
  const dayLocked = { ...rejected, firstDay: { ...rejected.firstDay,
    mentorConfirmation: { actor: { ...mentor, name: fields.mentorName }, confirmedAt: '2027-03-28T12:00:00Z' } } }
  assert.doesNotThrow(() => validateSavedMentorDays(dayLocked))
  assert.throws(() => save(dayLocked, { comments: { [second]: 'X' } }), { code: 'locked' })
  assert.throws(() => review(dayLocked, second, { ...target(dayLocked, second), decision: 'accepted' }), { code: 'locked' })
})

test('IndexedDB avviser gamle roller og atomiske avbrudd, og skjuler fadderinnhold i sjåførmodellen', async () => {
  const session = new RunApplication(new IndexedDbRunStore(new IDBFactory()), approvedContent, newId)
  const { actor } = await session.open()
  const created = await session.executeCreate(session.newCreateCommand(actor, fields))
  const { selected: initial } = await session.read({ runId: created.runId, dayId: created.dayId })
  const changes = {
    answers: { [first]: coach },
    comments: { [first]: 'Fadderinnhold for prøve' },
    rejectionDrafts: { [first]: 'Rått avslagsutkast' },
  }
  const draft = session.newMentorDayCommand(actor, initial!, changes)
  const originalAdd = IDBObjectStore.prototype.add
  IDBObjectStore.prototype.add = function (value, key) {
    const request = originalAdd.call(this, value, key)
    if (this.name === 'commands') request.onsuccess = () => this.transaction.abort()
    return request
  }
  try {
    await assert.rejects(session.executeMentorDay(draft), { code: 'storage_write' })
  } finally {
    IDBObjectStore.prototype.add = originalAdd
  }
  assert.equal((await session.read()).selected!.mentorDay!.comments[first], undefined)
  const receipt = await session.executeMentorDay(draft)
  assert.deepEqual(await session.executeMentorDay(draft), receipt)
  for (const patch of [
    { comments: { [first]: 'Ulik kommentar' } },
    { answers: { [first]: ok } },
    { rejectionDrafts: { [first]: 'Ulikt råutkast' } },
  ]) {
    await assert.rejects(session.executeMentorDay({ ...draft, payload: { ...draft.payload, changes: { ...changes, ...patch } } }),
      { code: 'command_conflict' })
  }
  const current = (await session.read()).selected!
  const oldRole = session.newMentorDayCommand(actor, current, { answers: { [first]: ok } })
  const driverView = await session.changeRole('sjåfør')
  assert.equal(Object.hasOwn(driverView.selected!, 'mentorDay'), false)
  assert.doesNotMatch(JSON.stringify(driverView), /Fadderinnhold for prøve|rejectionDrafts|relevance/)
  await assert.rejects(session.executeMentorDay(oldRole), { code: 'stale' })
  const mentorView = await session.changeRole('fadder')
  assert.equal(mentorView.selected!.mentorDay!.comments[first]?.text, 'Fadderinnhold for prøve')

  const driverSession = await session.changeRole('sjåfør')
  const before = Object.fromEntries(ids.map(id => [id, id === first ? irrelevant('Ingen rygging') : ok]))
  const filled = await session.executeBaselineDraft(session.newBaselineDraftCommand(driverSession.actor, created.runId, receipt.revision, before))
  await session.executeConfirmBaseline(session.newConfirmBaselineCommand(driverSession.actor, created.runId, filled.revision))
  const after = await session.changeRole('fadder')
  const relevance = after.selected!.mentorDay!.relevance[first]
  assert.equal(relevance.state, 'pending')
  if (relevance.state !== 'pending') assert.fail('Forventet ubehandlet relevansvalg')
  const decision = session.newReviewCommand(actor, after.selected!, first, {
    ...relevance.target, decision: 'rejected', rejectionComment: 'Fadder observerte aktivitet',
  })
  const reviewed = await session.executeReview(decision)
  assert.deepEqual(await session.executeReview(decision), reviewed)
  for (const patch of [
    { rejectionComment: 'Annen gyldig tekst' },
    { answerRevision: decision.payload.answerRevision + 1 },
  ]) {
    await assert.rejects(session.executeReview({ ...decision, payload: { ...decision.payload, ...patch } }),
      { code: 'command_conflict' })
  }
  const driverAfterView = await session.changeRole('sjåfør')
  assert.doesNotMatch(JSON.stringify(driverAfterView), /Fadder observerte aktivitet|Fadderinnhold for prøve|rejectionDrafts|relevance/)
  assert.equal(driverAfterView.selected!.driverAfter!.answers[0].reason, 'Ingen rygging')
})

test('adapteren avviser schema 1 med riktige fadder-ID-er i feil rekkefølge', async () => {
  const factory = new IDBFactory()
  const session = new RunApplication(new IndexedDbRunStore(factory), approvedContent, newId)
  const { actor } = await session.open()
  const created = await session.executeCreate(session.newCreateCommand(actor, fields))
  const { selected } = await session.read()
  await session.executeMentorDay(session.newMentorDayCommand(actor, selected!, { answers: { [first]: ok } }))
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, SCHEMA_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('runs', 'readwrite')
      const store = tx.objectStore('runs')
      const request = store.get(created.runId)
      request.onsuccess = () => {
        const record = request.result as { schemaVersion: number; data: Run }
        const rows = record.data.firstDay.mentorDay!.answers
        rows.splice(0, 2, rows[1], rows[0])
        store.put(record, created.runId)
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
  await assert.rejects(session.read(), { code: 'storage_read' })
})
