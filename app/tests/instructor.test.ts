import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { validateClosureSnapshot } from '../src/domain/closure.ts'
import { createRun, runDays } from '../src/domain/run.ts'
import type { CreateRunCommand, Run } from '../src/domain/run.ts'

const identity = { driverName: 'Åse Eksempel', employeeNumber: 'DEMO-31' }
const settings = { ...identity, mentorName: 'Instruktør Dag 1', firstDate: '2028-03-01', initialLastDay: '3' }
const first = approvedContent.criteria[0].id
const second = approvedContent.criteria[1].id
const ok = Object.fromEntries(approvedContent.criteria.map(({ id }) => [id, { value: 'ok' as const, reason: null }]))
const notRelevant = { value: 'not_relevant' as const, reason: 'Ingen rygging' }

function fixture(factory = new IDBFactory()) {
  const store = new IndexedDbRunStore(factory)
  return { factory, store, app: new RunApplication(store, approvedContent, () => crypto.randomUUID()) }
}

function abortAtReceipt() {
  const original = IDBObjectStore.prototype.add
  IDBObjectStore.prototype.add = function (value, key) {
    const request = original.call(this, value, key)
    if (this.name === 'commands') request.onsuccess = () => this.transaction.abort()
    return request
  }
  return () => { IDBObjectStore.prototype.add = original }
}

test('selvstendige sjåførregistreringer, uttrykkelig valg og atomisk løpsoppretting', async () => {
  const { app, store, factory } = fixture()
  const mentor = (await app.open()).actor
  const { actor } = await app.changeRole('instruktør')
  const command = app.newCreateDriverCommand(actor, identity)
  await assert.rejects(app.executeCreateDriver({ ...command, actor: mentor }), { code: 'wrong_role' })
  await assert.rejects(app.executeCreateDriver({ ...command, payload: { ...command.payload, driverName: ' \t' } }), {
    code: 'validation', fields: { driverName: 'Skriv inn sjåførens navn.' },
  })
  const restore = abortAtReceipt()
  try {
    await assert.rejects(app.executeCreateDriver(command), { code: 'storage_write' })
  } finally {
    restore()
  }
  assert.equal((await app.read()).drivers.length, 0)
  const [saved, replay] = await Promise.all([app.executeCreateDriver(command), app.executeCreateDriver(command)])
  assert.deepEqual(replay, saved)
  await assert.rejects(app.executeCreateDriver({ ...command, payload: { ...command.payload, employeeNumber: 'DEMO-311' } }),
    { code: 'command_conflict' })
  const duplicate = await app.executeCreateDriver(app.newCreateDriverCommand(actor, identity))
  const selected = await app.selectDriver(saved.driverId)
  assert.notEqual(saved.driverId, duplicate.driverId)
  assert.equal(selected.drivers.length, 2)
  assert.equal(selected.runs.length, 0)
  assert.equal(selected.selectedDriverId, saved.driverId)
  const ref = selected.drivers.find(candidate => candidate.id === saved.driverId)!
  const create = app.newCreateCommand(actor, settings, ref)
  await assert.rejects(app.executeCreate({ ...create, payload: { ...create.payload, employeeNumber: 'DEMO-32' } }), { code: 'stale' })
  const unlinked = app.newCreateCommand(actor, settings)
  assert.throws(() => createRun(unlinked, approvedContent), { code: 'driver_reference_missing' })
  await assert.rejects(app.executeCreate(unlinked), { code: 'driver_reference_missing' })
  await assert.rejects(app.executeCreate({
    ...unlinked, payload: { ...unlinked.payload, useExistingDriver: false },
  } as unknown as CreateRunCommand), { code: 'invalid_command' })
  await assert.rejects(store.create(unlinked, 'uten-sjåførvalg', () => createRun(create, approvedContent)),
    { code: 'driver_reference_missing' })
  await assert.rejects(app.executeCreate({ ...unlinked, payload: { ...unlinked.payload, useExistingDriver: true } }),
    { code: 'driver_reference_missing' })
  await app.changeRole('fadder')
  const removeAbort = abortAtReceipt()
  const atomicCreate = app.newCreateCommand(mentor, settings)
  try {
    await assert.rejects(app.executeCreate(atomicCreate), { code: 'storage_write' })
  } finally {
    removeAbort()
  }
  await app.changeRole('instruktør')
  assert.equal((await app.read()).drivers.length, 2)
  assert.equal((await app.read()).runs.length, 0)
  const run = await app.executeCreate(create)
  await app.selectDriver(duplicate.driverId)
  const reopened = await fixture(factory).app.open()
  assert.equal(reopened.selectedDriverId, duplicate.driverId)
  assert.equal(reopened.selected, undefined)
  assert.deepEqual(await app.executeCreate(create), run)
  assert.equal((await app.read()).selectedDriverId, duplicate.driverId)
  const [stored] = (await store.read()).runs
  assert.deepEqual(stored.driver, ref)
  assert.deepEqual(stored.firstDay.driverIdentity, { name: ref.name, employeeNumber: ref.employeeNumber })
  assert.equal(stored.firstDay.driverId, ref.id)
})

