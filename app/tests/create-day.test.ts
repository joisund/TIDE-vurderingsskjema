import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { baselineOf } from '../src/domain/baseline.ts'
import { createDay } from '../src/domain/create-day.ts'
import { driverAfterOf } from '../src/domain/driver-day.ts'
import { mentorDayOf } from '../src/domain/mentor-day.ts'
import { runDays } from '../src/domain/run.ts'
import type { Run } from '../src/domain/run.ts'
import { checkClosureDays, validateClosureSnapshot } from '../src/domain/closure.ts'
import type { ConclusionStatus } from '../src/domain/closure.ts'

const fields = { driverName: 'Nora Eksempel', employeeNumber: 'DEMO-18', mentorName: 'Fadder Første',
  firstDate: '2028-02-25', initialLastDay: '3' }
const ids = approvedContent.criteria.map(({ id }) => id)
const ok = { value: 'ok', reason: null } as const
const allOk = Object.fromEntries(ids.map(id => [id, ok]))
const dateOf = (number: number) => `2028-03-${String(number * 2).padStart(2, '0')}`
const fieldsFor = (number: number) => ({ date: dateOf(number), mentorName: `Fadder dag ${number}` })

function fixture(factory = new IDBFactory()) {
  const store = new IndexedDbRunStore(factory)
  const app = new RunApplication(store, approvedContent, () => crypto.randomUUID())
  return { app, store, factory }
}

async function start(plan = '3') {
  const connection = fixture()
  const { app } = connection
  const { actor } = await app.open()
  const command = app.newCreateCommand(actor, { ...fields, initialLastDay: plan })
  await app.executeCreate(command)
  return { ...connection, command, ...await app.read() }
}

test('oppretter før førlås med korrigert identitet, to nye sett og åpen dag 1', async () => {
  const { app, store, factory, actor, selected } = await start()
  const first = { runId: selected!.id, dayId: selected!.dayId }
  await app.executeDayDraft(app.newDayDraftCommand(actor, first, selected!.revision,
    { driverName: 'Nora Korrigert', employeeNumber: 'DEMO-180' }))
  const current = (await app.read()).selected!
  const receipt = await app.executeCreateDay(app.newCreateDayCommand(actor, current, fieldsFor(2)))
  const view = await app.read()
  const raw = (await store.read()).runs[0]
  const later = raw.laterDays![0]
  assert.equal(view.selected?.dayId, receipt.dayId)
  assert.equal(view.selected?.day, 2)
  assert.equal(view.selected?.driverAfter, undefined)
  assert.equal(view.selected?.baseline.confirmation, undefined)
  assert.deepEqual(later.driverIdentity, { name: 'Nora Korrigert', employeeNumber: 'DEMO-180' })
  assert.equal(later.driverId, raw.driver.id)
  assert.notEqual(later.id, raw.firstDay.id)
  assert.equal(later.mentorName, 'Fadder dag 2')
  for (const answers of [later.driverAfterAnswers!, later.mentorDay!.answers]) {
    assert.deepEqual(answers.map(answer => answer.criterionId), ids)
    assert.ok(answers.every(answer => answer.value === null && answer.reason === null && answer.answerRevision === 0))
  }
  assert.deepEqual(later.mentorDay!.comments, {})
  assert.deepEqual(later.mentorDay!.reviews, {})
  assert.equal(view.selected?.mentorDay?.followUp.decision, undefined)

  const driver = await app.changeRole('sjåfør')
  await assert.rejects(app.executeDriverDayDraft(app.newDriverDayDraftCommand(driver.actor, driver.selected!, { answers: allOk })),
    { code: 'baseline_required' })
  await assert.rejects(app.executeCreateDay(app.newCreateDayCommand(driver.actor, driver.selected!, fieldsFor(3))), { code: 'wrong_role' })

  const db = await openDatabase(factory)
  later.driverAfterAnswers![0] = { ...later.driverAfterAnswers![0], ...ok, answerRevision: 1 }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    tx.objectStore('runs').put({ schemaVersion: SCHEMA_VERSION, data: raw }, raw.id)
  })
  db.close()
  await assert.rejects(app.read(), { code: 'storage_read' })
})

