import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { createRun, criterionIds } from '../src/domain/run.ts'
import type { Actor, ContentSnapshot, CreateRunCommand, CreateRunFields } from '../src/domain/run.ts'

const fadder: Actor = { id: crypto.randomUUID(), role: 'fadder' }
const fields: CreateRunFields = {
  driverName: 'Nora Eksempel', employeeNumber: 'DEMO-001', mentorName: 'Emil Eksempel',
  firstDate: '2028-02-29', initialLastDay: '3',
}

function fixture(content = approvedContent, factory = new IDBFactory()) {
  const store = new IndexedDbRunStore(factory)
  const app = new RunApplication(store, content, () => crypto.randomUUID())
  return { factory, store, app }
}

test('alle 22 kriterier, hjelpetekster og logo samsvarer med godkjent kilde', () => {
  const root = new URL('../../_bmad-output/planning-artifacts/', import.meta.url)
  const ux = new URL('ux-designs/ux-Digital kjørevurdering-2026-10-29/', root)
  const addendum = readFileSync(new URL('prds/prd-Digital kjørevurdering-2026-10-29/addendum.md', root), 'utf8')
  const table = [...addendum.matchAll(/^\| (\d+) \| (.+?) \|\r?$/gm)]
  const help = readFileSync(new URL('help-texts-draft.md', ux), 'utf8').replaceAll('\r\n', '\n')
  const approvedHelp = [...help.matchAll(/^## (\d+) · (.+)\n\n\*Godkjent[^\n]+\*\n\n([^\n]+)/gm)]
  assert.match(help, /^status: approved$/m)
  assert.equal(approvedContent.criteria.length, 22)
  assert.deepEqual(approvedContent.criteria.map(c => c.id), criterionIds)
  assert.deepEqual(approvedContent.criteria.map(c => c.title), table.map(row => row[2]))
  assert.deepEqual(approvedContent.criteria.map(c => c.help), approvedHelp.map(row => row[3]))
  assert.deepEqual(readFileSync(new URL('imports/tide-logo-rgb.png', ux)), readFileSync(new URL('../src/assets/tide-logo-rgb.png', import.meta.url)))
})

test('lagrer alle tre startplaner og skuddår som uendret kalenderdato', async () => {
  const { app, store } = fixture()
  const { actor } = await app.open()
  for (const plan of [1, 2, 3] as const) {
    const command = app.newCreateCommand(actor, { ...fields, initialLastDay: String(plan) })
    const receipt = await app.executeCreate(command)
    const state = await store.read()
    const run = state.runs.find(item => item.id === receipt.runId)
    assert.ok(run)
    assert.equal(run.revision, 1)
    assert.equal(run.lifecycle, 'open')
    assert.equal(run.initialLastDay, plan)
    assert.deepEqual(run.firstDay, {
      id: receipt.dayId, number: 1, date: fields.firstDate, driverId: run.driver.id,
      mentorName: fields.mentorName, identityConfirmed: false,
    })
    assert.equal(run.driver.id, command.payload.driverId)
    assert.equal(run.driver.employeeNumber, fields.employeeNumber)
    assert.equal((await app.read()).selected?.plannedLastDate, plan === 1 ? fields.firstDate : undefined)
  }
  const { runs } = await store.read()
  assert.equal(new Set(runs.map(run => run.id)).size, 3)
  assert.equal(new Set(runs.map(run => run.firstDay.id)).size, 3)
  assert.deepEqual(runs[0].content, approvedContent)
})

test('ugyldige opprettingsfelt og rolle/revisjon gir ingen deldata', async () => {
  const { app, store } = fixture()
  const { actor } = await app.open()
  const invalid: Partial<CreateRunFields>[] = [
    { driverName: '' }, { driverName: ' \t\n' }, { employeeNumber: '  ' }, { mentorName: '' },
    { driverName: undefined }, { employeeNumber: 42 } as unknown as Partial<CreateRunFields>,
    { mentorName: null } as unknown as Partial<CreateRunFields>,
    { firstDate: '' }, { firstDate: '2027-02-29' }, { firstDate: '2028-04-31' },
    { firstDate: '0000-02-01' }, { firstDate: '2028-2-1' }, { firstDate: '2028-02-29T00:00:00Z' },
    { initialLastDay: '' }, { initialLastDay: '4' }, { initialLastDay: '2.0' },
  ]
  for (const bad of invalid) {
    const command = app.newCreateCommand(actor, { ...fields, ...bad })
    await assert.rejects(app.executeCreate(command), { code: 'validation' })
    // En avvist kommando har heller ingen kvittering som kan blokkere et gyldig nytt forsøk.
    assert.deepEqual((await store.read()).runs, [])
  }
  const omitted = app.newCreateCommand(actor, fields)
  delete (omitted.payload as Partial<CreateRunFields>).driverName
  await assert.rejects(app.executeCreate(omitted), {
    code: 'validation', fields: { driverName: 'Skriv inn sjåførens navn.' },
  })
  const command = app.newCreateCommand(actor, fields)
  await assert.rejects(app.executeCreate({ ...command, expectedRevision: 1 }), { code: 'stale' })
  await assert.rejects(app.executeCreate({ ...command, actor: { ...actor, role: 'sjåfør' } }), { code: 'wrong_role' })
  assert.deepEqual((await store.read()).runs, [])
  await app.executeCreate(command)
  assert.equal((await store.read()).runs.length, 1)
})

test('manglende eller ugyldige kommando-, aktør-, løps-, sjåfør- og dags-ID-er avvises før skriving', async () => {
  const { app, store } = fixture()
  const { actor } = await app.open()
  const command = app.newCreateCommand(actor, fields)
  const invalid = [
    { ...command, commandId: undefined },
    { ...command, runId: 'ugyldig' },
    { ...command, actor: { ...actor, id: null } },
    { ...command, payload: { ...command.payload, driverId: '' } },
    { ...command, payload: { ...command.payload, dayId: command.runId } },
  ]
  for (const item of invalid) {
    await assert.rejects(app.executeCreate(item as CreateRunCommand), { code: 'invalid_command' })
  }
  assert.deepEqual((await store.read()).runs, [])
  await app.executeCreate(command)
  assert.equal((await store.read()).runs.length, 1)
})

test('kommando, aktør og payload fryses før den asynkrone transaksjonen leser dem', async () => {
  const { app, store } = fixture()
  const { actor } = await app.open()
  const command = app.newCreateCommand(actor, fields)
  const original = structuredClone(command)
  const result = app.executeCreate(command)
  command.commandId = crypto.randomUUID()
  command.runId = crypto.randomUUID()
  command.actor.role = 'sjåfør'
  command.payload.driverName = 'Endret etter innsending'
  command.payload.dayId = crypto.randomUUID()
  const receipt = await result
  assert.equal(receipt.runId, original.runId)
  assert.equal(receipt.dayId, original.payload.dayId)
  assert.equal((await store.read()).runs[0].driver.name, original.payload.driverName)
  assert.deepEqual(await app.executeCreate(original), receipt)
})

test('ugyldig lagret oppsummering og dato avvises som lesefeil', async () => {
  const { app, store, factory } = fixture()
  const { actor } = await app.open()
  await app.executeCreate(app.newCreateCommand(actor, fields))
  const [run] = (await store.read()).runs
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, SCHEMA_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    for (const data of [
      { ...run, driver: { ...run.driver, employeeNumber: null } },
      { ...run, firstDay: { ...run.firstDay, date: '2027-02-29' } },
    ]) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('runs', 'readwrite')
        tx.objectStore('runs').put({ schemaVersion: SCHEMA_VERSION, data }, run.id)
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
      await assert.rejects(app.read(), { code: 'storage_read' })
      await assert.rejects(app.select(run.id), { code: 'storage_read' })
    }
  } finally {
    db.close()
  }
})

