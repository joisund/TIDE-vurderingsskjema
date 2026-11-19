import { lineTemplateV1 } from '../../src/content/line-training.v1.ts'
import type { ConfirmLineTrainingEntries, LineReceipt, LineTraining, LineTrainingSnapshot } from '../../src/domain/line-training.ts'

export function lineTrainingV1Fixture() {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const actors = { sjåfør: id(1), instruktør: id(2), fadder: id(3) }
  const driver = { id: id(4), name: 'Åse Øvelø äö', employeeNumber: 'DEMO-LINE' }
  const selection = { documentId: id(5), documentType: 'line-training' as const }
  const session = { actors, role: 'instruktør', driverId: driver.id, document: selection }
  const recordedAt = '2025-04-13T12:00:00.000Z'
  const confirmedAt = '2025-04-13T13:00:00.000Z'
  const author = { id: actors.sjåfør, name: driver.name, role: 'sjåfør' as const, driverRef: driver.id }
  const instructorName = 'Øyvind Fiktiv'
  const command: ConfirmLineTrainingEntries = {
    ...selection, kind: 'confirm-line-training-entries', commandId: id(8), expectedRevision: 1, driverRef: driver.id,
    actor: { id: actors.instruktør, role: 'instruktør' }, payload: { entryIds: [id(6)], instructorName, confirmedAt },
  }
  const receipt: LineReceipt = { ...selection, revision: 2, sourceVersion: 1 }
  const fingerprint = JSON.stringify(command, (_key, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value)
  const content = {
    ...selection, driverRef: driver.id, header: { driverName: driver.name, employeeNumber: driver.employeeNumber },
    template: lineTemplateV1, ruleVersion: 1, pdfLayoutVersion: 1,
  }
  const source: LineTrainingSnapshot = {
    ...content, sourceVersion: 1, confirmedRevision: receipt.revision, confirmedThrough: confirmedAt,
    entries: [{ lineId: 'L10', entryId: id(6), drivenDate: '2025-04-13', status: 'confirmed', author, recordedAt, editedAt: recordedAt,
      confirmation: { actor: { ...command.actor, role: 'instruktør', name: instructorName }, confirmedAt, sourceVersion: 1 } }],
  }
  const document: LineTraining = {
    ...content, revision: 3, snapshots: [source],
    entries: [...source.entries, { lineId: 'L22', entryId: id(7), drivenDate: '2025-04-14', status: 'draft', author,
      recordedAt: '2025-04-14T12:00:00.000Z', editedAt: '2025-04-14T12:00:00.000Z' }],
  }
  return { driver, session, document, command, receipt, fingerprint, corruptId: id(9) }
}

export function seedLineTrainingV1(fixture: ReturnType<typeof lineTrainingV1Fixture>, factory = indexedDB, schemaVersion = 6) {
  // Funksjonen kjører både i fake-indexeddb og direkte i nettleserens nye testprofil.
  return new Promise<void>((resolve, reject) => {
    const request = factory.open('tide-kjorevurdering', schemaVersion)
    request.onupgradeneeded = () => {
      const db = request.result
      const { driver, session, document, command, receipt, fingerprint, corruptId } = fixture
      const envelope = (data: unknown) => ({ schemaVersion, data })
      const meta = db.createObjectStore('meta')
      meta.add({ schemaVersion }, 'schema')
      meta.add(envelope(session), 'session')
      db.createObjectStore('runs').createIndex('firstDayId', 'data.firstDay.id', { unique: true })
      db.createObjectStore('drivers').add(envelope(driver), driver.id)
      db.createObjectStore('commands').add(envelope({ fingerprint, receipt }), command.commandId)
      db.createObjectStore('technicalDocuments').createIndex('driverRef', 'data.driverRef')
      const lines = db.createObjectStore('lineDocuments')
      lines.createIndex('driverRef', 'data.driverRef')
      lines.add(envelope(document), document.documentId)
      lines.add(envelope({ ...document, documentId: corruptId, template: { ...document.template, version: 999 } }), corruptId)
    }
    request.onsuccess = () => { request.result.close(); resolve() }
    request.onerror = () => reject(request.error)
  })
}
