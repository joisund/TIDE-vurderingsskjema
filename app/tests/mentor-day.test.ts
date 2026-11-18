import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { baselineOf, confirmBaseline, updateBaselineDraft } from '../src/domain/baseline.ts'
import { updateDayDraft } from '../src/domain/day-draft.ts'
import { confirmDriverDay, driverAfterOf, updateDriverDayDraft } from '../src/domain/driver-day.ts'
import { currentPlan, saveFollowUp } from '../src/domain/follow-up.ts'
import {
  checkMentorDay, confirmMentorDay, driverReadyForMentorDay, driverRelevance, mentorAssessmentIssues, mentorDayOf,
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
const confirmedAt = '2027-03-28T12:00:00Z'
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

function mentorLockCommand(run: Run, actor = mentor) {
  const { dayId, ...base } = command(run, actor)
  return { ...base, payload: { dayId, confirmedAt } }
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

async function alterStoredRun(factory: IDBFactory, runId: string, alter: (run: Run) => void) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, SCHEMA_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('runs', 'readwrite')
      const store = tx.objectStore('runs')
      const request = store.get(runId)
      request.onsuccess = () => {
        const record = request.result as { schemaVersion: number; data: Run }
        alter(record.data)
        store.put(record, runId)
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

test('fadder får nøyaktig 22 egne, ordnede svar per dag før sjåførens bekreftelser', () => {
  const initial = start()
  assert.equal(checkMentorDay(initial, initial.firstDay).complete, false)
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
  const { dayId: mentorDayId, ...planCommand } = command(rejected, mentor)
  const planned = saveFollowUp(rejected, { ...planCommand, payload: { dayId: mentorDayId, source: 'daily', choice: { kind: 'days', extraDays: 1 } } })
  const { dayId: sessionDay, ...sessionCommand } = command(planned, mentor)
  const completeDay = updateDayDraft(planned, { ...sessionCommand, payload: { dayId: sessionDay, changes: {
    mentorName: 'Ny bekreftende fadder', bus2: '20', routes: '12 og 15', startTime: '22:30', endTime: '02:20',
  } } })
  assert.equal(checkMentorDay(rejected, rejected.firstDay).complete, false)
  assert.equal(checkMentorDay(completeDay, completeDay.firstDay).complete, true)
  assert.throws(() => confirmMentorDay(rejected, mentorLockCommand(rejected)), { code: 'validation' })
  assert.throws(() => confirmMentorDay(completeDay, mentorLockCommand(completeDay, driver)), { code: 'wrong_role' })
  for (const phase of ['before', 'driver_after', 'mentor'] as const) {
    for (const damage of ['duplicate', 'other_id', 'missing'] as const) {
      const corrupt = structuredClone(completeDay)
      const rows = phase === 'before' ? corrupt.baseline!.answers : phase === 'driver_after'
        ? corrupt.firstDay.driverAfterAnswers! : corrupt.firstDay.mentorDay!.answers
      if (damage === 'duplicate') rows[0] = rows[1]
      if (damage === 'other_id') rows[0].criterionId = 'unknown-criterion'
      if (damage === 'missing') rows.pop()
      assert.throws(() => checkMentorDay(corrupt, corrupt.firstDay), { code: 'storage_read' })
      assert.throws(() => confirmMentorDay(corrupt, mentorLockCommand(corrupt)), { code: 'storage_read' })
    }
  }
  for (const field of ['bus2', 'routes', 'startTime', 'endTime'] as const) {
    const incomplete = structuredClone(completeDay)
    incomplete.firstDay.session![field] = ''
    const result = checkMentorDay(incomplete, incomplete.firstDay)
    assert.deepEqual(Object.keys(result.fields), [field === 'bus2' ? 'bus1' : field])
    assert.throws(() => confirmMentorDay(incomplete, mentorLockCommand(incomplete)), { code: 'validation' })
  }
  for (const field of ['name', 'employeeNumber', 'mentorName', 'date'] as const) {
    const incomplete = structuredClone(completeDay)
    if (field === 'name' || field === 'employeeNumber') incomplete.firstDay.driverIdentity![field] = ''
    else incomplete.firstDay[field] = ''
    assert.deepEqual(Object.keys(checkMentorDay(incomplete, incomplete.firstDay).fields), [field === 'name' ? 'driverName' : field])
    assert.throws(() => confirmMentorDay(incomplete, mentorLockCommand(incomplete)), { code: 'storage_read' })
  }
  const noPlan = { ...completeDay, plan: undefined, planEvents: undefined, followUpDecisions: undefined }
  assert.equal(checkMentorDay(noPlan, noPlan.firstDay).followUpMissing, true)
  assert.throws(() => confirmMentorDay(noPlan, mentorLockCommand(noPlan)), { code: 'validation' })
  const noAfterAck = { ...completeDay, firstDay: { ...completeDay.firstDay, driverConfirmation: undefined, driverEvaluation: undefined } }
  assert.equal(checkMentorDay(noAfterAck, noAfterAck.firstDay).driverAfterMissing, true)
  assert.throws(() => confirmMentorDay(noAfterAck, mentorLockCommand(noAfterAck)), { code: 'validation' })
  const outdated = structuredClone(completeDay)
  outdated.firstDay.mentorDay!.reviews[second]!.answerRevision--
  assert.equal(checkMentorDay(outdated, outdated.firstDay).complete, false)
  assert.throws(() => confirmMentorDay(outdated, mentorLockCommand(outdated)), { code: 'validation' })
  const dayLocked = confirmMentorDay(completeDay, mentorLockCommand(completeDay))
  assert.deepEqual(dayLocked.firstDay.mentorConfirmation, {
    actor: { ...mentor, name: 'Ny bekreftende fadder' }, date: completeDay.firstDay.date, part: 'mentor_day', confirmedAt,
  })
  assert.equal(dayLocked.baselineConfirmation, completeDay.baselineConfirmation)
  assert.equal(dayLocked.firstDay.driverConfirmation, completeDay.firstDay.driverConfirmation)
  assert.equal(dayLocked.firstDay.driverEvaluation, completeDay.firstDay.driverEvaluation)
  assert.equal(dayLocked.planEvents, completeDay.planEvents)
  assert.deepEqual(currentPlan(dayLocked), { revision: 2, lastDay: 3 })
  assert.doesNotThrow(() => validateSavedMentorDays(dayLocked))
  assert.throws(() => save(dayLocked, { comments: { [second]: 'X' } }), { code: 'locked' })
  assert.throws(() => review(dayLocked, second, { ...target(dayLocked, second), decision: 'accepted' }), { code: 'locked' })
})

test('ConfirmMentorDay krever aktiv aktør og kvitterer én gang etter atomisk skriving', async () => {
  const factory = new IDBFactory()
  const app = new RunApplication(new IndexedDbRunStore(factory), approvedContent, newId)
  const { actor: fadder } = await app.open()
  const created = await app.executeCreate(app.newCreateCommand(fadder, fields))
  const read = async () => (await app.read()).selected!
  const allAnswers = Object.fromEntries(ids.map(id => [id, ok]))
  const selection = { runId: created.runId, dayId: created.dayId }
  await app.executeDayDraft(app.newDayDraftCommand(fadder, selection, created.revision,
    { bus1: '45', routes: '9', startTime: '21:50', endTime: '00:30' }))
  await app.executeFollowUp(app.newFollowUpCommand(fadder, await read(), { kind: 'none' }))
  await app.executeMentorDay(app.newMentorDayCommand(fadder, await read(), { answers: allAnswers, comments: { [first]: 'Vel dokumentert' } }))
  assert.deepEqual((await read()).mentorDay?.completion, {
    baselineMissing: true, driverAfterMissing: true, fields: {}, assessment: [], followUpMissing: false, complete: false,
  })
  await assert.rejects(app.executeConfirmMentorDay(app.newConfirmMentorDayCommand(fadder, await read())), { code: 'validation' })
  const current = await app.changeRole('sjåfør')
  const sjåfør = current.actor
  const before = await app.executeBaselineDraft(app.newBaselineDraftCommand(sjåfør, created.runId, current.selected!.revision, allAnswers))
  await app.executeConfirmBaseline(app.newConfirmBaselineCommand(sjåfør, created.runId, before.revision))
  await app.executeDriverDayDraft(app.newDriverDayDraftCommand(sjåfør, await read(), {
    answers: allAnswers, evaluation: { decision: 'submitted', texts: { strength1: 'Rolig innbremsing' } },
  }))
  await app.executeConfirmDriverDay(app.newConfirmDriverDayCommand(sjåfør, await read()))

  const open = (await app.changeRole('fadder')).selected!
  const lock = app.newConfirmMentorDayCommand(fadder, open)
  await app.changeRole('sjåfør')
  await assert.rejects(app.executeConfirmMentorDay(lock), { code: 'stale' })
  await app.changeRole('fadder')
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.name === 'runs') throw new DOMException('Fullt lager', 'QuotaExceededError')
    return put.call(this, value, key)
  }
  try {
    await assert.rejects(app.executeConfirmMentorDay(lock), { code: 'storage_write' })
  } finally {
    IDBObjectStore.prototype.put = put
  }
  assert.deepEqual(await read(), open)
  const receipt = await app.executeConfirmMentorDay(lock)
  assert.equal(receipt.confirmation.actor.name, fields.mentorName)
  assert.deepEqual(await app.executeConfirmMentorDay(lock), receipt)
  await assert.rejects(app.executeConfirmMentorDay({ ...lock, payload: { ...lock.payload, confirmedAt } }), { code: 'command_conflict' })
  await assert.rejects(app.executeConfirmMentorDay(app.newConfirmMentorDayCommand(fadder, open)), { code: 'stale' })
  const locked = await read()
  assert.equal(locked.revision, receipt.revision)
  assert.equal(locked.dayLocked, true)
  assert.deepEqual(locked.mentorDay?.confirmation, receipt.confirmation)
  assert.deepEqual(locked.mentorDay?.followUp, open.mentorDay?.followUp)
  assert.deepEqual(locked.driverAfter?.evaluation, open.driverAfter?.evaluation)
  assert.deepEqual(locked.baseline.confirmation, open.baseline.confirmation)
  await assert.rejects(app.executeDayDraft(app.newDayDraftCommand(fadder, selection, locked.revision,
    { mentorName: 'Forsøk på nytt navn' })), { code: 'locked' })
  await assert.rejects(app.executeMentorDay(app.newMentorDayCommand(fadder, locked, { comments: { [first]: 'Forsøk på endring' } })), { code: 'locked' })
  await assert.rejects(app.executeFollowUp(app.newFollowUpCommand(fadder, locked, { kind: 'training' })), { code: 'locked' })
  const changedContent = { ...approvedContent, helpVersion: 'etter-lås', criteria: approvedContent.criteria.map(row => ({ ...row, help: 'Endret global hjelp' })) }
  const reopened = await new RunApplication(new IndexedDbRunStore(factory), changedContent, newId).open()
  assert.deepEqual(reopened.selected, locked)
  const driverView = (await app.changeRole('sjåfør')).selected!
  assert.equal(driverView.dayLocked, true)
  assert.equal(driverView.mentorDay, undefined)
  assert.equal(driverView.days[0].mentorConfirmation, undefined)
  await assert.rejects(app.executeDayDraft(app.newDayDraftCommand(sjåfør, selection, locked.revision,
    { endTime: '05:40' })), { code: 'locked' })
  await alterStoredRun(factory, created.runId, run => { run.firstDay.session!.routes = '' })
  await assert.rejects(app.read(), { code: 'storage_read' })
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
  await alterStoredRun(factory, created.runId, run => {
    const rows = run.firstDay.mentorDay!.answers
    rows.splice(0, 2, rows[1], rows[0])
  })
  await assert.rejects(session.read(), { code: 'storage_read' })
})
