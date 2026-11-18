import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { confirmBaseline, updateBaselineDraft } from '../src/domain/baseline.ts'
import { updateDayDraft } from '../src/domain/day-draft.ts'
import { confirmDriverDay, offersEvaluation, updateDriverDayDraft, validateSavedDriverDays } from '../src/domain/driver-day.ts'
import { currentPlan, dailyFollowUp, runStatus, saveFollowUp, validateSavedPlan } from '../src/domain/follow-up.ts'
import type { FollowUpChoice, SaveFollowUpCommand } from '../src/domain/follow-up.ts'
import { confirmMentorDay, updateMentorDay } from '../src/domain/mentor-day.ts'
import { createRun } from '../src/domain/run.ts'
import type { Actor, Day, Run } from '../src/domain/run.ts'

const id = () => crypto.randomUUID()
const mentor: Actor = { id: id(), role: 'fadder' }
const driver: Actor = { id: id(), role: 'sjåfør' }
const fields = {
  driverName: 'Nora Eksempel', employeeNumber: 'DEMO-116', mentorName: 'Emil Eksempel',
  firstDate: '2027-04-05', initialLastDay: '3',
}
const answers = Object.fromEntries(approvedContent.criteria.map(({ id }) => [id, { value: 'ok' as const, reason: null }]))
const confirmedAt = '2027-04-09T13:00:00Z'

const extra = (extraDays: number): FollowUpChoice => ({ kind: 'days', extraDays })
const no: FollowUpChoice = { kind: 'none' }
const training: FollowUpChoice = { kind: 'training' }

function fixture(initialLastDay = '3') {
  return createRun({
    commandId: id(), runId: id(), actor: mentor, expectedRevision: 0,
    payload: { ...fields, initialLastDay, dayId: id(), driverId: id() },
  }, approvedContent)
}

function dayFixture(run: Run, number: 2 | 3 | 4 | 5) {
  return { id: id(), number, date: `2027-04-${String(number + 5).padStart(2, '0')}`,
    driverId: run.driver.id, mentorName: 'Ola Eksempel', identityConfirmed: false } satisfies Day
}

function command(run: Run, choice: FollowUpChoice, dayId = run.firstDay.id, source: 'daily' | 'extension' = 'daily'): SaveFollowUpCommand {
  return { commandId: id(), runId: run.id, actor: mentor, expectedRevision: run.revision, payload: { dayId, source, choice } }
}

function followUp(run: Run, choice: FollowUpChoice, dayId?: string) {
  return saveFollowUp(run, command(run, choice, dayId))
}

function beforeLocked(run: Run) {
  const base = { runId: run.id, actor: driver }
  const answered = updateBaselineDraft(run, { ...base, commandId: id(), expectedRevision: run.revision, payload: { changes: answers } })
  return confirmBaseline(answered, { ...base, commandId: id(), expectedRevision: answered.revision, payload: { confirmedAt } })
}

function afterDraft(run: Run, day: Day, changes: Parameters<typeof updateDriverDayDraft>[1]['payload']['changes']) {
  return updateDriverDayDraft(run, {
    runId: run.id, commandId: id(), expectedRevision: run.revision, actor: driver,
    payload: { dayId: day.id, planRevision: currentPlan(run).revision, changes },
  })
}

function afterCommand(run: Run, day: Day) {
  return {
    runId: run.id, commandId: id(), expectedRevision: run.revision, actor: driver,
    payload: { dayId: day.id, planRevision: currentPlan(run).revision, confirmedAt },
  }
}

async function putRun(factory: IDBFactory, run: Run) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, SCHEMA_VERSION)
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

async function storedFixture(run: Run) {
  const factory = new IDBFactory()
  const app = new RunApplication(new IndexedDbRunStore(factory), approvedContent, id)
  const { actor } = await app.open()
  await putRun(factory, run)
  return { factory, app, actor, selected: (await app.select(run.id)).selected! }
}

