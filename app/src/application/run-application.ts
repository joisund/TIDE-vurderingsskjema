import { AppError, createRun, validateContent, validateCreateIds } from '../domain/run.ts'
import type { Actor, ContentSnapshot, CreateRunCommand, CreateRunFields, Role, Run } from '../domain/run.ts'
import type { RunStore, Selection, WorkspaceState } from './run-store.ts'

function summary(run: Run) {
  return {
    id: run.id,
    status: 'Pågående',
    driverName: run.driver.name,
    employeeNumber: run.driver.employeeNumber,
    firstDate: run.firstDay.date,
  }
}

function toView(state: WorkspaceState) {
  const selection = state.session.selection
  const run = state.runs.find(item => item.id === selection?.runId)
  if (selection && (!run || run.firstDay.id !== selection.dayId)) throw new AppError('storage_read')
  return {
    actor: state.session.actor,
    runs: state.runs.map(summary),
    selected: run && {
      ...summary(run),
      dayId: run.firstDay.id,
      day: run.firstDay.number,
      mentorName: run.firstDay.mentorName,
      plannedLastDay: run.initialLastDay,
      plannedLastDate: run.initialLastDay === 1 ? run.firstDay.date : undefined,
    },
  }
}

export type WorkspaceView = ReturnType<typeof toView>

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

  newCreateCommand(actor: Actor, fields: CreateRunFields): CreateRunCommand {
    return {
      commandId: this.#newId(),
      runId: this.#newId(),
      actor,
      expectedRevision: 0,
      payload: { ...fields, driverId: this.#newId(), dayId: this.#newId() },
    }
  }

  async executeCreate(command: CreateRunCommand) {
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload } }
    validateCreateIds(snapshot)
    return this.#store.create(snapshot, fingerprint(snapshot), () => createRun(snapshot, this.#content))
  }

  async read() {
    return toView(await this.#store.read())
  }

  async select(runId: string, dayId?: string) {
    return toView(await this.#store.select(runId, dayId))
  }

  async changeRole(role: Role, selection?: Selection) {
    return toView(await this.#store.changeRole(role, selection))
  }
}
