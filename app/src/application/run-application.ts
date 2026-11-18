import { AppError, createRun, dayLocks, findDay, runDays, validateContent, validateCreateIds } from '../domain/run.ts'
import type { Actor, ContentSnapshot, CreateRunCommand, CreateRunFields, Role, Run, RunReceipt } from '../domain/run.ts'
import { dayDraft, dayFieldAccess, dayFields, validateDayDraftCommand } from '../domain/day-draft.ts'
import type { DayChanges, SaveDayDraftCommand } from '../domain/day-draft.ts'
import type { RunStore, Selection, WorkspaceState } from './run-store.ts'
import {
  baselineOf, firstDayCanDriveAfter, validateBaselineDraftCommand, validateConfirmBaselineCommand,
} from '../domain/baseline.ts'
import type { BaselineChanges, ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../domain/baseline.ts'

function summary(run: Run) {
  const identity = run.firstDay.driverIdentity ?? run.driver
  return {
    id: run.id,
    status: run.lifecycle === 'closed' ? 'Avsluttet' : 'Pågående',
    driverName: identity.name,
    employeeNumber: identity.employeeNumber,
    firstDate: run.firstDay.date,
  }
}

function baselineView(run: Run, role: Role) {
  const baseline = baselineOf(run)
  const editable = role === 'sjåfør' && run.lifecycle === 'open'
    && !run.baselineConfirmation && !run.firstDay.mentorConfirmation
  return {
    ...baseline,
    reasonDrafts: editable ? baseline.reasonDrafts : {},
    editable,
    confirmation: run.baselineConfirmation,
    criteria: run.content.criteria,
    firstDayId: run.firstDay.id,
    fields: dayDraft(run, run.firstDay),
    driverAfterAvailable: firstDayCanDriveAfter(run),
  }
}

function toView(state: WorkspaceState) {
  const selection = state.session.selection
  const run = state.runs.find(item => item.id === selection?.runId)
  const day = run && selection && findDay(run, selection.dayId)
  if (selection && (!run || !day)) throw new AppError('storage_read')
  return {
    actor: { ...state.session.actor },
    runs: state.runs.map(summary),
    selected: run && day && {
      ...summary(run),
      dayId: day.id,
      day: day.number,
      revision: run.revision,
      fields: dayDraft(run, day),
      access: dayFieldAccess(run, day, state.session.actor.role),
      ...dayLocks(run, day),
      baseline: baselineView(run, state.session.actor.role),
      plannedLastDay: run.initialLastDay,
      plannedLastDate: runDays(run).find(item => item.number === run.initialLastDay)?.date,
    },
  }
}

export type WorkspaceView = ReturnType<typeof toView>
export type DayView = NonNullable<WorkspaceView['selected']>

export function confirmationView(day: DayView, command: ConfirmBaselineCommand, receipt: RunReceipt): DayView {
  const { baseline } = day
  return {
    ...day,
    revision: receipt.revision,
    ...(day.dayId === receipt.dayId && {
      identityLocked: true,
      access: { ...day.access, driverName: 'locked', employeeNumber: 'locked', date: 'locked' },
    }),
    baseline: {
      ...baseline,
      editable: false,
      driverAfterAvailable: true,
      reasonDrafts: {},
      confirmation: {
        actor: { ...command.actor, name: baseline.fields.driverName },
        confirmedAt: command.payload.confirmedAt,
      },
    },
  }
}

function fingerprint({ actor, expectedRevision, runId, payload }: CreateRunCommand): string {
  return JSON.stringify([
    runId, actor.id, actor.role, expectedRevision,
    payload.driverName, payload.employeeNumber, payload.mentorName, payload.firstDate,
    payload.initialLastDay, payload.driverId, payload.dayId,
  ])
}

export class RunApplication {
  readonly #store: RunStore
  readonly #content: ContentSnapshot
  readonly #newId: () => string

  constructor(store: RunStore, content: ContentSnapshot, newId: () => string) {
    this.#store = store
    this.#content = content
    this.#newId = newId
  }

  async open(): Promise<WorkspaceView> {
    validateContent(this.#content)
    return toView(await this.#store.open({ fadder: this.#newId(), sjåfør: this.#newId() }))
  }

  async withOpenStorage<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'storage_open') throw error
    }
    await this.open()
    return operation()
  }

  newCreateCommand(actor: Actor, fields: CreateRunFields): CreateRunCommand {
    return {
      commandId: this.#newId(),
      runId: this.#newId(),
      actor: { ...actor },
      expectedRevision: 0,
      payload: { ...fields, driverId: this.#newId(), dayId: this.#newId() },
    }
  }

  async executeCreate(command: CreateRunCommand) {
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload } }
    validateCreateIds(snapshot)
    return this.#store.create(snapshot, fingerprint(snapshot), () => createRun(snapshot, this.#content))
  }

  newDayDraftCommand(actor: Actor, selection: Selection, expectedRevision: number, changes: DayChanges): SaveDayDraftCommand {
    return {
      commandId: this.#newId(),
      runId: selection.runId,
      actor: { ...actor },
      expectedRevision,
      payload: { dayId: selection.dayId, changes: { ...changes } },
    }
  }

  async executeDayDraft(command: SaveDayDraftCommand) {
    const snapshot = {
      ...command,
      actor: { ...command.actor },
      payload: { ...command.payload, changes: { ...command.payload?.changes } },
    }
    validateDayDraftCommand(snapshot)
    const { runId, actor, expectedRevision, payload } = snapshot
    const fingerprint = JSON.stringify([
      'save-day-draft', runId, actor.id, actor.role, expectedRevision, payload.dayId,
      dayFields.filter(field => field in payload.changes).map(field => [field, payload.changes[field]]),
    ])
    return this.#store.saveDayDraft(snapshot, fingerprint)
  }

  newBaselineDraftCommand(actor: Actor, runId: string, expectedRevision: number, changes: BaselineChanges): SaveBaselineDraftCommand {
    return {
      commandId: this.#newId(), runId, actor: { ...actor }, expectedRevision, payload: { changes },
    }
  }

  async executeBaselineDraft(command: SaveBaselineDraftCommand) {
    validateBaselineDraftCommand(command)
    const changes = Object.fromEntries(Object.entries(command.payload.changes).sort(([a], [b]) => a.localeCompare(b))
      .map(([id, row]) => [id, { ...row }]))
    const snapshot = { ...command, actor: { ...command.actor }, payload: { changes } }
    const { runId, actor, expectedRevision } = snapshot
    const fingerprint = JSON.stringify([
      'save-baseline-draft', runId, actor.id, actor.role, expectedRevision,
      Object.entries(changes).map(([id, row]) => [id, row.value, row.reason, row.reasonDraft]),
    ])
    return this.#store.saveBaselineDraft(snapshot, fingerprint)
  }

  newConfirmBaselineCommand(actor: Actor, runId: string, expectedRevision: number): ConfirmBaselineCommand {
    return {
      commandId: this.#newId(), runId, actor: { ...actor }, expectedRevision,
      payload: { confirmedAt: new Date().toISOString() },
    }
  }

  async executeConfirmBaseline(command: ConfirmBaselineCommand) {
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload } }
    validateConfirmBaselineCommand(snapshot)
    const { runId, actor, expectedRevision, payload } = snapshot
    const fingerprint = JSON.stringify(['confirm-baseline', runId, actor.id, actor.role, expectedRevision, payload.confirmedAt])
    return this.#store.confirmBaseline(snapshot, fingerprint)
  }

  async read(selection?: Selection) {
    return toView(await this.#store.read(selection))
  }

  async select(runId: string, dayId?: string) {
    return toView(await this.#store.select(runId, dayId))
  }

  async changeRole(role: Role, selection?: Selection) {
    return toView(await this.#store.changeRole(role, selection))
  }
}