test('samme dato i to faner velger lagret dag og gjentar kvittering uten skriveoverskudd', async () => {
  const first = await start()
  const second = fixture(first.factory)
  const { actor, selected } = await second.app.open()
  const command1 = first.app.newCreateDayCommand(actor, selected!, fieldsFor(2))
  const command2 = second.app.newCreateDayCommand(actor, selected!, { ...fieldsFor(2), mentorName: 'Annet navn' })
  const [created, existing] = await Promise.all([first.app.executeCreateDay(command1), second.app.executeCreateDay(command2)])
  assert.deepEqual(created, { runId: selected!.id, dayId: command1.payload.dayId, revision: 2, created: true })
  assert.deepEqual(existing, { ...created, created: false })
  assert.equal((await second.app.read()).selected?.fields.mentorName, 'Fadder dag 2')
  await assert.rejects(second.app.executeCreateDay(second.app.newCreateDayCommand(actor, selected!, fieldsFor(3))), { code: 'stale' })
  await second.app.changeRole('sjåfør')
  await assert.rejects(first.app.executeCreateDay(first.app.newCreateDayCommand(actor, selected!, fieldsFor(2))), { code: 'stale' })
  assert.deepEqual(await first.app.executeCreateDay(command1), created)
  assert.deepEqual(await second.app.executeCreateDay(command2), existing)
  await assert.rejects(first.app.executeCreateDay({ ...command1, payload: { ...command1.payload, mentorName: 'Annet' } }),
    { code: 'command_conflict' })
  const [run] = (await first.store.read()).runs
  assert.equal(runDays(run).length, 2)
  assert.equal(run.revision, 2)
})

test('abort etter aggregatskriv ruller tilbake dag, kvittering og aktivt valg', async t => {
  const { app, store, actor, selected } = await start()
  const command = app.newCreateDayCommand(actor, selected!, fieldsFor(2))
  const add = IDBObjectStore.prototype.add
  const fault = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, data, key) {
    if (key === command.commandId) throw new DOMException('Testavbrudd', 'QuotaExceededError')
    return add.call(this, data, key)
  })
  const before = await store.read()
  await assert.rejects(app.executeCreateDay(command), { code: 'storage_write' })
  assert.deepEqual(await store.read(), before)
  fault.mock.restore()
  const saved = await app.executeCreateDay(command)
  assert.deepEqual(await app.executeCreateDay(command), saved)
  assert.equal((await app.read()).selected?.dayId, saved.dayId)
})

test('avviser planoverskridelse, dato før siste dag og ombytting av registrerte dager', async () => {
  const { app, store, actor, selected } = await start('2')
  const next = (date: string) => app.executeCreateDay(app.newCreateDayCommand(actor, selected!, { ...fieldsFor(2), date }))
  for (const date of ['2027-02-29', '2028-2-28', '2028-02-24']) await assert.rejects(next(date), { code: 'validation' })
  await assert.rejects(app.executeCreateDay(app.newCreateDayCommand(actor, selected!, { ...fieldsFor(2), mentorName: ' ' })),
    { code: 'validation' })
  await next(dateOf(2))
  const second = (await app.read()).selected!
  await assert.rejects(app.executeCreateDay(app.newCreateDayCommand(actor, second, fieldsFor(3))), { code: 'plan_required' })
  for (const date of [fields.firstDate, '2028-02-21']) {
    await assert.rejects(app.executeDayDraft(app.newDayDraftCommand(actor, { runId: second.id, dayId: second.dayId }, second.revision, { date })),
      { code: 'validation' })
  }
  const [run] = (await store.read()).runs
  assert.deepEqual(runDays(run).map(day => day.date), [fields.firstDate, dateOf(2)])
  assert.throws(() => createDay({ ...run, lifecycle: 'closed' }, app.newCreateDayCommand(actor, second, fieldsFor(3))), { code: 'locked' })
})

