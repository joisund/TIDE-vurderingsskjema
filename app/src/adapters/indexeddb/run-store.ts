import type { RunStore, Selection, WorkspaceState } from '../../application/run-store.ts'
import {
  AppError, assessmentContext, canReadAssessment, createDriver, findDay, isId, isRole, runDays, sameDriverReference,
  validDriverReference, validateSavedRun,
} from '../../domain/run.ts'
import type { Actor, CreateDriverCommand, CreateRunCommand, DriverReceipt, DriverReference, Role, Run, RunReceipt } from '../../domain/run.ts'
import { updateDayDraft } from '../../domain/day-draft.ts'
import type { SaveDayDraftCommand } from '../../domain/day-draft.ts'
import { confirmBaseline, updateBaselineDraft, validateSavedBaseline } from '../../domain/baseline.ts'
import type { ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../../domain/baseline.ts'
import { createDay } from '../../domain/create-day.ts'
import type { CreateDayCommand, CreateDayReceipt } from '../../domain/create-day.ts'
import { confirmDriverDay, updateDriverDayDraft, validateSavedDriverDays } from '../../domain/driver-day.ts'
import type { ConfirmDriverDayCommand, SaveDriverDayDraftCommand } from '../../domain/driver-day.ts'
import { confirmMentorDay, reviewRelevance, updateMentorDay, validateSavedMentorDays } from '../../domain/mentor-day.ts'
import type { ConfirmMentorDayCommand, MentorDayReceipt, ReviewRelevanceCommand, SaveMentorDayCommand } from '../../domain/mentor-day.ts'
import { currentPlan, followUpWindow, runStatus, saveFollowUp, validateSavedPlan } from '../../domain/follow-up.ts'
import type { FollowUpReceipt, SaveFollowUpCommand } from '../../domain/follow-up.ts'
import { closeRun, saveConclusion, validateSavedClosure } from '../../domain/closure.ts'
import type { CloseRunCommand, SaveConclusionCommand } from '../../domain/closure.ts'

export const DATABASE_NAME = 'tide-kjorevurdering'
export const SCHEMA_VERSION = 4

const META = 'meta'
const RUNS = 'runs'
const DRIVERS = 'drivers'
const COMMANDS = 'commands'
const SCHEMA = 'schema'
const SESSION = 'session'

type SavedSession = { actors: Record<Role, string>; role: Role; selection?: Selection; driverId?: string }
type Envelope<T> = { schemaVersion: number; data: T }
type SavedRun = Envelope<Run>
type SavedReceipt<T = RunReceipt> = Envelope<{ fingerprint: string; receipt: T }>
type SavedDriver = Envelope<DriverReference>

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
  validateSavedClosure(run)
  if (run.lifecycle === 'closed') return run
  validateSavedBaseline(run)
  validateSavedPlan(run)
  validateSavedDriverDays(run)
  validateSavedMentorDays(run)
  return run
}

function driverKey(id: string) {
  return id.toLowerCase()
}

function readDriver(record: SavedDriver, key: IDBValidKey) {
  const driver = check(record)
  if (!validDriverReference(driver) || key !== driverKey(driver.id)) {
    throw new AppError('storage_read')
  }
  return driver
}

function migrateRun(key: IDBValidKey, run: Run, drivers: Map<string, DriverReference>): Run {
  const driver = run?.driver
  if (!validDriverReference(driver) || run.id !== key
    || (run.assessmentContext !== undefined && run.assessmentContext !== 'fadder')
    || runDays(run).some(day => day?.driverId !== driver.id)) {
    throw new AppError('storage_read')
  }
  const history = run.closureSnapshot?.history
  if (run.lifecycle === 'closed' && (!history || !validDriverReference(history.driver)
    || !sameDriverReference(history.driver, driver)
    || runDays(history).some(day => day?.driverId !== driver.id))) {
    throw new AppError('storage_read')
  }
  // Identiteten ved oppretting er stabil selv om dagsnavn har endret seg.
  const stableId = driverKey(driver.id)
  const previous = drivers.get(stableId)
  if (previous && !sameDriverReference(previous, driver)) throw new AppError('storage_read')
  drivers.set(stableId, driver)
  return { ...run, assessmentContext: 'fadder' }
}

