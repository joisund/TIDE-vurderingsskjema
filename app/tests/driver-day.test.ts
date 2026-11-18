import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { confirmBaseline, updateBaselineDraft, validateSavedBaseline } from '../src/domain/baseline.ts'
import type { BaselineChanges } from '../src/domain/baseline.ts'
import { checkDayFields, dayDraft } from '../src/domain/day-draft.ts'
import { confirmDriverDay, currentPlan, driverAfterOf, updateDriverDayDraft, validateSavedDriverDays } from '../src/domain/driver-day.ts'
import type { ConfirmDriverDayCommand, DriverDayChanges } from '../src/domain/driver-day.ts'
import { createRun, dayLocks } from '../src/domain/run.ts'
import type { Actor, Day, Run } from '../src/domain/run.ts'

const newId = () => crypto.randomUUID()
const driver: Actor = { id: newId(), role: 'sjåfør' }
const mentor: Actor = { id: newId(), role: 'fadder' }
const fields = { driverName: 'Nora Eksempel', employeeNumber: 'DEMO-12', mentorName: 'Emil Eksempel',
  firstDate: '2027-03-28', initialLastDay: '2' }
const [first, second] = approvedContent.criteria.map(criterion => criterion.id)
const before = Object.fromEntries(approvedContent.criteria.map(({ id }) => [id,
  id === first ? { value: 'not_relevant' as const, reason: 'Ingen rygging' } : { value: 'ok' as const, reason: null },
]))

function newApplication() {
  const factory = new IDBFactory()
  const store = new IndexedDbRunStore(factory)
  const app = new RunApplication(store, approvedContent, newId)
  return { app, store, factory }
}

async function storeRun(factory: IDBFactory, run: Run) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('runs', 'readwrite')
      tx.objectStore('runs').put({ schemaVersion: SCHEMA_VERSION, data: run }, run.id)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

function confirmBefore(run: Run) {
  const { app } = newApplication()
  const answered = updateBaselineDraft(run, app.newBaselineDraftCommand(driver, run.id, run.revision, before))
  return confirmBaseline(answered, app.newConfirmBaselineCommand(driver, run.id, answered.revision))
}

function appendedDay(run: Run, number: 2 | 3 | 4 | 5, date: string) {
  const day = { id: newId(), number, date, driverId: run.driver.id, mentorName: fields.mentorName, identityConfirmed: false }
  return { run: { ...run, laterDays: [...(run.laterDays ?? []), day], revision: run.revision + 1 }, day }
}

function answersFor(run: Run, day: Day): BaselineChanges {
  return Object.fromEntries(driverAfterOf(run, day).answers.filter(answer => !answer.locked).map(({ criterionId }) => [
    criterionId, { value: 'needs_improvement', reason: null },
  ]))
}

function confirmCommand(run: Run, day: Day): ConfirmDriverDayCommand {
  return { commandId: newId(), runId: run.id, actor: driver, expectedRevision: run.revision,
    payload: { dayId: day.id, planRevision: currentPlan(run).revision, confirmedAt: '2027-03-28T15:00:00Z' } }
}

function save(run: Run, day: Day, changes: DriverDayChanges) {
  return updateDriverDayDraft(run, { commandId: newId(), runId: run.id, actor: driver, expectedRevision: run.revision,
    payload: { dayId: day.id, planRevision: currentPlan(run).revision, changes } })
}