async function finishRun(plan: string, length: number) {
  const { app, store, factory } = await start(plan)
  let state = await app.changeRole('sjåfør')
  await app.executeBaselineDraft(app.newBaselineDraftCommand(state.actor, state.selected!.id, state.selected!.revision, allOk))
  state = await app.read()
  await app.executeConfirmBaseline(app.newConfirmBaselineCommand(state.actor, state.selected!.id, state.selected!.revision))
  for (let number = 1; number <= length; number += 1) {
    state = await app.changeRole('fadder')
    if (number > 1) {
      await app.executeCreateDay(app.newCreateDayCommand(state.actor, state.selected!, fieldsFor(number)))
      state = await app.read()
    }
    const day = state.selected!
    const selection = { runId: day.id, dayId: day.dayId }
    const expectedMentorName = number === 1 ? fields.mentorName : fieldsFor(number).mentorName
    await app.executeDayDraft(app.newDayDraftCommand(state.actor, selection, day.revision,
      { bus1: 'DEMO-BUSS', routes: 'X', startTime: '08:00', endTime: '15:00' }))
    state = await app.changeRole('sjåfør')
    assert.ok(state.selected!.driverAfter?.answers.every(answer => answer.value === null && !answer.locked))
    const evaluation = state.selected!.driverAfter!.evaluationOffered
      ? { decision: 'submitted' as const, texts: { strength1: `Egenevaluering på dag ${number}` } } : undefined
    await app.executeDriverDayDraft(app.newDriverDayDraftCommand(state.actor, state.selected!, { answers: allOk, evaluation }))
    state = await app.read()
    await app.executeConfirmDriverDay(app.newConfirmDriverDayCommand(state.actor, state.selected!))
    state = await app.changeRole('fadder')
    const lockedIdentity = app.newDayDraftCommand(state.actor, selection, state.selected!.revision, { driverName: 'Omskrevet navn' })
    await assert.rejects(app.executeDayDraft(lockedIdentity), { code: 'locked' })
    await app.executeDayDraft(app.newDayDraftCommand(state.actor, selection, state.selected!.revision,
      { mentorName: `${expectedMentorName} Bekrefter` }))
    state = await app.read()
    await app.executeMentorDay(app.newMentorDayCommand(state.actor, state.selected!, { answers: allOk,
      comments: { [ids[0]]: `Kommentar dag ${number}` } }))
    state = await app.read()
    await app.executeFollowUp(app.newFollowUpCommand(state.actor, state.selected!, { kind: 'none' }))
    state = await app.read()
    await app.executeConfirmMentorDay(app.newConfirmMentorDayCommand(state.actor, state.selected!))
    if (number === 3 && length === 5) {
      const current = await app.read()
      const before = (await store.read()).runs[0].laterDays![1]
      await app.executeFollowUp(app.newFollowUpCommand(current.actor, current.selected!, { kind: 'days', extraDays: 2 }, 'extension'))
      const after = (await store.read()).runs[0].laterDays![1]
      assert.deepEqual(after, before)
    }
  }
  return { app, store, factory }
}