function migrateEnvelopes(tx: IDBTransaction, previousVersion: number) {
  if (previousVersion !== 1 && previousVersion !== 2 && previousVersion !== 3) throw new AppError('unsupported_schema')
  const meta = tx.objectStore(META)
  const driversStore = tx.db.createObjectStore(DRIVERS)
  const drivers = new Map<string, DriverReference>()
  const schema = meta.get(SCHEMA)
  schema.onsuccess = () => {
    if (schema.result?.schemaVersion !== previousVersion) {
      tx.abort()
      return
    }
    meta.put({ ...schema.result, schemaVersion: SCHEMA_VERSION }, SCHEMA)
  }
  for (const name of [META, RUNS, COMMANDS]) {
    const request = tx.objectStore(name).openCursor()
    request.onsuccess = () => {
      try {
        const cursor = request.result
        if (!cursor) {
          if (name === RUNS) {
            for (const [key, driver] of drivers) driversStore.add(envelope(driver), key)
          }
          return
        }
        if (name !== META || cursor.key === SESSION) {
          const record = cursor.value as Envelope<unknown>
          if (record?.schemaVersion !== previousVersion || !Object.hasOwn(record, 'data')) {
            throw new AppError('unsupported_schema')
          }
          // Historiske snapshots og kvitteringer beholder originalt innhold.
          const data = name === RUNS ? migrateRun(cursor.key, record.data as Run, drivers) : record.data
          cursor.update({ ...record, data, schemaVersion: SCHEMA_VERSION })
        }
        cursor.continue()
      } catch {
        tx.abort()
      }
    }
  }
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
      const tx = request.transaction!
      if (blocked) {
        tx.abort()
        return
      }
      if (event.oldVersion === 0) {
        const db = request.result
        db.createObjectStore(META).add({ schemaVersion: SCHEMA_VERSION }, SCHEMA)
        db.createObjectStore(RUNS).createIndex('firstDayId', 'data.firstDay.id', { unique: true })
        db.createObjectStore(COMMANDS)
        db.createObjectStore(DRIVERS)
      } else {
        try {
          migrateEnvelopes(tx, event.oldVersion)
        } catch {
          tx.abort()
        }
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
  entries<R>(store: string, next: (entries: [IDBValidKey, R][]) => void): void
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
      entries: <R>(store: string, next: (entries: [IDBValidKey, R][]) => void) => {
        const entries: [IDBValidKey, R][] = []
        getResult(tx.objectStore(store).openCursor(), cursor => {
          if (cursor) {
            entries.push([cursor.key, cursor.value as R])
            cursor.continue()
          } else next(entries)
        })
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
    if (!isRole(session?.role) || !isId(session.actors?.[session.role])) {
      throw new AppError('storage_read')
    }
    next(session)
  })
}

function requireActiveActor(session: SavedSession, actor: Actor) {
  if (actor.role !== session.role || actor.id !== session.actors[session.role]) throw new AppError('stale')
}

function workspace(operations: Operations<WorkspaceState>, session: SavedSession) {
  operations.entries<SavedDriver>(DRIVERS, driverRecords => {
    const drivers = driverRecords.map(([key, record]) => readDriver(record, key))
    const byId = new Map(drivers.map(driver => [driver.id, driver]))
    operations.all<SavedRun>(RUNS, records => {
      const runs = records.map(readRun)
      if (byId.size !== drivers.length || runs.some(run => !byId.has(run.driver.id))
        || (session.driverId !== undefined && !byId.has(session.driverId))) {
        throw new AppError('storage_read')
      }
      const selection = session.selection
      if (selection && !runs.some(run => run.id === selection.runId && findDay(run, selection.dayId))) {
        throw new AppError('storage_read')
      }
      operations.finish({
        session: { actor: { id: session.actors[session.role], role: session.role }, selection, driverId: session.driverId },
        runs,
        drivers,
      })
    })
  })
}

