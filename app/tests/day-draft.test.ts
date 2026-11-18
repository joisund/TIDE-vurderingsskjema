import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { checkDayFields, dayDraft, dayFieldAccess, updateDayDraft } from '../src/domain/day-draft.ts'
import type { DayChanges } from '../src/domain/day-draft.ts'
import { createRun, validateSavedRun } from '../src/domain/run.ts'
import type { Actor, Confirmation, Run } from '../src/domain/run.ts'

const fields = {
  driverName: 'Nora Eksempel', employeeNumber: 'DEMO-12', mentorName: 'Emil Eksempel',
  firstDate: '2028-10-28', initialLastDay: '3',
}
const fadder: Actor = { id: crypto.randomUUID(), role: 'fadder' }
const driver: Actor = { id: crypto.randomUUID(), role: 'sjåfør' }

function fixture(factory = new IDBFactory()) {
  const store = new IndexedDbRunStore(factory)
  const app = new RunApplication(store, approvedContent, () => crypto.randomUUID())
  return { app, store, factory }
}

function withThreeDays() {
  const { app } = fixture()
  const first = createRun(app.newCreateCommand(fadder, fields), approvedContent)
  const run: Run = {
    ...first,
    laterDays: [
      { ...first.firstDay, id: crypto.randomUUID(), number: 2, date: '2028-10-29' },
      { ...first.firstDay, id: crypto.randomUUID(), number: 3, date: '2028-10-31' },
    ],
  }
  function change(changes: DayChanges, dayId = run.firstDay.id, actor = fadder, state = run) {
    return updateDayDraft(state, app.newDayDraftCommand(actor, { runId: state.id, dayId }, state.revision, changes))
  }
  return { run, change }
}

function confirmation(actor: Actor, name: string): Confirmation {
  return { actor: { ...actor, name }, confirmedAt: '2028-10-28T17:00:00Z' }
}