test('fullfører 1, 2, 3 og 5 dager med eksakt dekning og separate historiske bekreftelser', async () => {
  for (const [plan, length] of [['1', 1], ['2', 2], ['3', 3], ['3', 5]] as const) {
    const { app, store } = await finishRun(plan, length)
    const raw = (await store.read()).runs[0]
    const { actor, selected } = await app.read()
    assert.equal(raw.lifecycle, 'open')
    assert.equal(selected?.status, length === 5 ? 'Under oppfølging' : 'Pågående')
    const parts = [baselineOf(raw).answers]
    assert.equal(raw.baselineConfirmation?.actor.name, fields.driverName)
    for (const day of runDays(raw)) {
      assert.equal(day.driverConfirmation?.actor.name, fields.driverName)
      assert.equal(day.mentorConfirmation?.actor.name,
        `${day.number === 1 ? fields.mentorName : fieldsFor(day.number).mentorName} Bekrefter`)
      assert.equal(day.mentorConfirmation?.date, day.date)
      const offered = day.number === 1 || day.number === length || day.number === 3
      assert.equal(day.driverEvaluation?.state, offered ? 'submitted' : 'not_offered')
      if (offered) assert.equal(day.driverEvaluation?.texts.strength1, `Egenevaluering på dag ${day.number}`)
      parts.push(driverAfterOf(raw, day).answers, mentorDayOf(raw, day).answers)
    }
    for (const part of parts) assert.deepEqual(part.map(answer => answer.criterionId), ids)
    assert.equal(new Set(parts.flat().map(answer => answer.id)).size, 22 + length * 44)
    if (length === 5) {
      await assert.rejects(app.executeCreateDay(app.newCreateDayCommand(actor, selected!, fieldsFor(6))), { code: 'day_limit' })
    }
    const driver = await app.changeRole('sjåfør')
    const projection = JSON.stringify(driver)
    assert.doesNotMatch(projection, /Kommentar dag|planEvents|mentorConfirmation/)
    assert.equal(driver.selected?.plannedLastDay, length)

    const mentor = await app.changeRole('fadder')
    const status: ConclusionStatus = length === 5 ? 'follow_up_needed' : 'approved'
    const conclusion = { status, text: length === 1 ? '' : 'Lang konklusjon.\n'.repeat(800), mentorName: 'Fadder Avslutter' }
    await app.executeSaveConclusion(app.newSaveConclusionCommand(mentor.actor, mentor.selected!, conclusion))
    const acknowledged = (await app.read()).selected!
    const command = app.newCloseRunCommand(mentor.actor, acknowledged, conclusion)
    const closed = await app.executeCloseRun(command)
    const document = await app.readClosureSnapshot(raw.id)
    assert.equal(document.history.content.criteria.length, 22)
    assert.equal(document.pdfLayoutVersion, 1)
    assert.deepEqual(runDays({ ...document.history, lifecycle: 'closed' }), runDays(raw))
    assert.deepEqual(document.history.planEvents, raw.planEvents)
    if (length === 5) {
      const altered = structuredClone(document)
      const extension = altered.history.planEvents!.find(event => event.source === 'extension')!
      extension.date = altered.history.firstDay.date
      assert.throws(() => validateClosureSnapshot(altered), { code: 'storage_read' })
    }
    assert.deepEqual(document.conclusion, { text: conclusion.text, status })
    assert.deepEqual(document.closedBy.actor, { ...mentor.actor, name: conclusion.mentorName })
    const mentorClosed = (await app.read()).selected!
    const driverClosed = (await app.changeRole('sjåfør')).selected!
    assert.equal(driverClosed.status, 'Avsluttet')
    assert.deepEqual(driverClosed.closed, mentorClosed.closed)
    assert.deepEqual(await app.executeCloseRun(command), closed)
    assert.equal(driverClosed.canCreateDay, false)
  }
})

