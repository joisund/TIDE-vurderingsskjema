import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { createLinePdfDownload } from '../src/application/run-pdf.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { extraLines } from '../src/content/line-training.v2.ts'
import { lineExportSource, validateSavedLine } from '../src/domain/line-training.ts'
import type { LineEntryChange, LineSelection, LineTraining } from '../src/domain/line-training.ts'
import { lineTrainingV1Fixture, seedLineTrainingV1 } from './fixtures/line-training-v1.ts'

const person = { driverName: 'Åse Fiktiv öä', employeeNumber: 'DEMO-L33' }
const date = '2025-01-14'
const labels = '20|21|22|X23|24|26|X27|28|X29|X31|X32|33 (M1)|34 (M2)|X35|X36|40|42|X43|X44|413|550'.split('|')
const standardIds = 'L01 L02 L03 L04 L05 L06 L07 L08 L09 L11 L12 L13 L14 L15 L16 L17 L18 L19 L20 L21 L26'.split(' ')

async function fixture() {
  const factory = new IDBFactory()
  const newTab = () => new RunApplication(new IndexedDbRunStore(factory), approvedContent, () => crypto.randomUUID())
  const app = newTab()
  await app.open()
  const instructor = (await app.changeRole('instruktør')).actor
  const { driverId } = await app.executeCreateDriver(app.newCreateDriverCommand(instructor, person))
  const create = app.newCreateLineCommand(instructor, driverId)
  const receipt = await app.executeLineTraining(create)
  const read = () => app.readLineTraining(receipt)
  return { factory, app, newTab, instructor, driverId, create, receipt, read }
}

function newEntry(lineId: string, drivenDate: string): LineEntryChange {
  return { kind: 'add', entryId: crypto.randomUUID(), fields: { lineId, drivenDate } }
}