const WORKSPACE = [META, RUNS, DRIVERS]

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
          if (record) {
            const session = check(record)
            if (!session?.actors || !isRole(session.role) || !isId(session.actors[session.role])) throw new AppError('storage_read')
            // Eldre sesjoner beholder de to eksisterende actor-ID-ene.
            if (!Object.hasOwn(session.actors, 'instruktør')) {
              operations.put(META, SESSION, envelope({ ...session, actors: { ...session.actors, instruktør: actors.instruktør } }))
            }
          } else operations.add(META, SESSION, envelope({ actors, role: 'fadder' }))
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
    return this.#withDatabase(WORKSPACE, 'readonly', operations => {
      loadSession(operations, session => workspace(operations, { ...session, selection: displayed ?? session.selection }))
    })
  }

  readRun(runId: string): Promise<Run> {
    return this.#withDatabase(WORKSPACE, 'readonly', operations => {
      loadSession(operations, session => {
        operations.get<SavedRun>(RUNS, runId, record => {
          if (!record) throw new AppError('run_missing')
          const run = readRun(record)
          if (run.id !== runId) throw new AppError('storage_read')
          if (!canReadAssessment(run, session.role)) throw new AppError('wrong_role')
          const key = driverKey(run.driver.id)
          operations.get<SavedDriver>(DRIVERS, key, driver => {
            if (!driver) throw new AppError('storage_read')
            if (readDriver(driver, key).id !== run.driver.id) throw new AppError('storage_read')
            operations.finish(run)
          })
        })
      })
    })
  }

  select(runId: string, dayId?: string): Promise<WorkspaceState> {
    return this.#withDatabase(WORKSPACE, 'readwrite', operations => {
      loadSession(operations, session => {
        operations.get<SavedRun>(RUNS, runId, record => {
          if (!record) throw new AppError('run_missing')
          const run = readRun(record)
          if (run.id !== runId || (dayId !== undefined && !findDay(run, dayId))) throw new AppError('storage_read')
          const selected = { ...session, selection: { runId, dayId: dayId ?? run.firstDay.id },
            ...(session.role === 'instruktør' && { driverId: run.driver.id }) }
          operations.put(META, SESSION, envelope(selected))
          workspace(operations, selected)
        })
      })
    })
  }

  changeRole(role: Role, selection?: Selection | null): Promise<WorkspaceState> {
    const displayed = selection && { ...selection }
    return this.#withDatabase(WORKSPACE, 'readwrite', operations => {
      loadSession(operations, session => {
        if (!isRole(role) || !isId(session.actors[role])) throw new AppError('invalid_command')
        const changed = { ...session, role, selection: selection === null ? undefined : displayed ?? session.selection }
        operations.put(META, SESSION, envelope(changed))
        workspace(operations, changed)
      })
    })
  }

  showDrivers(): Promise<WorkspaceState> {
    return this.#withDatabase(WORKSPACE, 'readwrite', operations => {
      loadSession(operations, session => {
        if (session.role !== 'instruktør') {
          workspace(operations, session)
          return
        }
        const overview = { ...session, selection: undefined }
        operations.put(META, SESSION, envelope(overview))
        workspace(operations, overview)
      })
    })
  }

  selectDriver(driverId: string): Promise<WorkspaceState> {
    return this.#withDatabase(WORKSPACE, 'readwrite', operations => {
      loadSession(operations, session => {
        if (session.role !== 'instruktør') throw new AppError('wrong_role')
        if (!isId(driverId)) throw new AppError('invalid_command')
        const key = driverKey(driverId)
        operations.get<SavedDriver>(DRIVERS, key, record => {
          if (!record) throw new AppError('driver_reference_missing')
          const driver = readDriver(record, key)
          const overview = { ...session, driverId: driver.id, selection: undefined }
          operations.put(META, SESSION, envelope(overview))
          workspace(operations, overview)
        })
      })
    })
  }

  createDriver(command: CreateDriverCommand, fingerprint: string): Promise<DriverReceipt> {
    return this.#withDatabase([META, DRIVERS, COMMANDS], 'readwrite', operations => {
      operations.get<SavedReceipt<DriverReceipt>>(COMMANDS, command.commandId, record => {
        if (record) {
          const previous = check(record)
          if (previous.fingerprint !== fingerprint) throw new AppError('command_conflict')
          operations.finish(previous.receipt)
          return
        }
        loadSession(operations, session => {
          const driver = createDriver(command)
          requireActiveActor(session, command.actor)
          const key = driverKey(driver.id)
          operations.get<SavedDriver>(DRIVERS, key, existing => {
            if (existing) {
              readDriver(existing, key)
              throw new AppError('stale')
            }
            const receipt = { driverId: driver.id }
            operations.add(DRIVERS, key, envelope(driver))
            operations.add(COMMANDS, command.commandId, envelope({ fingerprint, receipt }))
            operations.put(META, SESSION, envelope({ ...session, driverId: driver.id, selection: undefined }))
            operations.finish(receipt)
          })
        })
      })
    })
  }

  create(command: CreateRunCommand, fingerprint: string, buildRun: () => Run): Promise<RunReceipt> {
    return this.#withDatabase([...WORKSPACE, COMMANDS], 'readwrite', operations => {
      operations.get<SavedReceipt>(COMMANDS, command.commandId, record => {
        if (record) {
          const previous = check(record)
          if (previous.fingerprint !== fingerprint) throw new AppError('command_conflict')
          operations.finish(previous.receipt)
          return
        }
        loadSession(operations, session => {
          const { actor } = command
          if (actor.role !== assessmentContext(command.payload)) throw new AppError('wrong_role')
          requireActiveActor(session, actor)
          if (actor.role === 'instruktør' && command.payload.useExistingDriver !== true) {
            throw new AppError('driver_reference_missing')
          }
          operations.get<SavedRun>(RUNS, command.runId, existing => {
            if (existing) {
              check(existing)
              throw new AppError('stale')
            }
            const run = buildRun()
            if (run.id !== command.runId || run.driver.id !== command.payload.driverId
              || run.firstDay.id !== command.payload.dayId || !canReadAssessment(run, actor.role)) {
              throw new AppError('invalid_command')
            }
            const key = driverKey(run.driver.id)
            operations.get<SavedDriver>(DRIVERS, key, record => {
              let linked = run
              if (command.payload.useExistingDriver) {
                if (!record) throw new AppError('driver_reference_missing')
                const driver = readDriver(record, key)
                if (!sameDriverReference(driver, { ...run.driver, id: driver.id })) throw new AppError('stale')
                linked = { ...run, driver, firstDay: { ...run.firstDay, driverId: driver.id } }
              } else {
                if (record) throw new AppError('stale')
                operations.add(DRIVERS, key, envelope(run.driver))
              }
              const receipt = { runId: linked.id, dayId: linked.firstDay.id, revision: linked.revision }
              operations.add(RUNS, linked.id, envelope(linked))
              operations.add(COMMANDS, command.commandId, envelope({ fingerprint, receipt }))
              operations.put(META, SESSION, envelope({ ...session, selection: { runId: linked.id, dayId: linked.firstDay.id },
                ...(actor.role === 'instruktør' && { driverId: linked.driver.id }) }))
              operations.finish(receipt)
            })
          })
        })
      })
    })
  }

  createDay(command: CreateDayCommand, fingerprint: string): Promise<CreateDayReceipt> {
    return this.#mutateRunWithReceipt(command, fingerprint, run => createDay(run, command),
      (run, receipt, previous) => ({ ...receipt, created: run !== previous }), true)
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

  saveMentorDay(command: SaveMentorDayCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: updateMentorDay(run, command), dayId: command.payload.dayId,
    }))
  }

  confirmMentorDay(command: ConfirmMentorDayCommand, fingerprint: string): Promise<MentorDayReceipt> {
    return this.#mutateRunWithReceipt(command, fingerprint, run => ({
      run: confirmMentorDay(run, command), dayId: command.payload.dayId,
    }), (run, receipt) => ({ ...receipt, confirmation: findDay(run, receipt.dayId)!.mentorConfirmation! }))
  }

  reviewRelevance(command: ReviewRelevanceCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: reviewRelevance(run, command), dayId: command.payload.dayId,
    }))
  }

  saveFollowUp(command: SaveFollowUpCommand, fingerprint: string): Promise<FollowUpReceipt> {
    return this.#mutateRunWithReceipt(command, fingerprint, run => ({
      run: saveFollowUp(run, command), dayId: command.payload.dayId,
    }), (run, receipt) => ({
      ...receipt,
      plan: currentPlan(run),
      event: run.planEvents!.at(-1)!,
      window: followUpWindow(run, findDay(run, receipt.dayId)!),
      status: runStatus(run),
    }))
  }

  saveConclusion(command: SaveConclusionCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: saveConclusion(run, command), dayId: run.firstDay.id,
    }))
  }

  closeRun(command: CloseRunCommand, fingerprint: string): Promise<RunReceipt> {
    return this.#mutateRun(command, fingerprint, run => ({
      run: closeRun(run, command), dayId: run.firstDay.id,
    }))
  }

  #mutateRun(
    command: Pick<SaveDayDraftCommand, 'commandId' | 'runId' | 'actor'>,
    fingerprint: string,
    update: (run: Run) => { run: Run; dayId: string },
  ): Promise<RunReceipt> {
    return this.#mutateRunWithReceipt(command, fingerprint, update, (_run, receipt) => receipt)
  }

  #mutateRunWithReceipt<T extends RunReceipt>(
    command: Pick<SaveDayDraftCommand, 'commandId' | 'runId' | 'actor'>,
    fingerprint: string,
    update: (run: Run) => { run: Run; dayId: string },
    makeReceipt: (run: Run, receipt: RunReceipt, previous: Run) => T,
    selectDay = false,
  ): Promise<T> {
    return this.#withDatabase([...WORKSPACE, COMMANDS], 'readwrite', operations => {
      operations.get<SavedReceipt<T>>(COMMANDS, command.commandId, record => {
        if (record) {
          const previous = check(record)
          if (previous.fingerprint !== fingerprint) throw new AppError('command_conflict')
          if ('confirmation' in previous.receipt || 'event' in previous.receipt) {
            loadSession(operations, session => {
              requireActiveActor(session, command.actor)
              operations.finish(previous.receipt)
            })
          } else operations.finish(previous.receipt)
          return
        }
        loadSession(operations, session => {
          const { actor, runId } = command
          requireActiveActor(session, actor)
          operations.get<SavedRun>(RUNS, runId, record => {
            if (!record) throw new AppError('run_missing')
            const previous = readRun(record)
            if (previous.id !== runId) throw new AppError('storage_read')
            if (!canReadAssessment(previous, actor.role)) throw new AppError('wrong_role')
            const key = driverKey(previous.driver.id)
            operations.get<SavedDriver>(DRIVERS, key, driver => {
              if (!driver) throw new AppError('storage_read')
              if (readDriver(driver, key).id !== previous.driver.id) throw new AppError('storage_read')
              if (previous.lifecycle === 'closed') throw new AppError('locked')
              const { run, dayId } = update(previous)
              const receipt = makeReceipt(run, { runId, dayId, revision: run.revision }, previous)
              if (run !== previous) operations.put(RUNS, runId, envelope(run))
              operations.add(COMMANDS, command.commandId, envelope({ fingerprint, receipt }))
              if (selectDay) operations.put(META, SESSION, envelope({
                ...session, selection: { runId, dayId },
                ...(actor.role === 'instruktør' && { driverId: run.driver.id }),
              }))
              operations.finish(receipt)
            })
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