test('avslutning krever alle opprettede dager og et kvittert utkast, og tåler kvotefeil og repetisjon', async t => {
  const { app, store, factory } = await finishRun('3', 1)
  const other = fixture(factory)
  await other.app.open()
  const { actor, selected } = await app.read()
  const draft = { text: 'Behold avsnitt.\n\n', status: 'follow_up_needed' as const, mentorName: 'Fadder Avslutter' }
  assert.deepEqual(checkClosureDays({ ...(await store.read()).runs[0], firstDay: undefined! }).map(issue => issue.section), ['days'])
  await assert.rejects(app.readClosureSnapshot(selected!.id), { code: 'locked' })
  await assert.rejects(app.executeCloseRun(app.newCloseRunCommand(actor, selected!, draft)), { code: 'stale' })
  const dirtyRole = await app.changeRole('sjåfør')
  await assert.rejects(app.executeSaveConclusion(app.newSaveConclusionCommand(dirtyRole.actor, dirtyRole.selected!, draft)),
    { code: 'wrong_role' })
  await assert.rejects(app.executeCloseRun(app.newCloseRunCommand(dirtyRole.actor, dirtyRole.selected!, draft)), { code: 'wrong_role' })
  await app.changeRole('fadder')

  await app.executeSaveConclusion(app.newSaveConclusionCommand(actor, selected!, draft))
  const stale = app.newCloseRunCommand(actor, (await app.read()).selected!, draft)
  const nextDraft = { ...draft, text: '' }
  const otherOpen = (await other.app.read()).selected!
  await other.app.executeSaveConclusion(other.app.newSaveConclusionCommand(actor, otherOpen, nextDraft))
  await assert.rejects(app.executeCloseRun(stale), { code: 'stale' })
  const acknowledged = (await app.read()).selected!
  assert.deepEqual(acknowledged.conclusion?.draft, nextDraft)
  const command = app.newCloseRunCommand(actor, acknowledged, nextDraft)

  const add = IDBObjectStore.prototype.add
  const fault = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, data, key) {
    if (key === command.commandId) throw new DOMException('Testavbrudd', 'QuotaExceededError')
    return add.call(this, data, key)
  })
  const before = await store.read()
  await assert.rejects(app.executeCloseRun(command), { code: 'storage_write' })
  assert.deepEqual(await store.read(), before)
  fault.mock.restore()
  const receipt = await app.executeCloseRun(command)
  assert.deepEqual(await other.app.executeCloseRun(command), receipt)
  await assert.rejects(other.app.executeCloseRun({ ...command, payload: { ...command.payload, text: 'Annet' } }),
    { code: 'command_conflict' })
  const closed = (await other.app.read()).selected!
  assert.equal(closed.status, 'Avsluttet')
  await assert.rejects(other.app.executeCloseRun(other.app.newCloseRunCommand(actor, closed, nextDraft)), { code: 'locked' })
  await assert.rejects(other.app.executeSaveConclusion(other.app.newSaveConclusionCommand(actor, closed, nextDraft)), { code: 'locked' })
  await assert.rejects(other.app.executeCreateDay(other.app.newCreateDayCommand(actor, closed, fieldsFor(2))), { code: 'locked' })
  await assert.rejects(other.app.executeFollowUp(other.app.newFollowUpCommand(actor, closed, { kind: 'days', extraDays: 1 }, 'extension')),
    { code: 'locked' })
  const doc = await other.app.readClosureSnapshot(closed.id)
  const selection = { runId: closed.id, dayId: closed.dayId }
  const target = closed.driverAfter!.answers[0]
  await assert.rejects(other.app.executeDayDraft(other.app.newDayDraftCommand(actor, selection, closed.revision, { bus1: 'Omskrevet' })),
    { code: 'locked' })
  await assert.rejects(other.app.executeMentorDay(other.app.newMentorDayCommand(actor, closed, { comments: { [ids[0]]: 'Omskrevet' } })),
    { code: 'locked' })
  await assert.rejects(other.app.executeReview(other.app.newReviewCommand(actor, closed, ids[0], {
    answerId: target.id, answerRevision: target.answerRevision, decision: 'accepted',
  })), { code: 'locked' })
  await assert.rejects(other.app.executeConfirmMentorDay(other.app.newConfirmMentorDayCommand(actor, closed)), { code: 'locked' })
  const driver = await other.app.changeRole('sjåfør')
  await assert.rejects(other.app.executeBaselineDraft(other.app.newBaselineDraftCommand(driver.actor, closed.id, closed.revision, allOk)),
    { code: 'locked' })
  await assert.rejects(other.app.executeDriverDayDraft(other.app.newDriverDayDraftCommand(driver.actor, driver.selected!, { answers: allOk })),
    { code: 'locked' })
  await assert.rejects(other.app.executeConfirmBaseline(other.app.newConfirmBaselineCommand(driver.actor, closed.id, closed.revision)),
    { code: 'locked' })
  await assert.rejects(other.app.executeConfirmDriverDay(other.app.newConfirmDriverDayCommand(driver.actor, driver.selected!)),
    { code: 'locked' })
  assert.deepEqual(await other.app.readClosureSnapshot(closed.id), doc)
  assert.deepEqual(doc.history.firstDay, before.runs[0].firstDay)
  assert.equal(doc.history.initialLastDay, 3)
  assert.equal(doc.conclusion.text, '')
})

