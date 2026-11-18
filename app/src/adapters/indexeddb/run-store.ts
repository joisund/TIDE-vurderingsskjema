import type { RunStore, Selection, WorkspaceState } from '../../application/run-store.ts'
import { AppError, findDay, isId, validateSavedRun } from '../../domain/run.ts'
import type { CreateRunCommand, Role, Run, RunReceipt } from '../../domain/run.ts'
import { updateDayDraft } from '../../domain/day-draft.ts'
import type { SaveDayDraftCommand } from '../../domain/day-draft.ts'
import { confirmBaseline, updateBaselineDraft, validateSavedBaseline } from '../../domain/baseline.ts'
import type { ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../../domain/baseline.ts'
import { confirmDriverDay, updateDriverDayDraft, validateSavedDriverDays } from '../../domain/driver-day.ts'
import type { ConfirmDriverDayCommand, SaveDriverDayDraftCommand } from '../../domain/driver-day.ts'

export const DATABASE_NAME = 'tide-kjorevurdering'
export const SCHEMA_VERSION = 1

const META = 'meta'
const RUNS = 'runs'
const COMMANDS = 'commands'
const SCHEMA = 'schema'
const SESSION = 'session'

type SavedSession = { actors: Record<Role, string>; role: Role; selection?: Selection }
type Envelope<T> = { schemaVersion: number; data: T }
type SavedRun = Envelope<Run>
type SavedReceipt = Envelope<{ fingerprint: string; receipt: RunReceipt }>

function envelope<T>(data: T): Envelope<T> {
  return { schemaVersion: SCHEMA_VERSION, data }
}

function assertSchema(schemaVersion: number | undefined) {
  if (schemaVersion !== SCHEMA_VERSION) throw new AppError('unsupported_schema')
}

function check<T>(record: Envelope<T>) {
  assertSchema(record.schemaVersion)
  return record.data
}

function readRun(record: SavedRun) {
  if (!record) throw new AppError('storage_read')
  const run = check(record)
  validateSavedRun(run)
  validateSavedBaseline(run)
  validateSavedDriverDays(run)
  return run
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, SCHEMA_VERSION)
    let blocked = false
    request.onblocked = () => {
      blocked = true
      reject(new AppError('storage_blocked'))
    }
    request.onerror = () => {
      reject(new AppError(request.error?.name === 'VersionError' ? 'unsupported_schema' : 'storage_open'))
    }
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        const db = request.result
        db.createObjectStore(META).add({ schemaVersion: SCHEMA_VERSION }, SCHEMA)
        db.createObjectStore(RUNS).createIndex('firstDayId', 'data.firstDay.id', { unique: true })
        db.createObjectStore(COMMANDS)
      }
    }
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
  })
}

type Operations<T> = {
  get<R>(store: string, key: IDBValidKey, next: (value: R | undefined) => void): void
  all<R>(store: string, next: (value: R[]) => void): void
  add(store: string, key: IDBValidKey, value: unknown): void
  put(store: string, key: IDBValidKey, value: unknown): void
  delete(store: string, key: IDBValidKey): void
  finish(result: T): void
}

function runTransaction<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  work: (operations: Operations<T>) => void,
): Promise<T> {
  const failureCode = mode === 'readwrite' ? 'storage_write' : 'storage_read'
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction
    try {
      // Eldre implementasjoner ignorerer valget eller avviser det som et ekstra argument.
      try {
        tx = mode === 'readwrite' ? db.transaction(stores, mode, { durability: 'strict' }) : db.transaction(stores, mode)
      } catch (error) {
        if (!(error instanceof TypeError) || mode !== 'readwrite') throw error
        tx = db.transaction(stores, mode)
      }
    } catch {
      reject(new AppError(failureCode))
      return
    }

    let failure: AppError | undefined
    let result: T | undefined
    tx.onabort = () => reject(failure ?? new AppError(failureCode))
    tx.oncomplete = () => {
      if (result === undefined) reject(new AppError(failureCode))
      else resolve(result)
    }

    const guard = (callback: () => void) => {
      try {
        callback()
      } catch (error) {
        failure = error instanceof AppError ? error : new AppError(failureCode)
        tx.abort()
      }
    }

    // Bare synkrone operasjoner i request-callbacks. Resultatet venter på transaksjonens complete.
    const getResult = <R>(request: IDBRequest<R>, next: (value: R) => void) => {
      request.onsuccess = () => guard(() => next(request.result))
    }
    const operations: Operations<T> = {
      get: <R>(store: string, key: IDBValidKey, next: (value: R | undefined) => void) => {
        getResult(tx.objectStore(store).get(key), next)
      },
      all: <R>(store: string, next: (value: R[]) => void) => {
        getResult(tx.objectStore(store).getAll(), next)
      },
      add: (store, key, value) => { tx.objectStore(store).add(value, key) },
      put: (store, key, value) => { tx.objectStore(store).put(value, key) },
      delete: (store, key) => { tx.objectStore(store).delete(key) },
      finish: value => { result = value },
    }
    guard(() => {
      operations.get<{ schemaVersion: number }>(META, SCHEMA, metadata => {
        assertSchema(metadata?.schemaVersion)
        work(operations)
      })
    })
  })
}

