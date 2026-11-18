import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DATABASE_NAME, IndexedDbRunStore, SCHEMA_VERSION } from '../src/adapters/indexeddb/run-store.ts'
import { RunApplication } from '../src/application/run-application.ts'
import { approvedContent } from '../src/content/approved-content.ts'
import { baselineOf, confirmBaseline, firstDayCanDriveAfter, updateBaselineDraft, validateSavedBaseline } from '../src/domain/baseline.ts'
import type { BaselineChanges } from '../src/domain/baseline.ts'
import { validateReason } from '../src/domain/reason.ts'
import { createRun, isId } from '../src/domain/run.ts'
import type { Actor, Run } from '../src/domain/run.ts'

const fields = {
  driverName: 'Nora Eksempel', employeeNumber: 'DEMO-12', mentorName: 'Emil Eksempel',
  firstDate: '2028-10-28', initialLastDay: '3',
}
const actor: Actor = { id: crypto.randomUUID(), role: 'sjåfør' }
const first = 'criterion-01'
const allAnswers: BaselineChanges = Object.fromEntries(approvedContent.criteria.map(({ id }) => [
  id, id === first ? { value: 'not_relevant', reason: 'Ingen rygging' } : { value: 'ok', reason: null },
]))

function fixture(factory = new IDBFactory()) {
  const store = new IndexedDbRunStore(factory)
  const app = new RunApplication(store, approvedContent, () => crypto.randomUUID())
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

test('A10 normaliserer NFC og Unicode-blanktegn før kodepunkt- og ordtelling', () => {
  for (const [input, text] of [
    ['   Ingen \n\t rygging\u00a0 ', 'Ingen rygging'],
    ['Ingen billettering', 'Ingen billettering'],
    [' A\u030aærer\u0085  bbbbb ', 'Åærer bbbbb'],
    ['12345 !678', '12345 !678'],
  ]) assert.deepEqual(validateReason(input), { text, valid: true })
  for (const input of ['Billettering', 'To ord', 'To tegn  ', '… -?! 12345678', '\t\n', 'Aa\u0301 aa\u0301aaaa', '𐐀𐐀 𐐀𐐀']) {
    assert.equal(validateReason(input).valid, false, input)
  }
  assert.equal(validateReason('ABCDE FGHI').valid, true)
})

test('ett sett stabile førposisjoner per løp og egen råtekst uten ny fagrevisjon', () => {
  const { app } = fixture()
  const run = createRun(app.newCreateCommand({ id: crypto.randomUUID(), role: 'fadder' }, fields), approvedContent)
  const empty = baselineOf(run)
  assert.equal(empty.answers.length, 22)
  assert.deepEqual(empty.answers.map(answer => answer.criterionId), approvedContent.criteria.map(criterion => criterion.id))
  assert.ok(empty.answers.every(answer => answer.value === null && answer.answerRevision === 0 && isId(answer.id)))
  const save = (source: Run, changes: BaselineChanges) => updateBaselineDraft(source,
    app.newBaselineDraftCommand(actor, source.id, source.revision, changes))
  const drafted = save(run, { [first]: { value: null, reason: null, reasonDraft: 'Ingen ' } })
  assert.deepEqual(drafted.baseline?.answers, empty.answers)
  assert.equal(drafted.baseline?.reasonDrafts[first], 'Ingen ')
  const answered = save(drafted, { [first]: allAnswers[first] })
  assert.equal(answered.baseline?.answers[0].answerRevision, 1)
  assert.equal(answered.baseline?.reasonDrafts[first], undefined)
  const edited = save(answered, { [first]: { ...allAnswers[first], reasonDraft: 'En ny tekst' } })
  assert.equal(edited.baseline?.answers[0].answerRevision, 1)
  assert.equal(edited.baseline?.answers[0].reason, 'Ingen rygging')
  assert.throws(() => save(edited, { alien: allAnswers[first] }), { code: 'invalid_command' })
  assert.throws(() => save(edited, { [first]: { value: 'not_relevant', reason: 'Ingen' } }), { code: 'validation' })
})

test('førkontrollen krever felter, tilhørighet og eksakte svar-ID-er uten å kreve øvrige øktfelt', () => {
  const { app } = fixture()
  const run = createRun(app.newCreateCommand({ id: crypto.randomUUID(), role: 'fadder' }, fields), approvedContent)
  const command = app.newConfirmBaselineCommand(actor, run.id, run.revision)
  assert.throws(() => confirmBaseline(run, command), { code: 'validation', fields: Object.fromEntries(
    approvedContent.criteria.map(criterion => [criterion.id, 'Velg et svar.']),
  ) })
  const answered = updateBaselineDraft(run, app.newBaselineDraftCommand(actor, run.id, run.revision, allAnswers))
  const next = { ...command, expectedRevision: answered.revision }
  const baseline = baselineOf(answered)
  assert.throws(() => confirmBaseline({ ...answered, firstDay: { ...answered.firstDay, mentorNameDraft: '  ' } }, next), {
    code: 'validation', fields: { mentorName: 'Skriv inn fadderens navn.' },
  })
  assert.throws(() => confirmBaseline({ ...answered, firstDay: { ...answered.firstDay, driverId: crypto.randomUUID() } }, next),
    { code: 'invalid_command' })
  for (const wrong of [baseline.answers[1], { ...baseline.answers[0], criterionId: 'alien' }]) {
    const damaged = { ...answered, baseline: { ...baseline, answers: [wrong, ...baseline.answers.slice(1)] } }
    assert.throws(() => confirmBaseline(damaged, next), { code: 'storage_read' })
  }
  const confirmed = confirmBaseline(answered, next)
  validateSavedBaseline(confirmed)
  assert.equal(firstDayCanDriveAfter(confirmed), true)
  assert.throws(() => validateSavedBaseline({ ...confirmed, firstDay: answered.firstDay }), { code: 'storage_read' })
  assert.equal(firstDayCanDriveAfter({ ...run, baselineConfirmation: confirmed.baselineConfirmation }), false)
})

test('adapter avviser delvis bekreftelse, ødelagt dag-1-arv og svarrevisjon foran løpet', async () => {
  const { app, store, factory } = fixture()
  const { actor: mentor } = await app.open()
  const { runId, dayId, revision } = await app.executeCreate(app.newCreateCommand(mentor, fields))
  const driver = await app.changeRole('sjåfør', { runId, dayId })
  const old = (await store.read()).runs[0]
  assert.equal(old.baseline, undefined)
  const saved = await app.executeBaselineDraft(app.newBaselineDraftCommand(driver.actor, runId, revision, allAnswers))
  await app.executeConfirmBaseline(app.newConfirmBaselineCommand(driver.actor, runId, saved.revision))
  const locked = (await store.read()).runs[0]
  const [inherited, ...remaining] = locked.firstDay.driverAfterAnswers!
  const [answer, ...otherAnswers] = locked.baseline!.answers
  for (const corrupt of [
    { ...old, baselineConfirmation: locked.baselineConfirmation },
    { ...locked, firstDay: { ...locked.firstDay, driverAfterAnswers: [{ ...inherited, inheritedFrom: answer.id + '-feil' }, ...remaining] } },
    { ...locked, firstDay: { ...locked.firstDay, driverAfterAnswers: [{ ...inherited, answerRevision: locked.revision + 1 }, ...remaining] } },
    { ...locked, baseline: { ...locked.baseline!, answers: [{ ...answer, answerRevision: locked.revision + 1 }, ...otherAnswers] } },
  ]) {
    await storeRun(factory, corrupt)
    await assert.rejects(app.read(), { code: 'storage_read' })
  }
})

test('en lagret dag 2 leser samme 22 førposisjoner og beholder dag 1 som førkontekst', async () => {
  const { app, store, factory } = fixture()
  const { actor: mentor } = await app.open()
  const { runId, revision } = await app.executeCreate(app.newCreateCommand(mentor, fields))
  const driver = await app.changeRole('sjåfør')
  const saved = await app.executeBaselineDraft(app.newBaselineDraftCommand(driver.actor, runId, revision, allAnswers))
  await app.executeConfirmBaseline(app.newConfirmBaselineCommand(driver.actor, runId, saved.revision))
  const run = (await store.read()).runs[0]
  const day2 = {
    id: crypto.randomUUID(), number: 2 as const, date: '2028-10-29', driverId: run.driver.id,
    driverIdentity: { name: 'Nora Dagto', employeeNumber: 'DEMO-12' },
    mentorName: 'Fadder Dagto', identityConfirmed: false,
  }
  await storeRun(factory, { ...run, laterDays: [day2] })
  const day1View = (await app.read()).selected!
  const day2View = (await app.select(runId, day2.id)).selected!
  assert.equal(day2View.day, 2)
  assert.equal(day2View.fields.driverName, 'Nora Dagto')
  assert.equal(day2View.baseline.fields.driverName, fields.driverName)
  assert.equal(day2View.baseline.fields.date, fields.firstDate)
  assert.equal(day2View.baseline.answers.length, 22)
  assert.deepEqual(day2View.baseline, day1View.baseline)
  assert.equal((await app.open()).selected!.dayId, day2.id)
})

test('ConfirmBaseline ruller tilbake ved abort, kvitterer etter complete og bevarer lås og dag-1-arv ved repetisjon', async t => {
  const { app, store } = fixture()
  const { actor: mentor } = await app.open()
  const { runId, dayId, revision } = await app.executeCreate(app.newCreateCommand(mentor, fields))
  const selection = { runId, dayId }
  await app.executeDayDraft(app.newDayDraftCommand(mentor, selection, revision, { driverName: 'Nora Oppdatert', bus1: '312' }))
  const view = await app.changeRole('sjåfør', selection)
  const initialIds = view.selected!.baseline.answers.map(answer => answer.id)
  const saved = await app.executeBaselineDraft(app.newBaselineDraftCommand(view.actor, runId, view.selected!.revision, allAnswers))
  const command = app.newConfirmBaselineCommand(view.actor, runId, saved.revision)
  const add = IDBObjectStore.prototype.add
  const abort = t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key: IDBValidKey) {
    const request = add.call(this, value, key)
    if (this.name === 'commands') request.addEventListener('success', () => this.transaction.abort())
    return request
  })
  await assert.rejects(app.executeConfirmBaseline(command), { code: 'storage_write' })
  abort.mock.restore()
  const before = (await store.read()).runs[0]
  assert.equal(before.baselineConfirmation, undefined)
  assert.equal(before.firstDay.identityConfirmed, false)
  assert.equal(before.firstDay.driverAfterAnswers, undefined)
  const receipt = await app.executeConfirmBaseline(command)
  const after = (await store.read()).runs[0]
  assert.equal(after.baselineConfirmation?.actor.name, 'Nora Oppdatert')
  assert.equal(after.baselineConfirmation?.actor.role, 'sjåfør')
  assert.equal(after.baselineConfirmation?.confirmedAt, command.payload.confirmedAt)
  assert.equal(after.firstDay.identityConfirmed, true)
  assert.deepEqual(after.baseline?.answers.map(answer => answer.id), initialIds)
  assert.equal(after.firstDay.driverAfterAnswers?.length, 22)
  const [inherited, ...remaining] = after.firstDay.driverAfterAnswers!
  assert.equal(inherited.inheritedFrom, initialIds[0])
  assert.equal(inherited.reason, 'Ingen rygging')
  assert.equal(inherited.locked, true)
  assert.notEqual(inherited.id, initialIds[0])
  assert.ok(remaining.every(answer => answer.value === null && !answer.locked && !answer.inheritedFrom && isId(answer.id)))
  assert.equal(after.firstDay.driverConfirmation, undefined)
  assert.equal(after.firstDay.mentorConfirmation, undefined)
  assert.equal(after.firstDay.session?.bus1, '312')
  assert.deepEqual(await app.executeConfirmBaseline(command), receipt)
  await assert.rejects(app.executeConfirmBaseline({ ...command, payload: { confirmedAt: '2027-01-01T01:00:00.000Z' } }),
    { code: 'command_conflict' })
  await assert.rejects(app.executeConfirmBaseline({ ...command, commandId: crypto.randomUUID() }), { code: 'stale' })
  await assert.rejects(app.executeConfirmBaseline(app.newConfirmBaselineCommand(view.actor, runId, receipt.revision)), { code: 'locked' })
  await assert.rejects(app.executeConfirmBaseline(app.newConfirmBaselineCommand(mentor, runId, receipt.revision)), { code: 'wrong_role' })
  await assert.rejects(app.executeBaselineDraft(app.newBaselineDraftCommand(view.actor, runId, receipt.revision,
    { [first]: { value: 'ok', reason: null } })), { code: 'locked' })

  const mentorView = await app.changeRole('fadder', selection)
  assert.equal(mentorView.selected?.baseline.editable, false)
  assert.equal(mentorView.selected?.baseline.driverAfterAvailable, true)
  const update = (changes: { [key: string]: string }) => app.executeDayDraft(app.newDayDraftCommand(mentorView.actor, selection,
    receipt.revision, changes))
  await assert.rejects(update({ driverName: 'En annen sjåfør' }), { code: 'locked' })
  await assert.rejects(update({ date: '2028-10-29' }), { code: 'locked' })
  await update({ mentorName: 'Ny fadder', routes: '12', endTime: '16:10' })
  const reopened = await app.open()
  assert.equal(reopened.selected?.baseline.confirmation?.actor.name, 'Nora Oppdatert')
  assert.equal(reopened.selected?.fields.mentorName, 'Ny fadder')
  assert.equal(reopened.selected?.fields.routes, '12')
  assert.equal(reopened.selected?.fields.endTime, '16:10')
})