async function seedRun(factory: IDBFactory, run: Run) {
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

test('fadder redigerer identitet og buss/linjer, begge roller kan skrive tider', () => {
  const { run, change } = withThreeDays()
  for (const changes of [
    { driverName: 'Nora Rettet' }, { employeeNumber: 'DEMO-22' }, { date: '2028-10-26' },
    { mentorName: 'Ada Eksempel' }, { bus1: '71' }, { bus2: '81' }, { routes: '1, 2' },
  ]) {
    assert.throws(() => change(changes, run.firstDay.id, driver), { code: 'wrong_role' })
  }
  const revised = change({
    driverName: 'Nora Rettet', employeeNumber: 'DEMO-22', mentorName: 'Ada Eksempel',
    date: '2028-10-26', bus1: '71', bus2: '81', routes: '1, 2', startTime: '23:00',
  })
  const end = change({ endTime: '00:45' }, run.firstDay.id, driver, revised)
  assert.deepEqual(dayDraft(end, end.firstDay), {
    driverName: 'Nora Rettet', employeeNumber: 'DEMO-22', mentorName: 'Ada Eksempel',
    date: '2028-10-26', bus1: '71', bus2: '81', routes: '1, 2', startTime: '23:00', endTime: '00:45',
  })
  assert.equal(end.driver.id, run.driver.id)
  assert.equal(end.id, run.id)
  assert.equal(end.firstDay.driverId, run.driver.id)
  assert.equal(end.firstDay.id, run.firstDay.id)
  assert.equal(end.revision, run.revision + 2)
})

test('før- og etterlås fryser identiteten, fadderbytte beholder historiske bekreftelser og dagslås er permanent', () => {
  const { run, change } = withThreeDays()
  const first = confirmation(driver, fields.driverName)
  const next = confirmation(driver, 'Nora Dagen Etter')
  const former = confirmation(fadder, 'Emil Dagen Før')
  const three = run.laterDays!
  const staged: Run = {
    ...run,
    baselineConfirmation: first,
    firstDay: { ...run.firstDay, mentorConfirmation: { ...former, date: run.firstDay.date, part: 'mentor_day' } },
    laterDays: [{ ...three[0], driverConfirmation: next }, three[1]],
  }
  const firstOnly = { ...staged, firstDay: run.firstDay }
  assert.equal(dayFieldAccess(firstOnly, firstOnly.firstDay, 'fadder').date, 'locked')
  for (const [data, dayId] of [[firstOnly, run.firstDay.id], [staged, three[0].id]] as const) {
    for (const fields of [{ driverName: 'Annet navn' }, { employeeNumber: 'DEMO-X' }, { date: '2028-10-27' }]) {
      assert.throws(() => change(fields, dayId, fadder, data), { code: 'locked' })
    }
    const reassigned = change({ mentorName: 'Ada Byttet', bus1: '42', startTime: '07:00' }, dayId, fadder, data)
    assert.equal(reassigned.firstDay.mentorName === 'Ada Byttet' || reassigned.laterDays?.[0].mentorName === 'Ada Byttet', true)
    assert.deepEqual(reassigned.baselineConfirmation, first)
    assert.deepEqual(reassigned.laterDays?.[0].driverConfirmation, next)
    assert.deepEqual(reassigned.firstDay.mentorConfirmation, data.firstDay.mentorConfirmation)
  }
  const profileChanged = { ...staged, driver: { ...staged.driver, name: 'Nytt profilnavn', employeeNumber: 'Nytt nummer' } }
  assert.equal(dayDraft(profileChanged, profileChanged.firstDay).driverName, fields.driverName)
  assert.equal(dayDraft(profileChanged, profileChanged.firstDay).employeeNumber, fields.employeeNumber)
  assert.equal(profileChanged.firstDay.mentorConfirmation?.actor.name, former.actor.name)
  for (const changes of [{ mentorName: 'Nye Fadder' }, { bus1: '3' }, { bus2: '7' }, { routes: '6' }, { endTime: '08:00' }]) {
    assert.throws(() => change(changes, run.firstDay.id, fadder, staged), { code: 'locked' })
  }
  assert.throws(() => change({ startTime: '08:00' }, run.firstDay.id, driver, staged), { code: 'locked' })
  assert.throws(() => change({ startTime: '08:00' }, three[1].id, driver, { ...staged, lifecycle: 'closed' }), { code: 'locked' })
})

test('kalenderdato valideres og følger unik stigende dagsrekkefølge med samme stabile tilhørighet', () => {
  const { run, change } = withThreeDays()
  const [second, third] = run.laterDays!
  for (const date of ['2028-10-28', '2028-10-31', '2028-10-27', '2028-11-01', '2028-02-30', '2028-10-29\n', '2028-10-29T00:00:00Z']) {
    assert.throws(() => change({ date }, second.id), (error: { code?: string; fields?: { date?: string } }) =>
      error.code === 'validation' && Boolean(error.fields?.date))
  }
  assert.throws(() => change({ date: second.date }), { code: 'validation' })
  assert.throws(() => change({ date: second.date }, third.id), { code: 'validation' })
  assert.throws(() => change({ date: '2028-10-30' }, crypto.randomUUID()), { code: 'day_missing' })
  assert.throws(() => change({ driverId: crypto.randomUUID() } as DayChanges), { code: 'invalid_command' })
  const updated = change({ date: '2028-10-30' }, second.id)
  assert.deepEqual(updated.laterDays?.[0], {
    ...second, date: '2028-10-30', session: { bus1: '', bus2: '', routes: '', startTime: '', endTime: '' },
  })
  assert.deepEqual(updated.firstDay, run.firstDay)
})

test('feltkontroll skiller sjåførens krav fra dagslåsing og godtar skift over midnatt', () => {
  const { run, change } = withThreeDays()
  const draft = dayDraft(run, run.firstDay)
  assert.deepEqual(checkDayFields(draft, 'driver'), {})
  assert.deepEqual(Object.keys(checkDayFields(draft, 'day-lock')), ['bus1', 'routes', 'startTime', 'endTime'])
  const answer = { ...draft, bus1: '11', routes: '41, 42', startTime: '23:45', endTime: '00:01' }
  assert.deepEqual(checkDayFields(answer, 'day-lock'), {})
  assert.deepEqual(checkDayFields({ ...answer, bus1: '', bus2: '42' }, 'day-lock'), {})
  for (const value of ['07', '7:30', '24:00', '07:60', '23:45:00', '07:30 ', '07:30\n']) {
    const updated = change({ startTime: value, endTime: value })
    const stored = dayDraft(updated, updated.firstDay)
    assert.equal(stored.startTime, value)
    assert.equal(stored.endTime, value)
    assert.deepEqual(checkDayFields(stored, 'driver'), {})
    const issues = checkDayFields({ ...answer, startTime: value, endTime: value }, 'day-lock')
    assert.deepEqual(Object.keys(issues), ['startTime', 'endTime'])
  }
})

test('schema 1-rad uten øktfelt åpnes med tomme felt og kan bevare ufullstendig tekst', async () => {
  const { app, factory, store } = fixture()
  const { actor } = await app.open()
  const receipt = await app.executeCreate(app.newCreateCommand(actor, fields))
  const [run] = (await store.read()).runs
  delete run.firstDay.driverIdentity
  await seedRun(factory, run)
  const legacy = (await app.read()).selected!
  assert.equal(legacy.fields.driverName, fields.driverName)
  assert.equal(legacy.fields.bus1, '')
  assert.equal(legacy.fields.startTime, '')
  const command = app.newDayDraftCommand(actor, receipt, legacy.revision, { mentorName: '', startTime: '07:' })
  await app.executeDayDraft(command)
  const reopened = (await app.open()).selected!
  assert.equal(reopened.fields.mentorName, '')
  assert.equal(reopened.fields.startTime, '07:')
  assert.equal(reopened.fields.date, fields.firstDate)
  const [stored] = (await store.read()).runs
  assert.equal(stored.firstDay.mentorName, fields.mentorName)
  assert.equal(stored.firstDay.mentorNameDraft, '')
  assert.ok(checkDayFields(reopened.fields, 'driver').mentorName)
  await app.executeDayDraft(app.newDayDraftCommand(actor, receipt, reopened.revision, { mentorName: 'Ada Eksempel' }))
  const [corrected] = (await store.read()).runs
  assert.equal(corrected.firstDay.mentorName, 'Ada Eksempel')
  assert.equal(corrected.firstDay.mentorNameDraft, undefined)
})

test('schema 1-validering avviser feil bekreftelsesrolle, ødelagt bekreftelse og låst dag uten frosset identitet', () => {
  const { run } = withThreeDays()
  const confirmed = { ...run, baselineConfirmation: confirmation(driver, fields.driverName) }
  validateSavedRun(confirmed)
  const withoutIdentity = { ...confirmed.firstDay }
  delete withoutIdentity.driverIdentity
  for (const invalid of [
    { ...confirmed, firstDay: withoutIdentity },
    { ...confirmed, baselineConfirmation: confirmation(fadder, fields.mentorName) },
    { ...confirmed, baselineConfirmation: { ...confirmed.baselineConfirmation, confirmedAt: '2028-02-30T00:00:00Z' } },
    { ...confirmed, firstDay: { ...confirmed.firstDay, mentorConfirmation: {
      ...confirmation(driver, fields.driverName), date: confirmed.firstDay.date, part: 'mentor_day' as const,
    } } },
    { ...run, firstDay: { ...run.firstDay, identityConfirmed: true } },
  ]) {
    assert.throws(() => validateSavedRun(invalid), { code: 'storage_read' })
  }
})

test('velger og gjenåpner nøyaktig dag 2 fra schema 1, også når globalt valg endres', async () => {
  const { app, factory, store } = fixture()
  const { actor } = await app.open()
  const receipt = await app.executeCreate(app.newCreateCommand(actor, fields))
  const [run] = (await store.read()).runs
  const day2 = {
    ...run.firstDay, id: crypto.randomUUID(), number: 2 as const, date: '2028-10-29',
    session: { bus1: '12', bus2: '', routes: '4', startTime: '08:00', endTime: '14:00' },
  }
  await seedRun(factory, { ...run, laterDays: [day2] })
  assert.equal((await app.select(run.id, day2.id)).selected?.day, 2)
  const reopened = (await app.open()).selected!
  assert.equal(reopened.dayId, day2.id)
  assert.equal(reopened.fields.date, day2.date)
  assert.equal(reopened.fields.bus1, '12')
  await app.select(receipt.runId, receipt.dayId)
  const exact = (await app.read({ runId: run.id, dayId: day2.id })).selected!
  assert.equal(exact.dayId, day2.id)
  assert.equal((await app.read()).selected?.dayId, receipt.dayId)
})

test('revisjonsgrensen avviser skriving før kvittering eller data endres', async () => {
  const { app, factory, store } = fixture()
  const { actor } = await app.open()
  const receipt = await app.executeCreate(app.newCreateCommand(actor, fields))
  const [run] = (await store.read()).runs
  const revision = Number.MAX_SAFE_INTEGER
  await seedRun(factory, { ...run, revision })
  const command = app.newDayDraftCommand(actor, receipt, revision, { bus1: '81' })
  await assert.rejects(app.executeDayDraft(command), { code: 'storage_write' })
  assert.equal((await app.read()).selected?.revision, revision)
  assert.equal((await app.read()).selected?.fields.bus1, '')
})

test('økttransaksjonen fryser payload, sjekker autoritativ rolle og håndterer identisk repetisjon før stale', async () => {
  const first = fixture()
  const second = fixture(first.factory)
  const { actor } = await first.app.open()
  await second.app.open()
  const nora = await first.app.executeCreate(first.app.newCreateCommand(actor, fields))
  const duplicate = first.app.newDayDraftCommand(actor, nora, nora.revision, { bus1: '17', routes: '4' })
  const original = structuredClone(duplicate)
  const firstSave = first.app.executeDayDraft(duplicate)
  duplicate.actor.role = 'sjåfør'
  duplicate.payload.changes.bus1 = 'Feil buss'
  const saved = await firstSave
  assert.equal(saved.revision, 2)
  const view = (await first.app.read()).selected!
  assert.equal(view.fields.bus1, '17')
  assert.equal(view.fields.routes, '4')
  const otherRole = await second.app.changeRole('sjåfør')
  assert.deepEqual(await second.app.executeDayDraft({
    ...original, payload: { ...original.payload, changes: { routes: '4', bus1: '17' } },
  }), saved)
  await assert.rejects(second.app.executeDayDraft({
    ...original, payload: { ...original.payload, changes: { bus1: '18', routes: '4' } },
  }), { code: 'command_conflict' })
  await assert.rejects(first.app.executeDayDraft(first.app.newDayDraftCommand(actor, nora, view.revision, { bus1: '19' })), { code: 'stale' })
  await assert.rejects(second.app.executeDayDraft(second.app.newDayDraftCommand(otherRole.actor, nora, view.revision, { bus1: '20' })), { code: 'wrong_role' })
  await second.app.changeRole('fadder')
  const kim = await second.app.executeCreate(second.app.newCreateCommand(actor, { ...fields, driverName: 'Kim Eksempel' }))
  const stale = first.app.newDayDraftCommand(actor, nora, nora.revision, { bus1: '99' })
  await assert.rejects(first.app.executeDayDraft(stale), { code: 'stale' })
  await assert.rejects(first.app.executeDayDraft(stale), { code: 'stale' })
  const exact = (await first.app.read(nora)).selected!
  assert.equal(exact.id, nora.runId)
  assert.equal(exact.dayId, nora.dayId)
  assert.equal(exact.fields.bus1, '17')
  assert.equal((await second.app.read()).selected?.id, kim.runId)
  await assert.rejects(first.app.read({ ...nora, dayId: kim.dayId }), { code: 'storage_read' })
})

test('økttransaksjonen kvitterer etter complete og ruller tilbake både aggregat og kvittering ved abort og kvote', async t => {
  const { app } = fixture()
  const { actor } = await app.open()
  const { runId, dayId, revision } = await app.executeCreate(app.newCreateCommand(actor, fields))
  const command = app.newDayDraftCommand(actor, { runId, dayId }, revision, { routes: '3' })
  const put = IDBObjectStore.prototype.put
  const quota = t.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    if (this.name === 'runs') throw new DOMException('Kvote', 'QuotaExceededError')
    return put.call(this, value, key)
  })
  await assert.rejects(app.executeDayDraft(command), { code: 'storage_write' })
  quota.mock.restore()

  const add = IDBObjectStore.prototype.add
  let requestSucceeded = false
  const abort = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    const request = add.call(this, value, key)
    if (this.name === 'commands') {
      request.addEventListener('success', () => {
        requestSucceeded = true
        this.transaction.abort()
      })
    }
    return request
  })
  await assert.rejects(app.executeDayDraft(command), { code: 'storage_write' })
  assert.equal(requestSucceeded, true)
  assert.equal((await app.read()).selected?.revision, revision)
  assert.equal((await app.read()).selected?.fields.routes, '')
  abort.mock.restore()
  const receipt = await app.executeDayDraft(command)
  assert.deepEqual(receipt, { runId, dayId, revision: revision + 1 })
  assert.deepEqual(await app.executeDayDraft(command), receipt)
  assert.equal((await app.read()).selected?.fields.routes, '3')
})