test('neste dag kvitterer samme sjåfør og dag etter at en annen fane har valgt en annen sjåfør', async () => {
  const { app, factory } = fixture()
  await app.open()
  const { actor } = await app.changeRole('instruktør')
  const first = await app.executeCreateDriver(app.newCreateDriverCommand(actor, identity))
  const other = await app.executeCreateDriver(app.newCreateDriverCommand(actor, {
    driverName: 'Per Eksempel', employeeNumber: 'DEMO-32',
  }))
  const selected = await app.selectDriver(first.driverId)
  const ref = selected.drivers.find(item => item.id === first.driverId)!
  const run = await app.executeCreate(app.newCreateCommand(actor, settings, ref))
  const start = (await app.read()).selected!
  const remote = fixture(factory).app
  await remote.open()
  await remote.selectDriver(other.driverId)
  assert.equal((await remote.read()).selectedDriverId, other.driverId)
  const next = await app.executeCreateDay(app.newCreateDayCommand(actor, start, {
    date: '2028-03-02', mentorName: 'Instruktør Dag 2',
  }))
  const restored = await fixture(factory).app.open()
  assert.equal(restored.selected?.id, run.runId)
  assert.equal(restored.selected?.dayId, next.dayId)
  assert.equal(restored.selectedDriverId, first.driverId)
})

test('sjåførindeksen bruker én UUID-nøkkel og avviser feil nøkkel i oversikten', async () => {
  const { app, factory } = fixture()
  await app.open()
  const { actor } = await app.changeRole('instruktør')
  const initial = app.newCreateDriverCommand(actor, identity)
  const upper = initial.payload.driverId.toUpperCase()
  await app.executeCreateDriver({ ...initial, payload: { ...initial.payload, driverId: upper } })
  const duplicate = app.newCreateDriverCommand(actor, { ...identity, employeeNumber: 'DEMO-32' })
  await assert.rejects(app.executeCreateDriver({ ...duplicate, payload: { ...duplicate.payload, driverId: upper.toLowerCase() } }),
    { code: 'stale' })
  const selected = await app.selectDriver(upper.toLowerCase())
  assert.equal(selected.selectedDriverId, upper)
  const [reference] = selected.drivers
  const command = app.newCreateCommand(actor, settings, { ...reference, id: upper.toLowerCase() })
  await app.executeCreate(command)
  assert.equal((await app.read()).selected?.driverId, upper)
  assert.deepEqual((await records(factory, 'drivers')).map(([key]) => key), [upper.toLowerCase()])
  const db = await connect(factory)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drivers', 'readwrite')
    tx.objectStore('drivers').add({ schemaVersion: SCHEMA_VERSION, data: {
      ...reference, id: crypto.randomUUID(),
    } }, crypto.randomUUID())
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
  })
  db.close()
  await assert.rejects(app.read(), { code: 'storage_read' })
})