test('eksakt kriterie-ID-sett håndheves selv om antallet er 22', () => {
  const { app } = fixture()
  const command = app.newCreateCommand(fadder, fields)
  const [first, ...rest] = approvedContent.criteria
  const variants = [rest, [{ ...first, id: 'criterion-23' }, ...rest], [rest[0], ...rest]]
  for (const criteria of variants) {
    assert.throws(() => createRun(command, { ...approvedContent, criteria }), { code: 'invalid_content' })
  }
})

test('ny global versjon bevarer tidligere innhold i lageret', async () => {
  const original = fixture()
  const created = await original.app.open()
  const previous = await original.app.executeCreate(original.app.newCreateCommand(created.actor, fields))
  const revised: ContentSnapshot = {
    criteriaVersion: 'test-kriterier-v2',
    ruleVersion: 'test-regler-v2',
    helpVersion: 'test-hjelp-v2',
    criteria: approvedContent.criteria.toReversed().map(item => ({ ...item, help: 'Nytt innhold i testen' })),
  }
  const current = fixture(revised, original.factory)
  const resumed = await current.app.open()
  const next = await current.app.executeCreate(current.app.newCreateCommand(resumed.actor, fields))
  const { runs } = await current.store.read()
  assert.deepEqual(runs.find(item => item.id === previous.runId)?.content, approvedContent)
  assert.deepEqual(runs.find(item => item.id === next.runId)?.content, revised)
})