test('daglig dekning, A10 og stabile svarrevisjoner bevarer opphavet og skiller dagene', () => {
  const { app } = newApplication()
  const initial = createRun(app.newCreateCommand(mentor, fields), approvedContent)
  assert.throws(() => save(initial, initial.firstDay, { answers: { [first]: before[first] } }), { code: 'baseline_required' })
  assert.throws(() => confirmDriverDay(initial, confirmCommand(initial, initial.firstDay)), { code: 'baseline_required' })
  const locked = confirmBefore(initial)
  const firstDay = locked.firstDay
  const inherited = driverAfterOf(locked, firstDay).answers[0]
  assert.equal(inherited.inheritedFrom, locked.baseline?.answers[0].id)
  assert.equal(inherited.reason, 'Ingen rygging')
  assert.equal(inherited.locked, true)
  assert.throws(() => save(locked, firstDay, { answers: { [first]: before[first] } }), { code: 'locked' })
  assert.throws(() => save(locked, firstDay, { answers: { fremmed: before[first] } }), { code: 'invalid_command' })
  assert.throws(() => save(locked, firstDay, { answers: { [second]: { value: 'not_relevant', reason: 'Ingen' } } }),
    { code: 'validation' })
  const day1Answered = save(locked, firstDay, { answers: { [second]: before[first] } })
  const answer = day1Answered.firstDay.driverAfterAnswers![1]
  const equal = save(day1Answered, firstDay, { answers: { [second]: { ...before[first], reasonDraft: 'Rått utkast' } } })
  assert.deepEqual(equal.firstDay.driverAfterAnswers![1], answer)
  const revised = save(equal, firstDay, { answers: { [second]: { value: 'not_relevant', reason: 'Ingen trafikk' } } })
  assert.equal(revised.firstDay.driverAfterAnswers![1].id, answer.id)
  assert.equal(revised.firstDay.driverAfterAnswers![1].answerRevision, answer.answerRevision + 1)
  assert.deepEqual(revised.firstDay.driverAfterAnswers![0], inherited)
  assert.deepEqual(revised.baseline, initial.baseline ?? locked.baseline)

  const { run, day } = appendedDay(revised, 2, '2027-03-29')
  const after = driverAfterOf(run, day)
  assert.deepEqual(after.answers.map(answer => answer.criterionId), approvedContent.criteria.map(criterion => criterion.id))
  assert.ok(after.answers.every(answer => answer.value === null && !answer.locked && !answer.inheritedFrom))
  assert.notEqual(after.answers[0].id, inherited.id)
  const answered = save(run, day, { answers: { [first]: before[first] } })
  assert.equal(answered.laterDays![0].driverAfterAnswers![0].reason, 'Ingen rygging')
  assert.deepEqual(answered.firstDay, revised.firstDay)
  const saved = answered.laterDays![0].driverAfterAnswers!
  for (const corrupt of [saved[1], { ...saved[0], criterionId: 'fremmed' }, { ...saved[0], id: inherited.id }]) {
    const damaged = { ...answered, laterDays: [{ ...answered.laterDays![0], driverAfterAnswers: [corrupt, ...saved.slice(1)] }] }
    assert.throws(() => validateSavedDriverDays(damaged), { code: 'storage_read' })
    assert.throws(() => confirmDriverDay(damaged, confirmCommand(damaged, day)), { code: 'storage_read' })
  }
})