function loadSession<T>(operations: Operations<T>, next: (session: SavedSession) => void) {
  operations.get<Envelope<SavedSession>>(META, SESSION, record => {
    if (!record) throw new AppError('storage_read')
    const session = check(record)
    if ((session?.role !== 'fadder' && session?.role !== 'sjåfør') || !isId(session.actors?.[session.role])) {
      throw new AppError('storage_read')
    }
    next(session)
  })
}

function workspace(operations: Operations<WorkspaceState>, session: SavedSession) {
  operations.all<SavedRun>(RUNS, records => {
    const runs = records.map(readRun)
    const selection = session.selection
    if (selection && !runs.some(run => run.id === selection.runId && findDay(run, selection.dayId))) {
      throw new AppError('storage_read')
    }
    operations.finish({
      session: { actor: { id: session.actors[session.role], role: session.role }, selection },
      runs,
    })
  })
}

export class IndexedDbRunStore implements RunStore {
  readonly #factory: IDBFactory | undefined
  readonly #name: string
  #db?: IDBDatabase
  #closedForSchemaChange = false

  constructor(factory: IDBFactory | undefined, name = DATABASE_NAME) {
    this.#factory = factory
    this.#name = name
  }

  async open(actors: Record<Role, string>): Promise<WorkspaceState> {
    this.#db?.close()
    this.#db = undefined
    this.#closedForSchemaChange = false
    if (!this.#factory) throw new AppError('storage_open')
    const db = await openDatabase(this.#factory, this.#name).catch(error => {
      throw error instanceof AppError ? error : new AppError('storage_open')
    })
    db.onversionchange = () => {
      db.close()
      if (this.#db === db) {
        this.#db = undefined
        this.#closedForSchemaChange = true
      }
    }
    db.onclose = () => {
      if (this.#db === db) this.#db = undefined
    }
    this.#db = db

    try {
      await runTransaction<boolean>(db, [META], 'readwrite', operations => {
        operations.put(META, 'write-probe', true)
        operations.delete(META, 'write-probe')
        operations.get<Envelope<SavedSession>>(META, SESSION, record => {
          if (record) check(record)
          else operations.add(META, SESSION, envelope({ actors, role: 'fadder' }))
          operations.finish(true)
        })
      })
      return await this.read()
    } catch (error) {
      db.close()
      if (this.#db === db) this.#db = undefined
      throw error
    }
  }

  read(selection?: Selection): Promise<WorkspaceState> {
    const displayed = selection && { ...selection }
    return this.#withDatabase([META, RUNS], 'readonly', operations => {
      loadSession(operations, session => workspace(operations, { ...session, selection: displayed ?? session.selection }))
    })
  }