test('kvitterer tidligst ved complete og abort gir ingen delvis oppretting', async t => {
  const { app, store } = fixture()
  const { actor } = await app.open()
  const command = app.newCreateCommand(actor, fields)
  const put = IDBObjectStore.prototype.put
  let successfulRequest = false
  let receiptBeforeComplete = false
  let acknowledged = false
  const mock = t.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    const request = put.call(this, value, key)
    if (key === 'session') {
      request.addEventListener('success', () => {
        successfulRequest = true
        receiptBeforeComplete = acknowledged
        this.transaction.abort()
      })
    }
    return request
  })
  await assert.rejects(app.executeCreate(command).then(receipt => {
    acknowledged = true
    return receipt
  }), { code: 'storage_write' })
  assert.equal(successfulRequest, true)
  assert.equal(receiptBeforeComplete || acknowledged, false)
  const state = await store.read()
  assert.deepEqual(state.runs, [])
  assert.equal(state.session.selection, undefined)
  mock.mock.restore()
  const receipt = await app.executeCreate(command)
  assert.equal(receipt.runId, command.runId)
  assert.equal((await store.read()).runs.length, 1)
})

test('tapt kvittering, dobbelt innsending og to faner oppretter bare ett løp', async () => {
  const first = fixture()
  const second = fixture(approvedContent, first.factory)
  const { actor } = await first.app.open()
  await second.app.open()
  const command = first.app.newCreateCommand(actor, fields)
  // Begge forsøk sendes før første kvittering, som klienten kaster.
  let observed: Awaited<ReturnType<typeof first.app.executeCreate>> | undefined
  await Promise.all([first.app.executeCreate(command).then(() => undefined), second.app.executeCreate(command).then(receipt => {
    observed = receipt
  })])
  assert.ok(observed)
  assert.equal((await second.store.read()).runs.length, 1)
  await second.app.changeRole('sjåfør')
  assert.deepEqual(await first.app.executeCreate(command), observed)
  await assert.rejects(first.app.executeCreate({ ...command, payload: { ...command.payload, driverName: 'Endret' } }), { code: 'command_conflict' })
  await assert.rejects(first.app.executeCreate(first.app.newCreateCommand(actor, fields)), { code: 'stale' })
  await second.app.changeRole('fadder')
  await assert.rejects(first.app.executeCreate({ ...command, commandId: crypto.randomUUID() }), { code: 'stale' })
  assert.equal((await first.store.read()).runs.length, 1)
})

test('sperret lager, skriveprøve, lesefeil og nyere schema blir egne feil', async t => {
  const unavailable = new RunApplication(new IndexedDbRunStore(undefined), approvedContent, () => crypto.randomUUID())
  await assert.rejects(unavailable.open(), { code: 'storage_open' })
  const { app, factory } = fixture()
  const put = IDBObjectStore.prototype.put
  const blocked = t.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    if (key === 'write-probe') throw new DOMException('Skriveprøve', 'QuotaExceededError')
    return put.call(this, value, key)
  })
  await assert.rejects(app.open(), { code: 'storage_write' })
  blocked.mock.restore()
  await app.open()
  const getAll = t.mock.method(IDBObjectStore.prototype, 'getAll', () => { throw new Error('Lesefeil') })
  await assert.rejects(app.read(), { code: 'storage_read' })
  getAll.mock.restore()

  const newer = await new Promise<IDBDatabase>((resolve, reject) => {
    const upgrade = factory.open('tide-kjorevurdering', SCHEMA_VERSION + 1)
    upgrade.onsuccess = () => resolve(upgrade.result)
    upgrade.onerror = () => reject(upgrade.error)
  })
  newer.close()
  await assert.rejects(app.read(), { code: 'schema_changed' })
  await assert.rejects(app.open(), { code: 'unsupported_schema' })
})