async function changeStoredLine(factory: IDBFactory, selection: LineSelection, edit: (document: LineTraining) => void) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = factory.open(DATABASE_NAME)
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('lineDocuments', 'readwrite')
      const store = tx.objectStore('lineDocuments')
      const read = store.get(selection.documentId)
      read.onsuccess = () => {
        const record = read.result
        edit(record.data)
        store.put(record, selection.documentId)
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

test('oppretter linjeoversikt uavhengig av teknisk skjema og løp med eksakt mal og aktiv sjåførkobling', async () => {
  const { app, driverId, create, receipt, instructor, read, newTab } = await fixture()
  assert.deepEqual(await app.executeLineTraining(create), receipt)
  const doc = await read()
  assert.equal(doc.driverRef, driverId)
  assert.deepEqual(doc.header, person)
  assert.deepEqual(doc.entries, [])
  assert.deepEqual(doc.snapshots, [])
  assert.equal(doc.template.version, 2)
  assert.deepEqual(doc.template.lines.map(line => line.label), labels)
  assert.deepEqual(doc.template.lines.map(line => line.id), standardIds)
  assert.deepEqual(extraLines.map(line => [line.id, line.label]), [['L10', '30'], ['L22', '421'], ['L23', '425'], ['L24', '428'], ['L25', '450']])
  assert.equal(extraLines[0].note, 'Kjøres med leddbuss. Egen opplæring')
  await assert.rejects(app.readLineSnapshot(receipt), { code: 'line_source_missing' })
  const view = await newTab().open()
  assert.equal(view.lineTraining?.documentId, receipt.documentId)
  assert.equal(view.technicalDocuments.length, 0)
  assert.equal(view.runs.length, 0)
  const duplicate = await app.executeCreateDriver(app.newCreateDriverCommand(instructor, person))
  assert.notEqual(duplicate.driverId, driverId)
  assert.equal((await app.read()).lineDocuments.length, 0)
  await assert.rejects(read(), { code: 'wrong_role' })
  const driver = (await app.changeRole('sjåfør')).actor
  const separate = await app.executeLineTraining(app.newCreateLineCommand(driver, duplicate.driverId))
  assert.notEqual(separate.documentId, receipt.documentId)
  await app.changeRole('fadder')
  assert.equal((await app.read()).lineDocuments.length, 0)
  await assert.rejects(app.readLineTraining(separate), { code: 'wrong_role' })
})

test('oppgraderer v6 til grunnkursmal v2, beholder innhold og kvitteringer og isolerer en ugyldig oversikt', async () => {
  const legacy = lineTrainingV1Fixture()
  const factory = new IDBFactory()
  await seedLineTrainingV1(legacy, factory)
  const old = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = factory.open(DATABASE_NAME, 6)
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  let versionChanged = false
  old.onversionchange = () => { versionChanged = true; old.close() }
  const app = new RunApplication(new IndexedDbRunStore(factory), approvedContent, () => crypto.randomUUID())
  const view = await app.open()
  assert.ok(versionChanged)
  assert.throws(() => old.transaction('lineDocuments', 'readwrite'), { name: 'InvalidStateError' })
  await assert.rejects(new Promise((resolve, reject) => {
    const open = factory.open(DATABASE_NAME, 6)
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  }), { name: 'VersionError' })
  const { document, receipt, command } = legacy
  const read = () => app.readLineTraining(receipt)
  const migrated = await read()
  assert.equal(migrated.template.version, 2)
  assert.deepEqual(migrated.template.lines.map(line => line.id), standardIds)
  assert.deepEqual({ ...migrated, template: document.template }, document)
  assert.deepEqual(await app.executeLineTraining(command), receipt)
  assert.equal(view.lineTraining?.documentId, receipt.documentId)
  assert.deepEqual(view.lineDocuments.find(line => line.documentId === legacy.corruptId), {
    documentId: legacy.corruptId, documentType: 'line-training', error: 'line_version',
  })
  let storedTemplateVersion: number | undefined
  await changeStoredLine(factory, receipt, current => { storedTemplateVersion = current.template.version })
  assert.equal(storedTemplateVersion, 2)

  const { actor: driver } = await app.changeRole('sjåfør')
  for (const { id } of extraLines) {
    await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(driver, migrated, { changes: [newEntry(id, date)] })), { code: 'line_template' })
  }
  const draft = migrated.entries[1]
  const edit = { entryId: draft.entryId, kind: 'edit' as const, fields: { lineId: 'L22', drivenDate: '2025-04-15' } }
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(driver, migrated, {
    changes: [{ ...edit, fields: { ...edit.fields, lineId: 'L10' } }],
  })), { code: 'line_template' })
  const standard = newEntry('L21', date)
  await app.executeLineTraining(app.newSaveLineCommand(driver, migrated, { changes: [edit, standard] }))
  const { actor: instructor } = await app.changeRole('instruktør')
  const changed = await read()
  assert.deepEqual(changed.entries[1], { ...draft, ...edit.fields, editedAt: changed.entries[1].editedAt })
  await app.executeLineTraining(app.newConfirmLineCommand(instructor, changed, [draft.entryId, standard.entryId], 'Astrid Fiktiv'))
  const source = await app.readLineSnapshot(receipt)
  assert.deepEqual(source.entries[0], document.snapshots[0].entries[0])
  assert.deepEqual(source.entries.map(entry => entry.lineId), ['L10', 'L22', 'L21'])
  assert.deepEqual(source.previouslyRecordedLines, extraLines.slice(0, 2))
  assert.deepEqual(await app.readLineSnapshot(receipt, 1), document.snapshots[0])
  const altered = await read()
  altered.snapshots[1].previouslyRecordedLines?.pop()
  assert.throws(() => validateSavedLine(altered), { code: 'line_history' })
})

