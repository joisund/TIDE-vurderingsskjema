import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { createTechnicalPdfDownload } from '../src/application/run-pdf.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { createRun } from '../src/domain/run.ts'
import { applyTechnicalCommand, checkTechnicalTraining, createTechnicalTraining, technicalExportSource } from '../src/domain/technical-training.ts'
import type { ConfirmTechnicalTraining, CreateTechnicalTraining, TechnicalCommand, TechnicalTraining } from '../src/domain/technical-training.ts'

const details = { instructorName: 'Øyvind Demo', busType: 'Volvo K1', trainingDate: '2028-02-29' }
const person = { driverName: 'Åse Øvelø', employeeNumber: 'DEMO-32' }

async function fixture() {
  const factory = new IDBFactory()
  const openTab = () => new RunApplication(new IndexedDbRunStore(factory), approvedContent, () => crypto.randomUUID())
  const app = openTab()
  const fadder = (await app.open()).actor
  const instructor = (await app.changeRole('instruktør')).actor
  const { driverId } = await app.executeCreateDriver(app.newCreateDriverCommand(instructor, person))
  const initial = app.newCreateTechnicalCommand(instructor, driverId, details)
  return { factory, app, openTab, fadder, instructor, driverId, initial }
}

function openDatabase(factory: IDBFactory, version = SCHEMA_VERSION, seed?: (db: IDBDatabase, tx: IDBTransaction) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const open = factory.open(DATABASE_NAME, version)
    open.onupgradeneeded = () => seed?.(open.result, open.transaction!)
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

async function editTechnicalRecord(factory: IDBFactory, documentId: string, update?: (doc: TechnicalTraining) => void) {
  const db = await openDatabase(factory)
  try {
    return await new Promise<TechnicalTraining>((resolve, reject) => {
      const tx = db.transaction('technicalDocuments', update ? 'readwrite' : 'readonly')
      const store = tx.objectStore('technicalDocuments')
      const request = store.get(documentId)
      request.onsuccess = () => {
        if (!update) return
        const record = request.result
        update(record.data)
        store.put(record, documentId)
      }
      tx.oncomplete = () => resolve(request.result.data)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

test('tekniske utkast har 52 kildepunkter og kan opprettes uten løp med begge roller', async () => {
  const { app, driverId, instructor, initial, fadder, openTab } = await fixture()
  await assert.rejects(app.executeTechnical({
    ...initial, payload: { instructorName: ' ', busType: '\t', trainingDate: '2027-02-29' },
  }), { code: 'validation', fields: {
    instructorName: 'Fyll inn instruktørnavn.', busType: 'Fyll inn busstype.', trainingDate: 'Velg en gyldig opplæringsdato.',
  } })
  assert.equal((await app.read()).technicalDocuments.length, 0)
  const [receipt, replay] = await Promise.all([app.executeTechnical(initial), app.executeTechnical(initial)])
  assert.deepEqual(receipt, replay)
  await assert.rejects(app.executeTechnical({ ...initial, payload: { ...details, busType: 'Volvo FN' } }), { code: 'command_conflict' })
  const { technical, runs } = await app.read()
  assert.equal(runs.length, 0)
  assert.equal(technical?.driverRef, driverId)
  assert.deepEqual(technical?.header, { ...person, ...details })
  assert.deepEqual(technical?.template.groups.map(group => group.points.length), [13, 13, 14, 12])
  const expectedIds = [13, 13, 14, 12].flatMap((count, group) =>
    Array.from({ length: count }, (_, index) => `T${group + 1}-${String(index + 1).padStart(2, '0')}`))
  assert.deepEqual(technical?.points, expectedIds.map(id => ({ id, status: 'pending', author: undefined, reason: undefined })))
  assert.equal(technical?.template.groups[2].points[2].note, 'Skal normalt stå på A (automat).')
  await assert.rejects(app.readTechnicalSnapshot(receipt), { code: 'locked' })

  const driver = (await app.changeRole('sjåfør')).actor
  const second = await app.executeTechnical(app.newCreateTechnicalCommand(driver, driverId, details))
  assert.notEqual(second.documentId, receipt.documentId)
  assert.equal((await app.read()).technicalDocuments.length, 2)
  const reopened = await openTab().open()
  assert.deepEqual(reopened.actor, driver)
  assert.equal(reopened.technical?.documentId, second.documentId)
  assert.equal(reopened.selected, undefined)

  await app.changeRole('instruktør')
  const otherDriver = await app.executeCreateDriver(app.newCreateDriverCommand(instructor, { ...person, employeeNumber: 'DEMO-33' }))
  assert.equal((await app.read()).technicalDocuments.length, 0)
  await app.changeRole('sjåfør')
  await assert.rejects(app.readTechnical(receipt), { code: 'wrong_role' })
  await assert.rejects(app.executeTechnical(app.newCreateTechnicalCommand(driver, driverId, details)), { code: 'wrong_role' })
  await app.changeRole('fadder')
  assert.equal((await app.read()).actor.id, fadder.id)
  await assert.rejects(app.selectDriver(otherDriver.driverId), { code: 'wrong_role' })
  await assert.rejects(app.readTechnical(receipt), { code: 'wrong_role' })
})

test('fører, kontrollerer og låser tekniske punkter med avsender, revisjon og atomisk frosset kilde', async t => {
  const { app, initial, instructor, openTab } = await fixture()
  const selection = await app.executeTechnical(initial)
  const document = (await app.read()).technical!
  await assert.rejects(app.executeTechnical(app.newSaveTechnicalCommand(instructor, document, {
    points: { 'T1-01': { status: 'reviewed' } },
  })), { code: 'wrong_role' })
  const driver = (await app.changeRole('sjåfør')).actor
  await assert.rejects(app.executeTechnical(app.newConfirmTechnicalCommand(driver, document, details.instructorName)), { code: 'wrong_role' })
  await assert.rejects(app.executeTechnical(app.newSaveTechnicalCommand(driver, document, {
    points: { 'T1-01': { status: 'not_applicable', reason: ' \t' } },
  })), { code: 'invalid_command' })
  await assert.rejects(app.executeTechnical(app.newSaveTechnicalCommand(driver, document, {
    points: { 'T9-99': { status: 'reviewed' } },
  })), { code: 'technical_points' })
  const allExempt = app.newSaveTechnicalCommand(driver, document, { points: Object.fromEntries(document.points.map(({ id }) =>
    [id, { status: 'not_applicable' as const, reason: ' Speil ' }])) })
  const allExemptReceipt = await app.executeTechnical(allExempt)
  assert.deepEqual(await app.executeTechnical(allExempt), allExemptReceipt)
  await app.changeRole('instruktør')
  const exempt = (await app.read()).technical!
  assert.deepEqual(exempt.issues, [{ text: 'Minst ett punkt må være gjennomgått.' }])
  assert.equal((await app.read()).technicalDocuments[0].ready, false)
  await assert.rejects(app.executeTechnical(app.newConfirmTechnicalCommand(instructor, exempt, details.instructorName)),
    { code: 'technical_incomplete' })

  await app.changeRole('sjåfør')
  await app.executeTechnical(app.newSaveTechnicalCommand(driver, exempt, {
    header: { driverName: 'Åse Øvelø Rettet', busType: 'Volvo FN' },
    points: { 'T1-01': { status: 'reviewed' }, 'T1-02': { reasonDraft: 'Uferdig begrunnelse' } },
  }))
  const driverView = (await app.read()).technical!
  assert.equal(driverView.points[0].reasonDraft, ' Speil ')
  assert.equal(driverView.points[1].reason, 'Speil')
  assert.equal(driverView.points[1].reasonDraft, 'Uferdig begrunnelse')
  assert.equal((await app.read()).technicalDocuments[0].ready, true)

  await app.changeRole('instruktør')
  const reviewed = (await app.read()).technical!
  assert.equal(reviewed.points[1].reasonDraft, undefined)
  assert.equal((await app.readTechnical(selection)).points[1].reasonDraft, undefined)
  await assert.rejects(app.executeTechnical(app.newConfirmTechnicalCommand(instructor, reviewed, 'Annen instruktør')), { code: 'technical_instructor' })
  const oldDialog = app.newConfirmTechnicalCommand(instructor, reviewed, details.instructorName)
  const otherTab = openTab()
  await otherTab.open()
  await otherTab.changeRole('sjåfør')
  const longReason = 'Rullestolrampe æøå / åäö '.repeat(450).trim()
  await otherTab.executeTechnical(app.newSaveTechnicalCommand(driver, reviewed, {
    points: { 'T4-12': { status: 'not_applicable', reason: longReason } },
  }))
  await otherTab.changeRole('instruktør')
  await assert.rejects(app.executeTechnical(oldDialog), { code: 'stale' })

  const current = (await app.read()).technical!
  const confirm = app.newConfirmTechnicalCommand(instructor, current, details.instructorName)
  const add = IDBObjectStore.prototype.add
  const abort = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, record: unknown, key: IDBValidKey) {
    const request = add.call(this, record, key)
    if (this.name === 'commands') request.addEventListener('success', () => this.transaction.abort())
    return request
  })
  await assert.rejects(app.executeTechnical(confirm), { code: 'storage_write' })
  assert.equal((await app.read()).technical?.status, 'draft')
  await assert.rejects(app.readTechnicalSnapshot(selection), { code: 'locked' })
  abort.mock.restore()
  const committed = await app.executeTechnical(confirm)
  assert.deepEqual(await otherTab.executeTechnical(confirm), committed)
  const source = await app.readTechnicalSnapshot(selection)
  assert.deepEqual(source.confirmation.actor, { ...instructor, name: details.instructorName })
  assert.equal(source.confirmation.confirmedAt, confirm.payload.confirmedAt)
  assert.equal(source.filledBy.name, 'Åse Øvelø Rettet')
  assert.equal(source.filledBy.driverRef, initial.driverRef)
  assert.equal(source.header.busType, 'Volvo FN')
  assert.equal(source.points.at(-1)?.reason, longReason)
  assert.equal(source.points.at(-1)?.author?.revision, current.revision)
  assert.equal(Object.hasOwn(source.points[1], 'reasonDraft'), false)
  await app.changeRole('sjåfør')
  await assert.rejects(app.executeTechnical(app.newSaveTechnicalCommand(driver, { ...current, revision: committed.revision }, {
    header: { busType: 'Gammel fane' },
  })), { code: 'locked' })
  assert.deepEqual(await app.readTechnicalSnapshot(selection), source)

  const download = createTechnicalPdfDownload(app, async () => {
    await app.showDrivers()
    return new Blob(['test'], { type: 'application/pdf' })
  })
  await assert.rejects(download(selection), { code: 'stale' })
  assert.deepEqual(await app.readTechnicalSnapshot(selection), source)
})

test('dokumentkontrollen avviser fremmede og doble rader, feil avsender og ukjent kildeversjon', async () => {
  const { app, initial, instructor } = await fixture()
  const receipt = await app.executeTechnical(initial)
  const driver = (await app.changeRole('sjåfør')).actor
  await app.executeTechnical(app.newSaveTechnicalCommand(driver, { ...receipt, driverRef: initial.driverRef }, {
    points: Object.fromEntries((await app.readTechnical(receipt)).points.map(({ id }) => [id, { status: 'reviewed' }])),
  }))
  const draft = (await app.read()).technical!
  for (const id of [draft.points[1].id, 'T9-52']) {
    const points = [{ ...draft.points[0], id }, ...draft.points.slice(1)]
    assert.throws(() => checkTechnicalTraining({ ...draft, points }, driver.id, draft.revision), { code: 'technical_points' })
  }
  const wrongAuthor = { ...draft.points[0], author: { ...draft.points[0].author!,
    actor: { ...draft.points[0].author!.actor, driverRef: crypto.randomUUID() } } }
  assert.equal(checkTechnicalTraining({ ...draft, points: [wrongAuthor, ...draft.points.slice(1)] },
    driver.id, draft.revision)[0].pointId, 'T1-01')
  await app.changeRole('instruktør')
  await assert.rejects(app.executeTechnical({
    ...app.newConfirmTechnicalCommand(instructor, draft, details.instructorName), documentType: 'line-training',
  } as unknown as TechnicalCommand), { code: 'invalid_command' })
  await app.executeTechnical(app.newConfirmTechnicalCommand(instructor, draft, details.instructorName))
  const saved = await app.readTechnical(receipt)
  assert.throws(() => technicalExportSource({ ...saved, snapshot: { ...saved.snapshot!, pdfLayoutVersion: 999 } }),
    { code: 'technical_version' })
})

test('lagringskommandoen avviser andre datatyper enn feltobjekter uten å øke revisjonen', async () => {
  const { app, initial, instructor } = await fixture()
  const created = await app.executeTechnical(initial)
  const document = (await app.read()).technical!
  const command = app.newSaveTechnicalCommand(instructor, document, { header: { busType: 'Volvo BN' } })
  for (const payload of [[], 0, 42, true, 'tekst', null, new Date(), { points: new Map() }]) {
    await assert.rejects(app.executeTechnical({ ...command, payload } as TechnicalCommand), { code: 'invalid_command' })
    assert.equal((await app.readTechnical(created)).revision, document.revision)
  }
  assert.equal((await app.executeTechnical(command)).revision, document.revision + 1)
})

test('bekreftet lesing bruker samme kilde som PDF, og feil isoleres til den berørte dokumentraden', async () => {
  const { app, factory, initial, instructor, openTab, driverId } = await fixture()
  const selectedDriver = (await app.read()).drivers[0]
  const run = await app.executeCreate(app.newCreateCommand(instructor, {
    ...person, mentorName: instructor.role, firstDate: details.trainingDate, initialLastDay: '1',
  }, selectedDriver))
  const healthy = await app.executeTechnical(app.newCreateTechnicalCommand(instructor, driverId, details))
  const address = await app.executeTechnical(initial)
  const driver = (await app.changeRole('sjåfør')).actor
  const draft = (await app.read()).technical!
  await app.executeTechnical(app.newSaveTechnicalCommand(driver, draft, {
    points: Object.fromEntries(draft.points.map(({ id }) => [id, { status: 'reviewed' }])),
  }))
  await app.changeRole('instruktør')
  await app.executeTechnical(app.newConfirmTechnicalCommand(instructor, (await app.read()).technical!, details.instructorName))
  const frozen = await app.readTechnicalSnapshot(address)
  await editTechnicalRecord(factory, address.documentId, outer => {
    outer.header.busType = 'Endret ytre busstype'
    outer.points = []
    outer.template.version = 987
  })
  const visible = (await app.read()).technical!
  assert.deepEqual(visible.header, frozen.header)
  assert.deepEqual(visible.points, frozen.points)
  assert.deepEqual(visible.template, frozen.template)
  assert.deepEqual(await app.readTechnicalSnapshot(address), frozen)

  for (const [expectedError, update] of [
    ['technical_version', (doc: TechnicalTraining) => { doc.snapshot!.pdfLayoutVersion = 987 }],
    ['technical_points', (doc: TechnicalTraining) => { doc.snapshot!.points[0].id = doc.snapshot!.points[1].id }],
  ] as const) {
    await editTechnicalRecord(factory, address.documentId, doc => {
      doc.snapshot = structuredClone(frozen)
      update(doc)
    })
    const original = await editTechnicalRecord(factory, address.documentId)
    const reopened = await openTab().open()
    assert.equal(reopened.technical, undefined)
    assert.deepEqual(reopened.technicalProblem, {
      documentType: address.documentType, documentId: address.documentId, error: expectedError,
    })
    assert.equal(reopened.technicalDocuments.find(row => row.documentId === healthy.documentId)?.documentId, healthy.documentId)
    await assert.rejects(app.readTechnicalSnapshot(address), { code: expectedError })
    assert.equal((await app.select(run.runId, run.dayId)).selected?.id, run.runId)
    assert.equal((await app.selectTechnical(healthy)).technical?.documentId, healthy.documentId)
    assert.equal((await app.selectTechnical(address)).technicalProblem?.error, expectedError)
    assert.deepEqual(await editTechnicalRecord(factory, address.documentId), original)
  }
})

test('schema 4 oppgraderer eksisterende sjåfør, profil og løpsdata uten å omskrive innholdet', async () => {
  const { app, instructor, fadder } = await fixture()
  const driver = (await app.read()).drivers[0]
  const driverActor = (await app.changeRole('sjåfør')).actor
  const command = app.newCreateCommand(instructor, {
    ...person, mentorName: details.instructorName, firstDate: details.trainingDate, initialLastDay: '1',
  }, driver)
  const run = createRun(command, approvedContent)
  const session = {
    actors: { fadder: fadder.id, sjåfør: driverActor.id, instruktør: instructor.id },
    role: instructor.role, driverId: driver.id, selection: { runId: run.id, dayId: run.firstDay.id },
  }
  const original = [
    ['meta', 'session', session],
    ['drivers', driver.id.toLowerCase(), driver],
    ['runs', run.id, run],
    ['commands', command.commandId, { fingerprint: 'eksisterende', receipt: { ...session.selection, revision: 0 } }],
  ] as const
  const before = new IDBFactory()
  const old = await openDatabase(before, 4, db => {
    const stores = {
      meta: db.createObjectStore('meta'), drivers: db.createObjectStore('drivers'),
      runs: db.createObjectStore('runs'), commands: db.createObjectStore('commands'),
    }
    stores.runs.createIndex('firstDayId', 'data.firstDay.id', { unique: true })
    stores.meta.add({ schemaVersion: 4 }, 'schema')
    for (const [store, key, data] of original) stores[store].add({ schemaVersion: 4, data }, key)
  })
  old.close()
  const upgraded = new RunApplication(new IndexedDbRunStore(before), approvedContent, () => crypto.randomUUID())
  const view = await upgraded.open()
  assert.deepEqual(view.actor, instructor)
  assert.equal(view.selectedDriverId, driver.id)
  assert.equal(view.selected?.id, run.id)
  assert.deepEqual(view.drivers, [driver])
  const db = await openDatabase(before)
  try {
    const tx = db.transaction(['meta', 'drivers', 'runs', 'commands', 'technicalDocuments'])
    const get = (request: IDBRequest) => new Promise(resolve => { request.onsuccess = () => resolve(request.result) })
    assert.deepEqual(await Promise.all(original.map(([store, key]) => get(tx.objectStore(store).get(key)))),
      original.map(([, , data]) => ({ schemaVersion: SCHEMA_VERSION, data })))
    assert.deepEqual(view.technicalDocuments, [])
  } finally {
    db.close()
  }
  const created = await upgraded.executeTechnical(upgraded.newCreateTechnicalCommand(instructor, driver.id, details))
  assert.equal((await upgraded.read()).technical?.documentId, created.documentId)
})

test('oppgradering fra schema 5 beholder aktivt teknisk dokument, frosset kilde og kvittering', async () => {
  const id = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
  const actors = { fadder: id(1), sjåfør: id(2), instruktør: id(3) }
  const instructor = { role: 'instruktør' as const, id: actors.instruktør }
  const driver = { id: id(4), name: person.driverName, employeeNumber: person.employeeNumber }
  const document = { documentId: id(5), documentType: 'technical-training' as const }
  const create: CreateTechnicalTraining = {
    ...document, actor: instructor, driverRef: driver.id, commandId: id(6), expectedRevision: 0,
    kind: 'create-technical-training', payload: details,
  }
  const draft = createTechnicalTraining(create, driver)
  const reviewed = applyTechnicalCommand(draft, {
    ...create, actor: { id: actors.sjåfør, role: 'sjåfør' }, commandId: id(7), kind: 'save-technical-training',
    payload: { points: Object.fromEntries(draft.points.map(({ id }) => [id, { status: 'reviewed' }])) },
  }, actors.sjåfør)
  const confirm: ConfirmTechnicalTraining = {
    actor: { id: instructor.id, role: instructor.role }, commandId: id(8), ...document, driverRef: driver.id, expectedRevision: 1,
    kind: 'confirm-technical-training', payload: { confirmedAt: '2028-02-29T12:00:00.000Z', instructorName: details.instructorName },
  }
  const frozen = applyTechnicalCommand(reviewed, confirm, actors.sjåfør)
  const receipt = { ...document, revision: frozen.revision }
  const session = { actors, role: instructor.role, driverId: driver.id, document }
  const factory = new IDBFactory()
  const old = await openDatabase(factory, 5, db => {
    const meta = db.createObjectStore('meta')
    meta.add({ schemaVersion: 5 }, 'schema')
    meta.add({ schemaVersion: 5, data: session }, 'session')
    db.createObjectStore('runs').createIndex('firstDayId', 'data.firstDay.id', { unique: true })
    db.createObjectStore('drivers').add({ schemaVersion: 5, data: driver }, driver.id)
    db.createObjectStore('commands').add({ schemaVersion: 5, data: { fingerprint: JSON.stringify(confirm), receipt } }, confirm.commandId)
    const technical = db.createObjectStore('technicalDocuments')
    technical.createIndex('driverRef', 'data.driverRef')
    technical.add({ schemaVersion: 5, data: frozen }, document.documentId)
  })
  old.close()
  const app = new RunApplication(new IndexedDbRunStore(factory), approvedContent, () => crypto.randomUUID())
  const view = await app.open()
  assert.deepEqual(view.actor, instructor)
  assert.equal(view.technical?.documentId, document.documentId)
  assert.deepEqual(await app.readTechnicalSnapshot(document, true), frozen.snapshot)
  assert.deepEqual(await editTechnicalRecord(factory, document.documentId), frozen)
  assert.deepEqual(await app.executeTechnical(confirm), receipt)
  assert.deepEqual(await app.readTechnicalSnapshot(document, true), frozen.snapshot)
})