test('daglig valg erstatter samme effekt, andre dager og historisk avsender bevares', () => {
  const run = fixture()
  const day2 = dayFixture(run, 2)
  const first = followUp({ ...run, laterDays: [day2] }, extra(1))
  const next = followUp(first, extra(2))
  assert.deepEqual(currentPlan(first), { lastDay: 4, revision: 2 })
  assert.deepEqual(currentPlan(next), { lastDay: 5, revision: 3 })
  assert.equal(next.planEvents![0].decisionId, next.planEvents![1].decisionId)
  assert.equal(dailyFollowUp(next, next.firstDay)?.id, first.followUpDecisions![0].id)
  assert.throws(() => followUp(next, extra(1), day2.id), { code: 'validation' })

  const reduced = followUp(next, extra(1))
  const both = followUp(reduced, extra(1), day2.id)
  const needsTraining = followUp(both, training)
  assert.equal(currentPlan(needsTraining).lastDay, 4)
  assert.equal(runStatus(needsTraining), 'Under oppfølging')
  const dayOneNo = followUp(needsTraining, no)
  assert.equal(runStatus(dayOneNo), 'Under oppfølging')
  const allNo = followUp(dayOneNo, no, day2.id)
  assert.equal(runStatus(allNo), 'Pågående')
  assert.equal(currentPlan(allNo).lastDay, 3)
  assert.equal(allNo.planEvents![3].actor.name, day2.mentorName)
  assert.equal(allNo.planEvents![3].date, day2.date)
  assert.deepEqual(allNo.planEvents!.slice(0, 2), next.planEvents)
  assert.doesNotThrow(() => validateSavedPlan(allNo))
  assert.equal(runStatus({ ...next, lifecycle: 'closed' }), 'Avsluttet')
})

test('dagslåsen verner beslutningen mens separat utvidelse får en ny ID og femdagersgrensen gjelder', () => {
  const current = followUp(fixture(), extra(1))
  const day = current.firstDay
  const locked: Run = { ...current, firstDay: {
    ...day, mentorConfirmation: { actor: { ...mentor, name: 'Emil Eksempel' }, confirmedAt, date: day.date, part: 'mentor_day' },
  } }
  assert.throws(() => followUp(locked, no), { code: 'locked' })
  assert.throws(() => saveFollowUp(current, command(current, extra(1), day.id, 'extension')), { code: 'validation' })
  assert.throws(() => saveFollowUp(locked, command(locked, training, day.id, 'extension')), { code: 'validation' })
  const extension = saveFollowUp(locked, command(locked, extra(1), day.id, 'extension'))
  assert.equal(currentPlan(extension).lastDay, 5)
  assert.deepEqual(dailyFollowUp(extension, day), dailyFollowUp(locked, day))
  assert.notEqual(extension.planEvents![0].decisionId, extension.planEvents![1].decisionId)
  assert.deepEqual(extension.firstDay, locked.firstDay)
  assert.throws(() => saveFollowUp(extension, command(extension, extra(1), day.id, 'extension')), { code: 'validation' })
  const closed = { ...extension, lifecycle: 'closed' } as const
  assert.throws(() => followUp(closed, training), { code: 'locked' })
  assert.throws(() => saveFollowUp(closed, command(closed, extra(1), day.id, 'extension')), { code: 'locked' })
  const days = [dayFixture(extension, 2), dayFixture(extension, 3), dayFixture(extension, 4), dayFixture(extension, 5)]
  const fifthDay = { ...extension, laterDays: days }
  const day5 = days[3]
  assert.throws(() => followUp(fifthDay, extra(1), day5.id), { code: 'validation' })
  assert.equal(currentPlan(followUp(fifthDay, training, day5.id)).lastDay, 5)
  assert.doesNotThrow(() => validateSavedPlan(fifthDay))
})

test('opprettet dag og sjåførlås uten tidligere siste-dagstilbud sperrer reduksjon', () => {
  const run = beforeLocked(followUp(fixture('1'), extra(2)))
  const day2 = dayFixture(run, 2)
  const twoDays = afterDraft({ ...run, laterDays: [day2] }, day2, { answers })
  assert.throws(() => followUp(twoDays, no), { code: 'validation' })
  assert.throws(() => followUp(twoDays, training), { code: 'validation' })
  assert.equal(currentPlan(followUp(twoDays, extra(1))).lastDay, 2)
  const confirmed = confirmDriverDay(twoDays, afterCommand(twoDays, day2))
  assert.equal(confirmed.laterDays![0].driverEvaluation?.state, 'not_offered')
  assert.throws(() => followUp(confirmed, extra(1)), { code: 'validation' })
})