test('valgt bekreftelse er atomisk og idempotent, ufullstendig uvalgt utkast blir utenfor frosset historikk', async t => {
  const { app, instructor, receipt, read, newTab } = await fixture()
  const first = newEntry('L01', date)
  const duplicate = newEntry('L01', date)
  const incomplete = newEntry('L03', '2025-')
  const wrongDate = newEntry('L02', '2025-02-29')
  const before = await read()
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(instructor, before, { changes: [first] })), { code: 'wrong_role' })
  const { actor: driver } = await app.changeRole('sjåfør')
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(driver, before, { header: { driverName: 'Feil rolle' } })), { code: 'wrong_role' })
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(driver, before, { changes: [newEntry('L27', date)] })), { code: 'line_template' })
  const save = app.newSaveLineCommand(driver, before, { changes: [first, duplicate, incomplete, wrongDate] })
  const firstSave = await app.executeLineTraining(save)
  assert.deepEqual(await app.executeLineTraining(save), firstSave)
  const drafts = await read()
  assert.equal(drafts.entries.length, 4)
  assert.notEqual(drafts.entries[0].entryId, drafts.entries[1].entryId)
  assert.equal(drafts.entries[2].drivenDate, '2025-')
  await assert.rejects(app.executeLineTraining(app.newConfirmLineCommand(driver, drafts, [first.entryId], 'Øyvind')), { code: 'wrong_role' })
  await app.changeRole('instruktør')
  for (const entry of [incomplete, wrongDate]) {
    await assert.rejects(app.executeLineTraining(app.newConfirmLineCommand(instructor, drafts, [entry.entryId], 'Øyvind')), { code: 'line_incomplete' })
  }
  const stale = app.newConfirmLineCommand(instructor, drafts, [first.entryId], 'Øyvind')
  const tab = newTab()
  await tab.open()
  const edited = (await tab.changeRole('sjåfør')).actor
  await tab.executeLineTraining(tab.newSaveLineCommand(edited, drafts, {
    changes: [{ kind: 'edit', entryId: first.entryId, fields: { lineId: 'L01', drivenDate: '2025-01-13' } }],
  }))
  await tab.changeRole('instruktør')
  await assert.rejects(app.executeLineTraining(stale), { code: 'stale' })
  const current = await read()
  const command = app.newConfirmLineCommand(instructor, current, [first.entryId], 'Øyvind Fiktiv')
  const originalPut = IDBObjectStore.prototype.put
  let abortNext = true
  t.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    const request = originalPut.call(this, value, key)
    if (this.name === 'lineDocuments' && abortNext) {
      abortNext = false
      request.addEventListener('success', () => this.transaction.abort())
    }
    return request
  })
  await assert.rejects(app.executeLineTraining(command), { code: 'storage_write' })
  assert.deepEqual(await read(), current)
  const saved = await app.executeLineTraining(command)
  assert.equal(saved.sourceVersion, 1)
  const archive = await app.readLineSnapshot(receipt, 1)
  assert.deepEqual(archive.entries.map(entry => [entry.entryId, entry.drivenDate, entry.author.id, entry.confirmation.actor.name]),
    [[first.entryId, '2025-01-13', driver.id, 'Øyvind Fiktiv']])
  assert.deepEqual(await app.executeLineTraining(command), saved)
  await assert.rejects(app.executeLineTraining({ ...command, payload: { ...command.payload, instructorName: 'Annen' } }), { code: 'command_conflict' })
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(instructor, await read(), { header: { ...person } })), { code: 'locked' })
  await assert.rejects(app.executeLineTraining(app.newConfirmLineCommand(instructor, await read(), [first.entryId], 'Øyvind')), { code: 'locked' })
  await app.changeRole('sjåfør')
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(driver, await read(), {
    changes: [{ kind: 'remove', entryId: first.entryId }],
  })), { code: 'locked' })
  const otherLine = newEntry('L02', date)
  await app.executeLineTraining(app.newSaveLineCommand(driver, await read(), {
    changes: [otherLine, { kind: 'remove', entryId: wrongDate.entryId }],
  }))
  await app.changeRole('instruktør')
  await app.executeLineTraining(app.newConfirmLineCommand(instructor, await read(), [duplicate.entryId, otherLine.entryId], 'Åshild Fiktiv'))
  const latest = await app.readLineSnapshot(receipt)
  assert.equal(latest.sourceVersion, 2)
  assert.deepEqual(latest.entries[0], archive.entries[0])
  assert.deepEqual(latest.entries.slice(1).map(entry => entry.confirmation.actor.name), ['Åshild Fiktiv', 'Åshild Fiktiv'])
  assert.deepEqual(await app.readLineSnapshot(receipt, 1), archive)
  assert.equal((await app.read()).lineDocuments[0].draftCount, 1)
})