test('CloseRun avviser et kvittert konklusjonsutkast når en opprettet dag eller en låst del har mangler', async () => {
  const { app, store, factory } = await finishRun('3', 1)
  const { actor, selected } = await app.read()
  const { dayId } = await app.executeCreateDay(app.newCreateDayCommand(actor, selected!, fieldsFor(2)))
  const first = (await app.select(selected!.id, selected!.dayId)).selected!
  const draft = { text: '', status: 'approved' as const, mentorName: 'Fadder Avslutter' }
  await app.executeSaveConclusion(app.newSaveConclusionCommand(actor, first, draft))
  const ready = (await app.read()).selected!
  assert.ok(ready.conclusion?.issues.some(issue => issue.dayId === dayId && issue.section === 'session' && issue.field === 'bus1'))
  await assert.rejects(app.executeCloseRun(app.newCloseRunCommand(actor, ready, draft)), { code: 'validation' })
  const [run] = (await store.read()).runs
  assert.equal(run.lifecycle, 'open')
  assert.equal(run.closureSnapshot, undefined)
  run.firstDay.mentorConfirmation!.actor.name = 'Avvikende navn'
  await putRun(factory, run)
  const altered = (await app.read()).selected!
  assert.ok(altered.conclusion?.issues.some(issue => issue.dayId === first.dayId && issue.section === 'history'))
  await assert.rejects(app.executeCloseRun(app.newCloseRunCommand(actor, altered, draft)), { code: 'validation' })
})

test('dokumentkontrollen avviser fullstendig antall med feil ID og manglende historiske referanser', async () => {
  const { app, store, factory } = await finishRun('3', 2)
  const { actor, selected } = await app.read()
  const draft = { text: '', status: 'approved' as const, mentorName: 'Fadder Avslutter' }
  await app.executeSaveConclusion(app.newSaveConclusionCommand(actor, selected!, draft))
  const open = (await app.read()).selected!
  await app.executeCloseRun(app.newCloseRunCommand(actor, open, draft))
  const doc = await app.readClosureSnapshot(open.id)
  const corruptions: Array<(snapshot: typeof doc) => void> = [
    ({ history }) => { history.baseline.answers[0].criterionId = 'fremmed-id' },
    ({ history }) => { history.firstDay.driverAfterAnswers![1] = history.firstDay.driverAfterAnswers![0] },
    ({ history }) => { history.laterDays![0].mentorConfirmation = undefined },
    ({ history }) => { history.laterDays![0].driverEvaluation!.dayId = history.firstDay.id },
    ({ history }) => { history.planEvents![0].dayId = history.laterDays![0].id },
    ({ history }) => { history.firstDay.session = undefined },
  ]
  for (const corrupt of corruptions) {
    const altered = structuredClone(doc)
    corrupt(altered)
    assert.throws(() => validateClosureSnapshot(altered), { code: 'storage_read' })
  }
  assert.doesNotThrow(() => validateClosureSnapshot(doc))

  const [outer] = (await store.read()).runs
  outer.firstDay.driverIdentity!.name = 'Endret ytre profil'
  outer.firstDay.session!.bus1 = 'Endret ytre buss'
  outer.content = { ...outer.content, criteria: outer.content.criteria.map(criterion => ({ ...criterion, title: 'Endret ytre kriterietekst' })) }
  await putRun(factory, outer)
  const historical = (await app.select(outer.id, outer.firstDay.id)).selected!
  assert.equal(historical.fields.driverName, doc.history.firstDay.driverIdentity!.name)
  assert.equal(historical.fields.bus1, doc.history.firstDay.session!.bus1)
  assert.deepEqual(historical.baseline.criteria, doc.history.content.criteria)
  assert.deepEqual(await app.readClosureSnapshot(open.id), doc)

  corruptions[0](outer.closureSnapshot!)
  await putRun(factory, outer)
  await assert.rejects(app.read(), { code: 'storage_read' })
  await assert.rejects(app.readClosureSnapshot(open.id), { code: 'storage_read' })
})