test('planendring bevarer skrevet tekst på faktisk dag og tidligere bekreftelser låst', () => {
  const { app } = newApplication()
  const locked = confirmBefore(createRun(app.newCreateCommand(mentor, { ...fields, initialLastDay: '1' }), approvedContent))
  const firstDay = locked.firstDay
  const answered = save(locked, firstDay, { answers: answersFor(locked, firstDay) })
  assert.throws(() => confirmDriverDay(answered, confirmCommand(answered, firstDay)), { code: 'validation' })
  const chose = save(answered, firstDay, { evaluation: { decision: 'submitted' } })
  const confirmed = confirmDriverDay(chose, confirmCommand(chose, firstDay))
  assert.deepEqual(confirmed.firstDay.driverEvaluation, {
    dayId: firstDay.id, date: firstDay.date, planRevision: 1, state: 'submitted', texts: {}, offerPlanRevision: 1,
  })
  assert.deepEqual(confirmed.baselineConfirmation, locked.baselineConfirmation)
  const { run, day } = appendedDay({ ...confirmed, plan: { revision: 2, lastDay: 2 } }, 2, '2027-03-29')
  const drafted = save(run, day, { answers: answersFor(run, day), evaluation: {
    texts: { strength1: 'Rolig i trafikken' }, decision: 'skipped',
  } })
  assert.equal(drafted.laterDays?.[0].driverConfirmation, undefined)
  const old = confirmCommand(drafted, day)
  const revised: Run = { ...drafted, plan: { revision: 3, lastDay: 3 }, revision: drafted.revision + 1 }
  assert.throws(() => confirmDriverDay(revised, old), { code: 'stale' })
  assert.throws(() => confirmDriverDay(revised, { ...old, expectedRevision: revised.revision }), { code: 'stale' })
  assert.throws(() => save(revised, day, { evaluation: { decision: 'skipped' } }), { code: 'invalid_command' })
  assert.throws(() => save(revised, day, { evaluation: { texts: { growth1: 'Uten opprinnelig tilbud' }, previousOfferRevision: 1 } }),
    { code: 'invalid_command' })
  assert.throws(() => save({ ...revised, laterDays: [{ ...revised.laterDays![0], evaluationDraft: undefined }] }, day,
    { evaluation: { texts: { growth1: 'Uten lagret tilbud' }, previousOfferRevision: 2 } }), { code: 'invalid_command' })
  const kept = save(revised, day, { evaluation: { texts: { growth1: 'Mer speilbruk' }, previousOfferRevision: 2 } })
  const completed = confirmDriverDay(kept, confirmCommand(kept, day))
  assert.deepEqual(completed.laterDays?.[0].driverEvaluation, {
    dayId: day.id, date: day.date, planRevision: 3, state: 'not_offered', offerPlanRevision: 2,
    texts: { strength1: 'Rolig i trafikken', growth1: 'Mer speilbruk' },
  })
  assert.equal(completed.laterDays?.[0].driverIdentity?.name, fields.driverName)
  assert.deepEqual(completed.firstDay, confirmed.firstDay)
  assert.throws(() => save(completed, day, { answers: { [first]: before[first] } }), { code: 'locked' })

  const third = appendedDay(completed, 3, '2027-03-30')
  const remaining = save(third.run, third.day, { answers: answersFor(third.run, third.day), evaluation: {
    decision: 'skipped', texts: { strength2: 'Jevn fart' },
  } })
  const result = confirmDriverDay(remaining, confirmCommand(remaining, third.day))
  assert.equal(result.laterDays?.[1].driverEvaluation?.state, 'skipped')
  assert.equal(result.laterDays?.[1].driverEvaluation?.texts.strength2, 'Jevn fart')
  assert.equal(result.laterDays?.[1].driverEvaluation?.planRevision, 3)
  assert.deepEqual(result.firstDay, confirmed.firstDay)
  validateSavedBaseline(result)
  validateSavedDriverDays(result)
})

test('adapter avviser korrupte ettersvar på dag 2 og låsetilstand som motsier kjent tilbud', async () => {
  const { app, store, factory } = newApplication()
  const { actor } = await app.open()
  await app.executeCreate(app.newCreateCommand(actor, fields))
  const baseline = confirmBefore((await store.read()).runs[0])
  const { run, day } = appendedDay(baseline, 2, '2027-03-29')
  const answered = save(run, day, { answers: answersFor(run, day), evaluation: { decision: 'submitted' } })
  const locked = confirmDriverDay(answered, confirmCommand(answered, day))
  const savedDay = locked.laterDays![0]
  await storeRun(factory, locked)
  assert.equal((await app.select(locked.id, day.id)).selected?.driverAfter?.evaluation?.state, 'submitted')
  for (const corrupt of [null, false, 0, '', savedDay.driverAfterAnswers!.slice(1)]) {
    await storeRun(factory, { ...locked, laterDays: [{ ...savedDay, driverAfterAnswers: corrupt as never }] })
    await assert.rejects(app.read(), { code: 'storage_read' })
  }
  await storeRun(factory, { ...locked, laterDays: [{ ...savedDay,
    driverEvaluation: { ...savedDay.driverEvaluation!, state: 'not_offered' },
  }] })
  await assert.rejects(app.read(), { code: 'storage_read' })
})