test('eksporten avviser feil historikk eller type og beholder selektert kilde ved nytt forsøk', async () => {
  const { app, instructor, receipt, read, factory } = await fixture()
  const { actor: driver } = await app.changeRole('sjåfør')
  const entry = newEntry('L09', date)
  await app.executeLineTraining(app.newSaveLineCommand(driver, await read(), { changes: [entry] }))
  await app.changeRole('instruktør')
  await app.executeLineTraining(app.newConfirmLineCommand(instructor, await read(), [entry.entryId], 'Håvard'))
  const document = await read()
  for (const id of ['L01', 'L99']) {
    const altered = structuredClone(document)
    altered.template.lines[1].id = id
    assert.throws(() => validateSavedLine(altered), { code: 'line_template' })
  }
  const altered = structuredClone(document)
  altered.snapshots[0].entries[0].entryId = crypto.randomUUID()
  assert.throws(() => lineExportSource(altered), { code: 'line_history' })
  let attempts = 0
  const download = createLinePdfDownload(app, async source => {
    assert.deepEqual(source, document.snapshots[0])
    if (++attempts === 1) throw new Error('Injisert PDF-feil')
    return new Blob(['%PDF'], { type: 'application/pdf' })
  })
  await assert.rejects(download(receipt), /Injisert PDF-feil/)
  assert.match((await download(receipt)).filename, /^linjeopplaering-v1-/)
  await assert.rejects(download({ ...receipt, documentType: 'technical-training' as never }), { code: 'invalid_command' })
  await changeStoredLine(factory, receipt, target => { target.snapshots[0].pdfLayoutVersion = 999 })
  assert.equal((await app.read()).lineProblem?.error, 'line_version')
  await assert.rejects(download(receipt), { code: 'line_version' })
})