for (const length of [1, 2, 3, 5]) {
  test(`instruktørvurderingen med ${length} dager deler kriterier og låser og beholder sine avsendere`, async () => {
    const { app, store, factory } = fixture()
    const mentor = (await app.open()).actor
    let state = await app.changeRole('instruktør')
    const instructor = state.actor
    const initialLastDay = String(Math.min(length, 3))
    const driverRegistration = await app.executeCreateDriver(app.newCreateDriverCommand(instructor, identity))
    const registered = await app.selectDriver(driverRegistration.driverId)
    const receipt = await app.executeCreate(app.newCreateCommand(instructor, { ...settings, initialLastDay }, registered.drivers[0]))
    let day = (await app.read()).selected!
    const staleInstructor = app.newMentorDayCommand(instructor, day, { answers: ok })
    const blocked = await app.changeRole('fadder')
    assert.equal(blocked.selected, undefined)
    assert.equal(blocked.blocked?.context, 'instruktør')
    await assert.rejects(app.executeMentorDay(staleInstructor), { code: 'stale' })
    await assert.rejects(app.executeMentorDay(app.newMentorDayCommand(mentor, day, { answers: ok })), { code: 'wrong_role' })
    await assert.rejects(app.executeDayDraft(app.newDayDraftCommand(mentor, receipt, day.revision, { startTime: '07:00' })),
      { code: 'wrong_role' })
    await assert.rejects(app.executeCreateDay(app.newCreateDayCommand(mentor, day, { date: '2028-03-02', mentorName: 'Eksempel' })),
      { code: 'wrong_role' })
    await assert.rejects(app.executeFollowUp(app.newFollowUpCommand(mentor, day, { kind: 'none' })), { code: 'wrong_role' })
    await assert.rejects(app.executeSaveConclusion(app.newSaveConclusionCommand(mentor, day, { status: null, text: '', mentorName: 'Eksempel' })),
      { code: 'wrong_role' })
    await assert.rejects(app.readClosureSnapshot(receipt.runId), { code: 'wrong_role' })

    state = await app.changeRole('sjåfør')
    const driver = state.actor
    await app.executeBaselineDraft(app.newBaselineDraftCommand(driver, receipt.runId, state.selected!.revision, { ...ok, [first]: notRelevant }))
    day = (await app.read()).selected!
    await app.executeConfirmBaseline(app.newConfirmBaselineCommand(driver, day.id, day.revision))
    for (let number = 1; number <= length; number += 1) {
      state = await app.changeRole('instruktør')
      if (number > 1) {
        await app.executeCreateDay(app.newCreateDayCommand(instructor, state.selected!, {
          date: `2028-03-0${number}`, mentorName: `Instruktør Dag ${number}`,
        }))
      }
      day = (await app.read()).selected!
      await app.executeDayDraft(app.newDayDraftCommand(instructor, { runId: day.id, dayId: day.dayId }, day.revision,
        { bus1: 'DEMO-BUSS', routes: 'X', startTime: '08:00', endTime: '15:00' }))
      day = (await app.changeRole('sjåfør')).selected!
      assert.equal(day.driverAfter!.answers[0].locked, number === 1)
      assert.equal(day.mentorDay, undefined)
      assert.equal(day.conclusion, undefined)
      const answers = { ...ok }
      if (number === 1) delete answers[first]
      else answers[second] = notRelevant
      const evaluation = day.driverAfter!.evaluationOffered
        ? { decision: 'submitted' as const, texts: { strength1: `Sjåførens evaluering på dag ${number}` } } : undefined
      await app.executeDriverDayDraft(app.newDriverDayDraftCommand(driver, day, { answers, evaluation }))
      day = (await app.read()).selected!
      await app.executeConfirmDriverDay(app.newConfirmDriverDayCommand(driver, day))
      state = await app.changeRole('instruktør')
      day = state.selected!
      await assert.rejects(app.executeConfirmDriverDay(app.newConfirmDriverDayCommand(instructor, day)), { code: 'wrong_role' })
      const criterion = number === 1 ? first : second
      const relevance = day.mentorDay!.relevance[criterion]
      assert.equal(relevance.state, 'pending')
      assert.ok('target' in relevance)
      await app.executeReview(app.newReviewCommand(instructor, day, criterion, {
        ...relevance.target, decision: 'rejected', rejectionComment: 'Rygging ble gjennomført',
      }))
      day = (await app.read()).selected!
      await app.executeMentorDay(app.newMentorDayCommand(instructor, day, {
        answers: ok, comments: { [criterion]: `Faglig merknad dag ${number}` },
      }))
      day = (await app.read()).selected!
      const planCommand = app.newFollowUpCommand(instructor, day, { kind: 'none' })
      const plan = await app.executeFollowUp(planCommand)
      day = (await app.read()).selected!
      const confirmationCommand = app.newConfirmMentorDayCommand(instructor, day)
      const confirmation = await app.executeConfirmMentorDay(confirmationCommand)
      assert.equal(confirmation.confirmation.actor.role, 'instruktør')
      assert.equal(confirmation.confirmation.actor.id, instructor.id)
      assert.equal(confirmation.confirmation.actor.name, `Instruktør Dag ${number}`)
      if (length === 1) {
        await app.changeRole('fadder')
        await assert.rejects(app.executeFollowUp(planCommand), { code: 'stale' })
        await assert.rejects(app.executeConfirmMentorDay(confirmationCommand), { code: 'stale' })
        await app.changeRole('instruktør')
        assert.deepEqual(await app.executeFollowUp(planCommand), plan)
        assert.deepEqual(await app.executeConfirmMentorDay(confirmationCommand), confirmation)
      }
      if (number === 3 && length === 5) {
        day = (await app.read()).selected!
        await app.executeFollowUp(app.newFollowUpCommand(instructor, day, { kind: 'days', extraDays: 2 }, 'extension'))
      }
    }
    state = await app.changeRole('sjåfør')
    assert.equal(state.selected?.plannedLastDay, length)
    assert.doesNotMatch(JSON.stringify(state), /Faglig merknad|rejectionComment|mentorConfirmation/)
    state = await app.changeRole('instruktør')
    day = state.selected!
    assert.equal(day.closed, undefined)
    const conclusion = { text: 'Historisk konklusjon', status: length === 5 ? 'follow_up_needed' as const : 'approved' as const,
      mentorName: 'Instruktør Avslutter' }
    await app.executeSaveConclusion(app.newSaveConclusionCommand(instructor, day, conclusion))
    day = (await app.read()).selected!
    await app.executeCloseRun(app.newCloseRunCommand(instructor, day, conclusion))
    const snapshot = await app.readClosureSnapshot(receipt.runId)
    assert.equal(snapshot.documentVersion, 2)
    assert.equal(snapshot.pdfLayoutVersion, 2)
    assert.equal(snapshot.closedBy.actor.name, conclusion.mentorName)
    assert.equal(snapshot.closedBy.actor.role, 'instruktør')
    const days = runDays(snapshot.history)
    const positions = [snapshot.history.baseline.answers, ...days.flatMap(day => [day.driverAfterAnswers!, day.mentorDay!.answers])]
    assert.equal(new Set(positions.flat().map(answer => answer.id)).size, 22 + 44 * length)
    assert.equal(snapshot.history.baselineConfirmation.actor.role, 'sjåfør')
    assert.ok(days.every(day => day.driverConfirmation!.actor.role === 'sjåfør'))
    assert.ok(days.every(day => day.mentorConfirmation!.actor.role === 'instruktør'))
    assert.ok(days.every(day => day.mentorDay!.reviews[day.number === 1 ? first : second]?.actor.role === 'instruktør'))
    assert.ok(snapshot.history.planEvents!.every(event => event.actor.role === 'instruktør'))
    assert.throws(() => validateClosureSnapshot({ ...snapshot, pdfLayoutVersion: 7 as 2 }), /storage_read/)
    assert.equal((await app.changeRole('fadder')).selected, undefined)
    assert.equal((await app.changeRole('sjåfør')).selected?.closed?.conclusion.status, conclusion.status)
    assert.deepEqual(await app.readClosureSnapshot(receipt.runId), snapshot)
    const reopened = fixture(factory)
    assert.equal((await reopened.app.open()).selected?.day, length)
    assert.deepEqual(await reopened.app.readClosureSnapshot(receipt.runId), snapshot)
    assert.equal((await store.read()).runs[0].driver.id, snapshot.history.driver.id)
  })
}