test('endrede tilbud bevarer tidligere faktisk skrevet tekst, lås og senere evaluering på riktig dag', () => {
  const run = beforeLocked(followUp(fixture('1'), extra(1)))
  const day2 = dayFixture(run, 2)
  const draft = afterDraft({ ...run, laterDays: [day2] }, day2, {
    answers, evaluation: { texts: { strength1: 'God flyt på holdeplassen' }, decision: 'submitted' },
  })
  const oldConfirmation = afterCommand(draft, day2)
  const extended = followUp(draft, extra(2))
  assert.equal(offersEvaluation(currentPlan(extended), extended.firstDay), true)
  assert.equal(offersEvaluation(currentPlan(extended), day2), false)
  assert.throws(() => confirmDriverDay(extended, { ...oldConfirmation, expectedRevision: extended.revision }), { code: 'stale' })
  const lockedDay = confirmDriverDay(extended, afterCommand(extended, day2))
  const earlierEvaluation = lockedDay.laterDays![0].driverEvaluation!
  assert.equal(earlierEvaluation.state, 'not_offered')
  assert.equal(earlierEvaluation.offerPlanRevision, currentPlan(draft).revision)
  assert.equal(earlierEvaluation.texts.strength1, 'God flyt på holdeplassen')
  // Tidligere tilbud kan bevises selv om gjeldende tilbud ble flyttet før bekreftelsen.
  const returned = followUp(lockedDay, extra(1))
  assert.equal(currentPlan(returned).lastDay, 2)
  assert.deepEqual(returned.laterDays![0].driverEvaluation, earlierEvaluation)

  const day3 = dayFixture(extended, 3)
  const third = afterDraft({ ...lockedDay, laterDays: [...lockedDay.laterDays!, day3] }, day3, {
    answers, evaluation: { decision: 'skipped' },
  })
  const final = confirmDriverDay(third, afterCommand(third, day3))
  assert.deepEqual(final.laterDays![0].driverEvaluation, earlierEvaluation)
  assert.equal(final.laterDays![1].driverEvaluation?.state, 'skipped')
  assert.doesNotThrow(() => validateSavedDriverDays(final))
  assert.doesNotThrow(() => validateSavedPlan(final))
})

test('utvidelse etter bekreftet sluttegenevaluering endrer ikke det som ble låst', () => {
  const run = beforeLocked(fixture('2'))
  const day2 = dayFixture(run, 2)
  const complete = afterDraft({ ...run, laterDays: [day2] }, day2, {
    answers, evaluation: { decision: 'submitted', texts: { growth1: 'Øve på plassering' } },
  })
  const locked = confirmDriverDay(complete, afterCommand(complete, day2))
  const expanded = followUp(locked, extra(1))
  assert.deepEqual(expanded.laterDays![0], locked.laterDays![0])
  assert.equal(offersEvaluation(currentPlan(expanded), dayFixture(expanded, 3)), true)
  assert.doesNotThrow(() => validateSavedDriverDays(expanded))
})

test('dag 1 kan bli siste dag igjen etter bekreftelse med et nyere førstegangstilbud', () => {
  const run = beforeLocked(fixture('1'))
  const written = afterDraft(run, run.firstDay, {
    answers, evaluation: { texts: { strength1: 'Tekst fra felles tilbud' } },
  })
  const expanded = followUp(written, extra(1))
  const newOffer = afterDraft(expanded, expanded.firstDay, { evaluation: { decision: 'submitted' } })
  const locked = confirmDriverDay(newOffer, afterCommand(newOffer, newOffer.firstDay))
  assert.equal(locked.firstDay.driverEvaluation?.offerPlanRevision, 2)
  const returned = followUp(locked, no)
  assert.equal(currentPlan(returned).lastDay, 1)
  assert.deepEqual(returned.firstDay, locked.firstDay)
  assert.doesNotThrow(() => validateSavedDriverDays(returned))
})