  select(runId: string, dayId?: string): Promise<WorkspaceState> {
    return this.#withDatabase([META, RUNS], 'readwrite', operations => {
      loadSession(operations, session => {
        operations.get<SavedRun>(RUNS, runId, record => {
          if (!record) throw new AppError('run_missing')
          const run = readRun(record)
          if (run.id !== runId || (dayId !== undefined && !findDay(run, dayId))) throw new AppError('storage_read')
          const selected = { ...session, selection: { runId, dayId: dayId ?? run.firstDay.id } }
          operations.put(META, SESSION, envelope(selected))
          workspace(operations, selected)
        })
      })
    })
  }

  changeRole(role: Role, selection?: Selection): Promise<WorkspaceState> {
    const displayed = selection && { ...selection }
    return this.#withDatabase([META, RUNS], 'readwrite', operations => {
      loadSession(operations, session => {
        const changed = { ...session, role, selection: displayed ?? session.selection }
        operations.put(META, SESSION, envelope(changed))
        workspace(operations, changed)
      })
    })
  }

  create(command: CreateRunCommand, fingerprint: string, buildRun: () => Run): Promise<RunReceipt> {
    return this.#withDatabase([META, RUNS, COMMANDS], 'readwrite', operations => {
      operations.get<SavedReceipt>(COMMANDS, command.commandId, record => {
        if (record) {
          const previous = check(record)
          if (previous.fingerprint !== fingerprint) throw new AppError('command_conflict')
          operations.finish(previous.receipt)
          return
        }
        loadSession(operations, session => {
          const { actor } = command
          if (actor.role !== 'fadder') throw new AppError('wrong_role')
          if (actor.role !== session.role || actor.id !== session.actors[session.role]) throw new AppError('stale')
          operations.get<SavedRun>(RUNS, command.runId, existing => {
            if (existing) {
              check(existing)
              throw new AppError('stale')
            }
            const run = buildRun()
            const receipt = { runId: run.id, dayId: run.firstDay.id, revision: run.revision }
            operations.add(RUNS, run.id, envelope(run))
            operations.add(COMMANDS, command.commandId, envelope({ fingerprint, receipt }))
            operations.put(META, SESSION, envelope({ ...session, selection: { runId: run.id, dayId: run.firstDay.id } }))
            operations.finish(receipt)
          })
        })
      })
    })
  }

  saveDayDraft(command: SaveDayDraftCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: updateDayDraft(run, command), dayId: command.payload.dayId,
    }))
  }

  saveBaselineDraft(command: SaveBaselineDraftCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: updateBaselineDraft(run, command), dayId: run.firstDay.id,
    }))
  }

  confirmBaseline(command: ConfirmBaselineCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: confirmBaseline(run, command), dayId: run.firstDay.id,
    }))
  }

  saveDriverDayDraft(command: SaveDriverDayDraftCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: updateDriverDayDraft(run, command), dayId: command.payload.dayId,
    }))
  }

  confirmDriverDay(command: ConfirmDriverDayCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: confirmDriverDay(run, command), dayId: command.payload.dayId,
    }))
  }

  #mutateRun(
    command: Pick<SaveDayDraftCommand, 'commandId' | 'runId' | 'actor'>,
    fingerprint: string,
    update: (run: Run) => { run: Run; dayId: string },
  ): Promise<RunReceipt> {
    return this.#withDatabase([META, RUNS, COMMANDS], 'readwrite', operations => {
      operations.get<SavedReceipt>(COMMANDS, command.commandId, record => {
        if (record) {
          const previous = check(record)
          if (previous.fingerprint !== fingerprint) throw new AppError('command_conflict')
          operations.finish(previous.receipt)
          return
        }
        loadSession(operations, session => {
          const { actor, runId } = command
          if (actor.role !== session.role || actor.id !== session.actors[session.role]) throw new AppError('stale')
          operations.get<SavedRun>(RUNS, runId, record => {
            if (!record) throw new AppError('run_missing')
            const { run, dayId } = update(readRun(record))
            const receipt = { runId, dayId, revision: run.revision }
            operations.put(RUNS, runId, envelope(run))
            operations.add(COMMANDS, command.commandId, envelope({ fingerprint, receipt }))
            operations.finish(receipt)
          })
        })
      })
    })
  }

  #withDatabase<T>(stores: string[], mode: IDBTransactionMode, work: (operations: Operations<T>) => void) {
    if (!this.#db) {
      return Promise.reject(new AppError(this.#closedForSchemaChange ? 'schema_changed' : 'storage_open'))
    }
    return runTransaction(this.#db, stores, mode, work)
  }
}
