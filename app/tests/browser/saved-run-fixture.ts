import type { Page } from '@playwright/test'
import { confirmBaseline, updateBaselineDraft } from '../../src/domain/baseline.ts'
import type { Actor, Run } from '../../src/domain/run.ts'

export function lockedRun(run: Run, notRelevantId?: string): Run {
  const actor: Actor = { role: 'sjåfør', id: crypto.randomUUID() }
  const changes = Object.fromEntries(run.content.criteria.map(({ id }) => [id, id === notRelevantId
    ? { value: 'not_relevant' as const, reason: 'Ingen rygging' } : { value: 'ok' as const, reason: null }]))
  const answered = updateBaselineDraft(run, {
    commandId: crypto.randomUUID(), runId: run.id, actor, expectedRevision: run.revision, payload: { changes },
  })
  return confirmBaseline(answered, {
    commandId: crypto.randomUUID(), runId: run.id, actor, expectedRevision: answered.revision,
    payload: { confirmedAt: '2027-03-28T07:00:00Z' },
  })
}

export function readSavedRun(page: Page): Promise<Run> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<Run>((resolve, reject) => {
        const request = db.transaction('runs').objectStore('runs').getAll()
        request.onsuccess = () => resolve(request.result[0].data)
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  })
}

export function writeSavedRun(page: Page, run: Run, dayId?: string): Promise<void> {
  return page.evaluate(async ({ run, dayId }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(dayId ? ['runs', 'meta'] : ['runs'], 'readwrite')
        tx.objectStore('runs').put({ schemaVersion: db.version, data: run }, run.id)
        if (dayId) {
          const meta = tx.objectStore('meta')
          const session = meta.get('session')
          session.onsuccess = () => {
            const record = session.result
            record.data.selection = { runId: run.id, dayId }
            meta.put(record, 'session')
          }
        }
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }, { run, dayId })
}
