import { AppError, createRun, dayLocks, findDay, runDays, validateContent, validateCreateIds } from '../domain/run.ts'
import type { Actor, ContentSnapshot, CreateRunCommand, CreateRunFields, Day, Role, Run, RunReceipt } from '../domain/run.ts'
import { dayDraft, dayFieldAccess, dayFields, validateDayDraftCommand } from '../domain/day-draft.ts'
import type { DayChanges, SaveDayDraftCommand } from '../domain/day-draft.ts'
import type { RunStore, Selection, WorkspaceState } from './run-store.ts'
import {
  baselineOf, firstDayCanDriveAfter, validateBaselineDraftCommand, validateConfirmBaselineCommand,
} from '../domain/baseline.ts'
import type { BaselineChanges, ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../domain/baseline.ts'
import {
  currentPlan, driverAfterOf, evaluationFields, offersEvaluation, snapshotEvaluation,
  validateConfirmDriverDayCommand, validateDriverDayDraftCommand,
} from '../domain/driver-day.ts'
import type { ConfirmDriverDayCommand, DriverDayChanges, SaveDriverDayDraftCommand } from '../domain/driver-day.ts'
import {
  checkMentorDay, driverReadyForMentorDay, driverRelevance, mentorDayOf, validateConfirmMentorDayCommand, validateReviewRelevance, validateSaveMentorDay,
} from '../domain/mentor-day.ts'
import type { ConfirmMentorDayCommand, MentorDayChanges, MentorDayReceipt, ReviewInput, ReviewRelevanceCommand, SaveMentorDayCommand } from '../domain/mentor-day.ts'
import { dailyFollowUp, followUpWindow, runStatus, validateFollowUpCommand } from '../domain/follow-up.ts'
import type { FollowUpChoice, SaveFollowUpCommand } from '../domain/follow-up.ts'

function summary(run: Run) {
  const identity = run.firstDay.driverIdentity ?? run.driver
  return {
    id: run.id,
    status: runStatus(run),
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

function driverAfterView(run: Run, day: Day, role: Role) {
  if (!firstDayCanDriveAfter(run)) return undefined
  const { answers, reasonDrafts } = driverAfterOf(run, day)
  const editable = role === 'sjåfør' && !dayLocks(run, day).dayLocked && !day.driverConfirmation
  const plan = currentPlan(run)
  return {
    answers,
    reasonDrafts: editable ? reasonDrafts : {},
    editable,
    confirmation: day.driverConfirmation,
    criteria: run.content.criteria,
    fields: dayDraft(run, day),
    evaluationOffered: !day.driverConfirmation && offersEvaluation(plan, day),
    evaluationDraft: day.evaluationDraft,
    evaluation: day.driverEvaluation,
  }
}

function mentorDayView(run: Run, day: Day) {
  const { answers, reasonDrafts, comments, rejectionDrafts } = mentorDayOf(run, day)
  const editable = !dayLocks(run, day).dayLocked
  return {
    answers, comments,
    reasonDrafts, rejectionDrafts,
    relevance: driverRelevance(run, day),
    completion: editable ? checkMentorDay(run, day) : undefined,
    driverReady: driverReadyForMentorDay(run, day),
    driverName: day.driverConfirmation?.actor.name ?? dayDraft(run, day).driverName,
    mentorName: day.mentorName,
    criteria: run.content.criteria,
    confirmation: day.mentorConfirmation,
    editable,
    followUp: {
      decision: dailyFollowUp(run, day),
      window: followUpWindow(run, day),
      history: run.planEvents ?? [],
    },
  }
}

function toView(state: WorkspaceState) {
  const selection = state.session.selection
  const run = state.runs.find(item => item.id === selection?.runId)
  const day = run && selection && findDay(run, selection.dayId)
  const plan = run && currentPlan(run)
  if (selection && (!run || !day)) throw new AppError('storage_read')
  return {
    actor: { ...state.session.actor },
    runs: state.runs.map(summary),
    selected: run && day && plan && {
      ...summary(run),
      dayId: day.id,
      day: day.number,
      revision: run.revision,
      fields: dayDraft(run, day),
      access: dayFieldAccess(run, day, state.session.actor.role),
      ...dayLocks(run, day),
      baseline: baselineView(run, state.session.actor.role),
      driverAfter: driverAfterView(run, day, state.session.actor.role),
      ...(state.session.actor.role === 'fadder' && { mentorDay: mentorDayView(run, day) }),
      planRevision: plan.revision,
      plannedLastDay: plan.lastDay,
      plannedLastDate: runDays(run).find(item => item.number === plan.lastDay)?.date,
      days: runDays(run).map(item => ({
        id: item.id, number: item.number, date: item.date, driverConfirmation: item.driverConfirmation,
        dayLocked: dayLocks(run, item).dayLocked,
        ...(state.session.actor.role === 'fadder' && { mentorConfirmation: item.mentorConfirmation }),
      })),
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

export function driverDayConfirmationView(day: DayView, command: ConfirmDriverDayCommand, receipt: RunReceipt): DayView {
  if (!day.driverAfter) throw new AppError('storage_read')
  const confirmation = { actor: { ...command.actor, name: day.fields.driverName }, confirmedAt: command.payload.confirmedAt }
  const { evaluationOffered, evaluationDraft } = day.driverAfter
  return {
    ...day,
    revision: receipt.revision,
    identityLocked: true,
    access: { ...day.access, driverName: 'locked', employeeNumber: 'locked', date: 'locked' },
    days: day.days.map(item => item.id === day.dayId ? { ...item, driverConfirmation: confirmation } : item),
    driverAfter: {
      ...day.driverAfter,
      editable: false, confirmation, reasonDrafts: {}, evaluationOffered: false, evaluationDraft: undefined,
      evaluation: snapshotEvaluation(day.dayId, day.fields.date, day.planRevision, evaluationOffered, evaluationDraft),
    },
  }
}

export function mentorDayConfirmationView<T extends DayView & { mentorDay: NonNullable<DayView['mentorDay']> }>(
  day: T, { revision, confirmation }: MentorDayReceipt,
): T {
  return {
    ...day, revision, dayLocked: true, identityLocked: true,
    access: { driverName: 'locked', employeeNumber: 'locked', date: 'locked', mentorName: 'locked',
      bus1: 'locked', bus2: 'locked', routes: 'locked', startTime: 'locked', endTime: 'locked' },
    days: day.days.map(item => item.id === day.dayId ? { ...item, dayLocked: true, mentorConfirmation: confirmation } : item),
    mentorDay: { ...day.mentorDay, editable: false, confirmation, completion: undefined },
  }
}

function orderedChanges(changes: BaselineChanges) {
  return Object.fromEntries(Object.entries(changes).sort(([a], [b]) => a.localeCompare(b)).map(([id, row]) => [id, { ...row }]))
}

function answerFingerprint(changes: BaselineChanges) {
  return Object.entries(changes).map(([id, row]) => [id, row.value, row.reason, row.reasonDraft])
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
    const changes = orderedChanges(command.payload.changes)
    const snapshot = { ...command, actor: { ...command.actor }, payload: { changes } }
    const { runId, actor, expectedRevision } = snapshot
    const fingerprint = JSON.stringify([
      'save-baseline-draft', runId, actor.id, actor.role, expectedRevision,
      answerFingerprint(changes),
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

  newDriverDayDraftCommand(actor: Actor, day: DayView, changes: DriverDayChanges): SaveDriverDayDraftCommand {
    return {
      commandId: this.#newId(), runId: day.id, actor: { ...actor }, expectedRevision: day.revision,
      payload: { dayId: day.dayId, planRevision: day.planRevision, changes },
    }
  }

  async executeDriverDayDraft(command: SaveDriverDayDraftCommand) {
    validateDriverDayDraftCommand(command)
    const { answers, evaluation } = command.payload.changes
    const changes = {
      answers: answers && orderedChanges(answers),
      evaluation: evaluation && { ...evaluation, texts: evaluation.texts && { ...evaluation.texts } },
    }
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload, changes } }
    const { runId, actor, expectedRevision, payload } = snapshot
    const fingerprint = JSON.stringify([
      'save-driver-day-draft', runId, actor.id, actor.role, expectedRevision, payload.dayId, payload.planRevision,
      changes.answers && answerFingerprint(changes.answers),
      evaluation && [evaluation.decision, evaluation.previousOfferRevision,
        evaluationFields.map(field => evaluation.texts?.[field]), ...(evaluation.markOffer ? [true] : [])],
    ])
    return this.#store.saveDriverDayDraft(snapshot, fingerprint)
  }

  newConfirmDriverDayCommand(actor: Actor, day: DayView): ConfirmDriverDayCommand {
    return {
      commandId: this.#newId(), runId: day.id, actor: { ...actor }, expectedRevision: day.revision,
      payload: { dayId: day.dayId, planRevision: day.planRevision, confirmedAt: new Date().toISOString() },
    }
  }

  async executeConfirmDriverDay(command: ConfirmDriverDayCommand) {
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload } }
    validateConfirmDriverDayCommand(snapshot)
    const { runId, actor, expectedRevision, payload } = snapshot
    const fingerprint = JSON.stringify([
      'confirm-driver-day', runId, actor.id, actor.role, expectedRevision, payload.dayId, payload.planRevision, payload.confirmedAt,
    ])
    return this.#store.confirmDriverDay(snapshot, fingerprint)
  }

  newMentorDayCommand(actor: Actor, day: DayView, changes: MentorDayChanges): SaveMentorDayCommand {
    return {
      commandId: this.#newId(), runId: day.id, actor: { ...actor }, expectedRevision: day.revision,
      payload: { dayId: day.dayId, changes },
    }
  }

  async executeMentorDay(command: SaveMentorDayCommand) {
    validateSaveMentorDay(command)
    const { answers, comments, rejectionDrafts } = command.payload.changes
    const changes = {
      ...(answers && { answers: orderedChanges(answers) }),
      ...(comments && { comments: Object.fromEntries(Object.entries(comments).sort()) }),
      ...(rejectionDrafts && { rejectionDrafts: Object.fromEntries(Object.entries(rejectionDrafts).sort()) }),
    }
    const snapshot = { ...command, actor: { ...command.actor }, payload: { dayId: command.payload.dayId, changes } }
    const { runId, actor, expectedRevision, payload } = snapshot
    return this.#store.saveMentorDay(snapshot, JSON.stringify([
      'save-mentor-day', runId, actor.id, actor.role, expectedRevision, payload.dayId,
      changes.answers && answerFingerprint(changes.answers), changes.comments, changes.rejectionDrafts,
    ]))
  }

  newConfirmMentorDayCommand(actor: Actor, day: DayView): ConfirmMentorDayCommand {
    return {
      commandId: this.#newId(), runId: day.id, actor: { ...actor }, expectedRevision: day.revision,
      payload: { dayId: day.dayId, confirmedAt: new Date().toISOString() },
    }
  }

  async executeConfirmMentorDay(command: ConfirmMentorDayCommand) {
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload } }
    validateConfirmMentorDayCommand(snapshot)
    const { runId, actor, expectedRevision, payload } = snapshot
    return this.#store.confirmMentorDay(snapshot, JSON.stringify([
      'confirm-mentor-day', runId, actor.id, actor.role, expectedRevision, payload.dayId, payload.confirmedAt,
    ]))
  }

  newReviewCommand(actor: Actor, day: DayView, criterionId: string, review: ReviewInput): ReviewRelevanceCommand {
    return {
      commandId: this.#newId(), runId: day.id, actor: { ...actor }, expectedRevision: day.revision,
      payload: { dayId: day.dayId, criterionId, ...review },
    }
  }

  async executeReview(command: ReviewRelevanceCommand) {
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload } }
    validateReviewRelevance(snapshot)
    const { runId, actor, expectedRevision, payload } = snapshot
    return this.#store.reviewRelevance(snapshot, JSON.stringify([
      'review-driver-relevance', runId, actor.id, actor.role, expectedRevision, payload.dayId,
      payload.criterionId, payload.answerId, payload.answerRevision, payload.decision, payload.rejectionComment,
    ]))
  }

  newFollowUpCommand(actor: Actor, day: DayView, choice: FollowUpChoice, source: SaveFollowUpCommand['payload']['source'] = 'daily'): SaveFollowUpCommand {
    return {
      commandId: this.#newId(), runId: day.id, actor: { ...actor }, expectedRevision: day.revision,
      payload: { dayId: day.dayId, source, choice: { ...choice } },
    }
  }

  async executeFollowUp(command: SaveFollowUpCommand) {
    validateFollowUpCommand(command)
    const snapshot = { ...command, actor: { ...command.actor }, payload: { ...command.payload, choice: { ...command.payload.choice } } }
    const { runId, actor, expectedRevision, payload } = snapshot
    return this.#store.saveFollowUp(snapshot, JSON.stringify([
      'save-follow-up', runId, actor.id, actor.role, expectedRevision, payload.dayId, payload.source,
      payload.choice.kind, payload.choice.kind === 'days' ? payload.choice.extraDays : null,
    ]))
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