test('avviser tilbakedatert registreringstid og bekreftelse atomisk, og godtar lik kildegrense', async () => {
  const { app, instructor, read } = await fixture()
  const first = newEntry('L01', date)
  const second = newEntry('L01', date)
  const firstTime = '2026-08-15T13:00:00.12345Z'
  const earlier = '2026-08-15T13:00:00.12344Z'
  const { actor: driver } = await app.changeRole('sjåfør')
  const save = app.newSaveLineCommand(driver, await read(), { changes: [first] })
  await app.executeLineTraining({ ...save, payload: { ...save.payload, editedAt: firstTime } })
  const draft = await read()
  const edit = app.newSaveLineCommand(driver, draft, { changes: [{ ...first, kind: 'edit', fields: { lineId: 'L01', drivenDate: date } }] })
  await assert.rejects(app.executeLineTraining({ ...edit, payload: { ...edit.payload, editedAt: earlier } }), { code: 'line_clock' })
  await app.changeRole('instruktør')
  const confirm = app.newConfirmLineCommand(instructor, draft, [first.entryId], 'Øyvind Fiktiv')
  await assert.rejects(app.executeLineTraining({ ...confirm, payload: { ...confirm.payload, confirmedAt: earlier } }), { code: 'line_clock' })
  assert.deepEqual(await read(), draft)
  await app.executeLineTraining({ ...confirm, payload: { ...confirm.payload, confirmedAt: firstTime } })

  await app.changeRole('sjåfør')
  const add = app.newSaveLineCommand(driver, await read(), { changes: [second] })
  await app.executeLineTraining({ ...add, payload: { ...add.payload, editedAt: earlier } })
  await app.changeRole('instruktør')
  const secondDraft = await read()
  const next = app.newConfirmLineCommand(instructor, secondDraft, [second.entryId], 'Astrid Fiktiv')
  await assert.rejects(app.executeLineTraining({ ...next, payload: { ...next.payload, confirmedAt: earlier } }), { code: 'line_clock' })
  assert.deepEqual(await read(), secondDraft)
  const sameTime = '2026-08-15T13:00:00.1234500Z'
  await app.executeLineTraining({ ...next, payload: { ...next.payload, confirmedAt: sameTime } })
  const confirmed = await read()
  assert.deepEqual(confirmed.snapshots.map(source => source.confirmedThrough), [firstTime, sameTime])
  assert.equal(confirmed.snapshots[1].entries[1].recordedAt, earlier)

  const invalid = structuredClone(confirmed)
  invalid.snapshots[1].confirmedThrough = earlier
  invalid.snapshots[1].entries[1].confirmation.confirmedAt = earlier
  assert.throws(() => lineExportSource(invalid), { code: 'line_history' })
  const invalidEntry = structuredClone(confirmed)
  invalidEntry.snapshots[0].entries[0].confirmation.confirmedAt = earlier
  invalidEntry.snapshots[0].confirmedThrough = earlier
  assert.throws(() => lineExportSource(invalidEntry), { code: 'line_history' })
  const invalidEdit = structuredClone(confirmed)
  invalidEdit.entries[0].editedAt = earlier
  assert.throws(() => validateSavedLine(invalidEdit), { code: 'storage_read' })
  const sparseSource = structuredClone(confirmed)
  sparseSource.snapshots[0].entries.length += 1
  assert.throws(() => lineExportSource(sparseSource), { code: 'line_history' })
  const sparseHistory = structuredClone(confirmed)
  sparseHistory.snapshots.length += 1
  assert.throws(() => lineExportSource(sparseHistory), { code: 'storage_read' })
})

test('avviser hull i kommandoer eller lagrede arrays og hindrer revisjonsoverløp', async () => {
  const { app, instructor, receipt, read, factory } = await fixture()
  const { actor: driver } = await app.changeRole('sjåfør')
  const doc = await read()
  const entry = newEntry('L01', date)
  const sparse = [entry]
  sparse.length = 2
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(driver, doc, { changes: sparse })), { code: 'invalid_command' })
  assert.deepEqual(await read(), doc)
  await app.executeLineTraining(app.newSaveLineCommand(driver, doc, { changes: [entry] }))
  await app.changeRole('instruktør')
  const draft = await read()
  const selection = [entry.entryId]
  selection.length = 2
  const confirm = app.newConfirmLineCommand(instructor, draft, [entry.entryId], 'Astrid Fiktiv')
  await assert.rejects(app.executeLineTraining({ ...confirm, payload: { ...confirm.payload, entryIds: selection } }), { code: 'invalid_command' })
  const invalidDraft = structuredClone(draft)
  invalidDraft.entries.length = 2
  assert.throws(() => validateSavedLine(invalidDraft), { code: 'storage_read' })
  await changeStoredLine(factory, receipt, document => { document.revision = Number.MAX_SAFE_INTEGER })
  const limit = await read()
  await assert.rejects(app.executeLineTraining(app.newConfirmLineCommand(instructor, limit, [entry.entryId], 'Astrid Fiktiv')), { code: 'line_revision_limit' })
  await assert.rejects(app.executeLineTraining(app.newSaveLineCommand(instructor, limit, { header: person })), { code: 'line_revision_limit' })
  assert.deepEqual(await read(), limit)
})