function openDatabase(factory: IDBFactory, version?: number, onUpgrade?: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, version)
    request.onupgradeneeded = () => onUpgrade?.(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function putRun(factory: IDBFactory, run: Run) {
  const db = await openDatabase(factory)
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('runs', 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
      tx.objectStore('runs').put({ schemaVersion: SCHEMA_VERSION, data: run }, run.id)
    })
  } finally {
    db.close()
  }
}

const storeNames = ['meta', 'runs', 'commands']
type Entry = [IDBValidKey, { schemaVersion: number; data?: unknown }]
async function entries(db: IDBDatabase) {
  const tx = db.transaction(storeNames, 'readonly')
  return Promise.all(storeNames.map(name => new Promise<Entry[]>((resolve, reject) => {
    const rows: Entry[] = []
    const request = tx.objectStore(name).openCursor()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) resolve(rows)
      else {
        rows.push([cursor.key, cursor.value])
        cursor.continue()
      }
    }
  })))
}

async function seedSchema(version: number, rows: Entry[][]) {
  const factory = new IDBFactory()
  const db = await openDatabase(factory, version, database => {
    database.createObjectStore('meta')
    database.createObjectStore('runs').createIndex('firstDayId', 'data.firstDay.id', { unique: true })
    database.createObjectStore('commands')
  })
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    for (const [index, name] of storeNames.entries()) {
      for (const [key, record] of rows[index]) tx.objectStore(name).put(record, key)
    }
  })
  return { ...fixture(factory), db }
}

test('schema 1 og 2 oppgraderes på tvers av alle lagre og forsøk fra gammel build sperres', async () => {
  const { app, store, factory } = await finishRun('1', 1)
  const expected = await store.read()
  // Ta med et ubekreftet løp og et annet aktivt dagsvalg i samme profil.
  const { actor } = await app.read()
  const command = app.newCreateCommand(actor, { ...fields, driverName: 'Utkast Eksempel' })
  const receipt = await app.executeCreate(command)
  const db = await openDatabase(factory)
  const original = await entries(db)
  db.close()
  const withVersion = (schemaVersion: number) => original.map(rows => rows.map(([key, record]): Entry =>
    [key, { ...record, schemaVersion }]))
  for (const version of [1, 2]) {
    const migrated = await seedSchema(version, withVersion(version))
    migrated.db.onversionchange = () => migrated.db.close()
    const opened = await migrated.app.open()
    assert.equal(opened.selected?.dayId, receipt.dayId)
    assert.deepEqual((await migrated.store.read()).runs.find(run => run.id === expected.runs[0].id), expected.runs[0])
    assert.deepEqual(await migrated.app.executeCreate(command), receipt)
    const current = await openDatabase(migrated.factory)
    assert.equal(current.version, SCHEMA_VERSION)
    assert.deepEqual(await entries(current), original)
    current.close()
    await assert.rejects(openDatabase(migrated.factory, version), { name: 'VersionError' })
  }

  const before = withVersion(1)
  const corrupt = structuredClone(before)
  corrupt[2][0][1].schemaVersion = 999
  const rejected = await seedSchema(1, corrupt)
  rejected.db.close()
  await assert.rejects(rejected.app.open(), { code: 'storage_open' })
  const unchanged = await openDatabase(rejected.factory)
  assert.equal(unchanged.version, 1)
  assert.deepEqual(await entries(unchanged), corrupt)
  unchanged.close()

  const blocked = await seedSchema(1, before)
  await assert.rejects(blocked.app.open(), { code: 'storage_blocked' })
  blocked.db.close()
  const stillV1 = await openDatabase(blocked.factory, 1)
  assert.deepEqual(await entries(stillV1), before)
  stillV1.close()
  assert.equal((await blocked.app.open()).selected?.dayId, receipt.dayId)
})