type Stored<T = unknown> = { schemaVersion: number; data: T }
type Entry<T = unknown> = [IDBValidKey, Stored<T>]

function connect(factory: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function records<T = unknown>(factory: IDBFactory, name: string) {
  const db = await connect(factory)
  try {
    return await new Promise<Entry<T>[]>((resolve, reject) => {
      const result: Entry<T>[] = []
      const request = db.transaction(name).objectStore(name).openCursor()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) resolve(result)
        else {
          result.push([cursor.key, cursor.value])
          cursor.continue()
        }
      }
    })
  } finally {
    db.close()
  }
}

type LegacySession = { actors: { fadder: string; sjåfør: string; instruktør?: string }; role: string; selection: { runId: string; dayId: string } }

async function seedLegacy(runs: Run[], session?: LegacySession, commands: Entry[] = []) {
  const factory = new IDBFactory()
  await new Promise<void>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, 3)
    request.onupgradeneeded = () => {
      const db = request.result
      const meta = db.createObjectStore('meta')
      meta.add({ schemaVersion: 3 }, 'schema')
      if (session) meta.add({ schemaVersion: 3, data: session }, 'session')
      const store = db.createObjectStore('runs')
      store.createIndex('firstDayId', 'data.firstDay.id', { unique: true })
      const receipts = db.createObjectStore('commands')
      for (const [key, record] of commands) receipts.add({ ...record, schemaVersion: 3 }, key)
      for (const { assessmentContext: _context, ...data } of runs) {
        store.add({ schemaVersion: 3, data }, data.id)
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { request.result.close(); resolve() }
  })
  return fixture(factory)
}