test('etterbekreftelse er atomisk og idempotent, med rollegjerde og separate øktlåsgrenser', async t => {
  const { app, store } = newApplication()
  const { actor: mentorActor } = await app.open()
  const { runId, dayId, revision } = await app.executeCreate(app.newCreateCommand(mentorActor, fields))
  const selection = { runId, dayId }
  const { actor: driverActor, selected } = await app.changeRole('sjåfør', selection)
  assert.equal(selected!.driverAfter, undefined)
  await assert.rejects(app.executeDriverDayDraft(app.newDriverDayDraftCommand(driverActor, selected!, {
    answers: { [first]: before[first] },
  })), { code: 'baseline_required' })
  const saved = await app.executeBaselineDraft(app.newBaselineDraftCommand(driverActor, runId, revision, before))
  await app.executeConfirmBaseline(app.newConfirmBaselineCommand(driverActor, runId, saved.revision))
  const { run, day } = await store.read().then(state => ({ run: state.runs[0], day: state.runs[0].firstDay }))
  const loaded = (await app.read()).selected!
  await app.executeDriverDayDraft(app.newDriverDayDraftCommand(driverActor, loaded, { answers: answersFor(run, day),
    evaluation: { texts: { strength1: 'God observasjon' }, decision: 'submitted' } }))
  const pending = (await app.read()).selected!
  const command = app.newConfirmDriverDayCommand(driverActor, pending)
  await assert.rejects(app.executeConfirmDriverDay(app.newConfirmDriverDayCommand(mentorActor, pending)), { code: 'wrong_role' })

  const add = IDBObjectStore.prototype.add
  const abort = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    const request = add.call(this, value, key)
    if (this.name === 'commands') request.addEventListener('success', () => this.transaction.abort())
    return request
  })
  await assert.rejects(app.executeConfirmDriverDay(command), { code: 'storage_write' })
  abort.mock.restore()
  assert.deepEqual((await app.read()).selected, pending)

  let completed = false
  const complete = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    if (this.name === 'commands') this.transaction.addEventListener('complete', () => { completed = true })
    return add.call(this, value, key)
  })
  const receipt = await app.executeConfirmDriverDay(command)
  complete.mock.restore()
  assert.equal(completed, true)
  assert.deepEqual(await app.executeConfirmDriverDay(command), receipt)
  await assert.rejects(app.executeConfirmDriverDay({ ...command, payload: { ...command.payload, planRevision: 2 } }),
    { code: 'command_conflict' })
  await assert.rejects(app.executeConfirmDriverDay({ ...command, commandId: newId() }), { code: 'stale' })
  const reopened = (await app.open()).selected!
  assert.equal(reopened.driverAfter?.confirmation?.actor.name, fields.driverName)
  assert.equal(reopened.driverAfter?.confirmation?.confirmedAt, command.payload.confirmedAt)
  assert.equal(reopened.days[0].driverConfirmation?.actor.role, 'sjåfør')
  assert.equal(reopened.driverAfter?.evaluation?.texts.strength1, 'God observasjon')
  assert.equal(reopened.dayLocked, false)
  assert.equal(reopened.identityLocked, true)
  assert.deepEqual(reopened.baseline, pending.baseline)
  await assert.rejects(app.executeDriverDayDraft(app.newDriverDayDraftCommand(driverActor, reopened, {
    evaluation: { texts: { strength1: 'Forsøk på omskriving' } },
  })), { code: 'locked' })

  const mentorView = await app.changeRole('fadder', selection)
  assert.equal(mentorView.selected?.driverAfter?.editable, false)
  assert.equal(mentorView.selected?.driverAfter?.evaluation?.texts.strength1, 'God observasjon')
  await assert.rejects(app.executeDriverDayDraft(app.newDriverDayDraftCommand(mentorActor, reopened, {
    evaluation: { decision: 'skipped' },
  })), { code: 'wrong_role' })
  await assert.rejects(app.executeDayDraft(app.newDayDraftCommand(mentorActor, selection, receipt.revision, { date: '2027-03-29' })),
    { code: 'locked' })
  await app.executeDayDraft(app.newDayDraftCommand(mentorActor, selection, receipt.revision, { mentorName: 'Ny fadder', startTime: '07:12' }))
  const completeRun = (await store.read()).runs[0]
  assert.deepEqual(dayLocks(completeRun, completeRun.firstDay), { dayLocked: false, identityLocked: true })
  assert.deepEqual(checkDayFields(dayDraft(completeRun, completeRun.firstDay), 'driver'), {})
  assert.equal(completeRun.firstDay.mentorConfirmation, undefined)
  assert.equal(completeRun.firstDay.mentorName, 'Ny fadder')
})