test('eldre plansnapshot bevares som startpunkt for ny historikk uten oppdiktede beslutninger', async () => {
  const run = { ...fixture(), plan: { lastDay: 4, revision: 6 } as const, revision: 10 }
  const { app, actor, selected } = await storedFixture(run)
  const saved = await app.executeFollowUp(app.newFollowUpCommand(actor, selected, training))
  assert.equal(saved.plan.lastDay, 4)
  assert.equal(saved.plan.revision, 7)
  assert.equal(saved.event.oldLastDay, 4)
  const view = (await app.read()).selected!
  assert.deepEqual(view.mentorDay!.followUp.history, [saved.event])
  const yes = await app.executeFollowUp(app.newFollowUpCommand(actor, view, extra(1)))
  assert.equal(yes.plan.lastDay, 5)
  const retracted = await app.executeFollowUp(app.newFollowUpCommand(actor, (await app.read()).selected!, no))
  assert.equal(retracted.plan.lastDay, 4)
  const raw = followUp(run, no)
  assert.equal(raw.initialLastDay, 3)
  assert.deepEqual(raw.planHistoryBase, run.plan)
  assert.doesNotThrow(() => validateSavedPlan(raw))
})

test('IndexedDB avviser frakoblet hendelse, slettet første hendelse og hull i aktive beslutninger', async () => {
  const run = followUp(followUp(fixture(), training), extra(1))
  const { factory, app } = await storedFixture(run)
  const [first, second] = run.planEvents!
  for (const damaged of [
    { ...run, planEvents: [{ ...first, decisionId: id() }, second] },
    { ...run, planEvents: [{ ...second, decisionId: second.commandId }],
      followUpDecisions: [{ ...run.followUpDecisions![0], id: second.commandId }] },
    { ...run, followUpDecisions: new Array(run.followUpDecisions!.length) },
  ]) {
    await putRun(factory, damaged)
    await assert.rejects(app.read(), { code: 'storage_read' })
  }

  const short = followUp(fixture('1'), extra(2))
  const day2 = dayFixture(short, 2)
  const link = { dayId: day2.id }
  const impossible = { ...short, laterDays: [day2], planEvents: [{
    ...short.planEvents![0], ...link, dayNumber: day2.number, date: day2.date,
  }], followUpDecisions: [{ ...short.followUpDecisions![0], ...link }] }
  const other = await storedFixture(short)
  await putRun(other.factory, impossible)
  await assert.rejects(other.app.read(), { code: 'storage_read' })
})

test('IndexedDB avviser tilbud som motsies av en kjent mellomliggende planrevisjon', async () => {
  const initial = beforeLocked(fixture('2'))
  const expanded = followUp(initial, extra(1))
  const reduced = followUp(expanded, no)
  const day2 = dayFixture(initial, 2)
  const draft = afterDraft({ ...reduced, laterDays: [day2] }, day2, {
    answers, evaluation: { texts: { strength1: 'Fra faktisk tilbud' } },
  })
  const { factory, app } = await storedFixture(draft)
  const [later] = draft.laterDays!
  await putRun(factory, { ...draft, laterDays: [{
    ...later, evaluationDraft: { ...later.evaluationDraft!, offerPlanRevision: expanded.plan!.revision },
  }] })
  await assert.rejects(app.read(), { code: 'storage_read' })
})