test('schema 3 bruker opprettingsidentiteten, bevarer dagsutkast og avbryter ved motstridende kobling', async () => {
  const { app, store, factory } = fixture()
  const { actor } = await app.open()
  const draft = await app.executeCreate(app.newCreateCommand(actor, settings))
  const command = app.newCreateCommand(actor, { ...settings, mentorName: 'Fadder Eksempel', initialLastDay: '1' })
  command.payload.driverId = command.payload.driverId.toUpperCase()
  const closed = await app.executeCreate(command)
  await app.executeDayDraft(app.newDayDraftCommand(actor, closed, closed.revision, {
    bus1: 'DEMO-BUSS', routes: '21', startTime: '08:00', endTime: '15:00',
  }))
  let { actor: driver, selected } = await app.changeRole('sjåfør')
  await app.executeBaselineDraft(app.newBaselineDraftCommand(driver, closed.runId, selected!.revision, ok))
  selected = (await app.read()).selected
  await app.executeConfirmBaseline(app.newConfirmBaselineCommand(driver, closed.runId, selected!.revision))
  selected = (await app.read()).selected
  await app.executeDriverDayDraft(app.newDriverDayDraftCommand(driver, selected!, { answers: ok, evaluation: { decision: 'skipped' } }))
  await app.executeConfirmDriverDay(app.newConfirmDriverDayCommand(driver, (await app.read()).selected!))
  selected = (await app.changeRole('fadder')).selected
  await app.executeMentorDay(app.newMentorDayCommand(actor, selected!, { answers: ok }))
  await app.executeFollowUp(app.newFollowUpCommand(actor, (await app.read()).selected!, { kind: 'none' }))
  await app.executeConfirmMentorDay(app.newConfirmMentorDayCommand(actor, (await app.read()).selected!))
  const conclusion = { text: 'Historisk fadderkonklusjon', status: 'approved' as const, mentorName: 'Fadder Eksempel' }
  await app.executeSaveConclusion(app.newSaveConclusionCommand(actor, (await app.read()).selected!, conclusion))
  await app.executeCloseRun(app.newCloseRunCommand(actor, (await app.read()).selected!, conclusion))
  const snapshot = await app.readClosureSnapshot(closed.runId)
  assert.equal(snapshot.documentVersion, 1)

  const runs = (await store.read()).runs
  const openRun = runs.find(run => run.id === draft.runId)!
  openRun.firstDay.driverIdentity = { name: 'Senere dagsnavn', employeeNumber: 'DEMO-310' }
  const session = (await records<LegacySession>(factory, 'meta')).find(([key]) => key === 'session')![1].data
  delete session.actors.instruktør
  const receipts = await records(factory, 'commands')
  const migration = await seedLegacy(runs, session, receipts)
  const reopened = await migration.app.open()
  assert.deepEqual(reopened.actor, actor)
  assert.equal(reopened.selected?.dayId, closed.dayId)
  assert.deepEqual(await migration.app.readClosureSnapshot(closed.runId), snapshot)
  assert.deepEqual(await migration.app.executeCreate(command), closed)
  assert.deepEqual(await records(migration.factory, 'commands'), receipts)
  assert.deepEqual((await records(migration.factory, 'runs')).map(([key]) => key), runs.map(run => run.id))
  const savedSession = (await records<LegacySession>(migration.factory, 'meta')).find(([key]) => key === 'session')![1].data
  assert.deepEqual(savedSession.selection, session.selection)
  assert.equal(savedSession.actors.fadder, session.actors.fadder)
  assert.equal(savedSession.actors.sjåfør, session.actors.sjåfør)

  const migrated = await migration.app.changeRole('instruktør')
  assert.equal(migrated.selected, undefined)
  assert.equal(migrated.blocked?.context, 'fadder')
  await assert.rejects(migration.app.readClosureSnapshot(closed.runId), { code: 'wrong_role' })
  assert.deepEqual(migrated.drivers, runs.map(run => run.driver).sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase())))
  assert.equal(migrated.runs.find(run => run.id === openRun.id)?.driverName, 'Senere dagsnavn')
  assert.equal((await migration.app.selectDriver(command.payload.driverId.toLowerCase())).selectedDriverId, command.payload.driverId)
  assert.deepEqual((await migration.store.read()).runs, runs)

  const changed = { ...runs[1], driver: { ...runs[0].driver, name: 'Motstridende identitet' },
    firstDay: { ...runs[1].firstDay, driverId: runs[0].driver.id } }
  const conflict = await seedLegacy([runs[0], changed])
  await assert.rejects(conflict.app.open(), { code: 'storage_open' })
  await new Promise<void>((resolve, reject) => {
    const request = conflict.factory.open(DATABASE_NAME)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      assert.equal(db.version, 3)
      assert.equal(db.objectStoreNames.contains('drivers'), false)
      db.close()
      resolve()
    }
  })
})
