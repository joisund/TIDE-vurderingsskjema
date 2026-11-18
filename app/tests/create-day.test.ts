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
  }
})

function openDatabase(factory: IDBFactory, version?: number, onUpgrade?: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, version)
    request.onupgradeneeded = () => onUpgrade?.(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
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

async function seedV1(rows: Entry[][]) {
  const factory = new IDBFactory()
  const db = await openDatabase(factory, 1, database => {
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

test('schema 1 oppgraderes på tvers av alle lagre og forsøk fra gammel build sperres', async () => {
  const { app, store, factory } = await finishRun('1', 1)
  const expected = await store.read()
  // Ta med et ubekreftet løp og et annet aktivt dagsvalg i samme profil.
  const { actor } = await app.read()
  const command = app.newCreateCommand(actor, { ...fields, driverName: 'Utkast Eksempel' })
  const receipt = await app.executeCreate(command)
  const db = await openDatabase(factory)
  const original = await entries(db)
  db.close()
  const before = original.map(rows => rows.map(([key, record]): Entry => [key, { ...record, schemaVersion: 1 }]))
  const migrated = await seedV1(before)
  migrated.db.onversionchange = () => migrated.db.close()
  const opened = await migrated.app.open()
  assert.equal(opened.selected?.dayId, receipt.dayId)
  assert.deepEqual((await migrated.store.read()).runs.find(run => run.id === expected.runs[0].id), expected.runs[0])
  assert.deepEqual(await migrated.app.executeCreate(command), receipt)
  const current = await openDatabase(migrated.factory)
  assert.equal(current.version, SCHEMA_VERSION)
  assert.deepEqual(await entries(current), original)
  current.close()
  await assert.rejects(openDatabase(migrated.factory, 1), { name: 'VersionError' })

  const corrupt = structuredClone(before)
  corrupt[2][0][1].schemaVersion = 999
  const rejected = await seedV1(corrupt)
  rejected.db.close()
  await assert.rejects(rejected.app.open(), { code: 'storage_open' })
  const unchanged = await openDatabase(rejected.factory)
  assert.equal(unchanged.version, 1)
  assert.deepEqual(await entries(unchanged), corrupt)
  unchanged.close()

  const blocked = await seedV1(before)
  await assert.rejects(blocked.app.open(), { code: 'storage_blocked' })
  blocked.db.close()
  const stillV1 = await openDatabase(blocked.factory, 1)
  assert.deepEqual(await entries(stillV1), before)
  stillV1.close()
  assert.equal((await blocked.app.open()).selected?.dayId, receipt.dayId)
})