test('applikasjonen kvitterer og gjentar separat utvidelse fra en lagret, låst dag', async () => {
  const initial = beforeLocked(followUp(fixture(), extra(1)))
  const ready = afterDraft(initial, initial.firstDay, { answers, evaluation: { decision: 'skipped' } })
  const driverLocked = confirmDriverDay(ready, afterCommand(ready, ready.firstDay))
  const dayId = driverLocked.firstDay.id
  const meta = { runId: driverLocked.id, actor: mentor }
  const withFields = updateDayDraft(driverLocked, { ...meta, commandId: id(), expectedRevision: driverLocked.revision,
    payload: { dayId, changes: { bus1: '12', routes: '20', startTime: '21:00', endTime: '03:30' } },
  })
  const assessed = updateMentorDay(withFields, { ...meta, commandId: id(), expectedRevision: withFields.revision,
    payload: { dayId, changes: { answers } },
  })
  const locked = confirmMentorDay(assessed, { ...meta, commandId: id(), expectedRevision: assessed.revision,
    payload: { dayId, confirmedAt },
  })
  const { app, actor, selected } = await storedFixture(locked)
  const daily = selected.mentorDay!.followUp.decision
  await assert.rejects(app.executeFollowUp(app.newFollowUpCommand(actor, selected, no)), { code: 'locked' })
  const command = app.newFollowUpCommand(actor, selected, extra(1), 'extension')
  const receipt = await app.executeFollowUp(command)
  assert.deepEqual(await app.executeFollowUp(command), receipt)
  assert.notEqual(receipt.event.decisionId, daily?.id)
  assert.equal(receipt.event.commandId, command.commandId)
  assert.equal(receipt.event.source, 'extension')
  assert.equal(receipt.event.dayId, locked.firstDay.id)
  assert.equal(receipt.plan.lastDay, 5)
  const view = (await app.read()).selected!
  assert.deepEqual(view.mentorDay?.followUp.history, [...locked.planEvents!, receipt.event])
  assert.deepEqual(view.mentorDay?.followUp.decision, daily)
  assert.deepEqual(view.mentorDay?.confirmation, locked.firstDay.mentorConfirmation)
})

test('transaksjonsabort, repetert kvittering, stale fane og rollebytte gir konsistent plan', async () => {
  const factory = new IDBFactory()
  const app = new RunApplication(new IndexedDbRunStore(factory), approvedContent, id)
  const remote = new RunApplication(new IndexedDbRunStore(factory), approvedContent, id)
  const session = await app.open()
  await app.executeCreate(app.newCreateCommand(session.actor, fields))
  const initial = (await app.read()).selected!
  const drivingDays = app.newFollowUpCommand(session.actor, initial, extra(1))
  const stale = app.newFollowUpCommand(session.actor, initial, no)
  const originalAdd = IDBObjectStore.prototype.add
  IDBObjectStore.prototype.add = function (value, key) {
    const request = originalAdd.call(this, value, key)
    if (this.name === 'commands') request.onsuccess = () => this.transaction.abort()
    return request
  }
  try {
    await assert.rejects(app.executeFollowUp(drivingDays), { code: 'storage_write' })
  } finally {
    IDBObjectStore.prototype.add = originalAdd
  }
  const aborted = (await app.read()).selected!
  assert.equal(aborted.plannedLastDay, 3)
  assert.equal(aborted.mentorDay!.followUp.decision, undefined)
  assert.deepEqual(aborted.mentorDay!.followUp.history, [])
  const receipt = await app.executeFollowUp(drivingDays)
  assert.equal((await remote.open()).selected!.plannedLastDay, 4)
  assert.deepEqual(await app.executeFollowUp(drivingDays), receipt)
  await assert.rejects(app.executeFollowUp({ ...drivingDays, payload: { ...drivingDays.payload, choice: extra(2) } }),
    { code: 'command_conflict' })
  await assert.rejects(app.executeFollowUp(stale), { code: 'stale' })
  const saved = (await app.read()).selected!
  assert.equal(saved.mentorDay!.followUp.history.length, 1)
  assert.equal(saved.status, 'Under oppfølging')
  const asDriver = await remote.changeRole('sjåfør')
  assert.equal(asDriver.selected!.plannedLastDay, 4)
  assert.equal(asDriver.selected!.status, 'Under oppfølging')
  assert.equal(asDriver.runs[0].status, 'Under oppfølging')
  assert.equal(Object.hasOwn(asDriver.selected!, 'mentorDay'), false)
  await assert.rejects(app.executeFollowUp(app.newFollowUpCommand(asDriver.actor, saved, training)), { code: 'wrong_role' })
  await assert.rejects(app.executeFollowUp(app.newFollowUpCommand(session.actor, saved, training)), { code: 'stale' })
})
