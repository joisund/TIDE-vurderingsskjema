import {
  applyBaselineChanges, checkBaselineAnswers, emptyAnswer, firstDayCanDriveAfter, validAnswerContent,
  validateAnswerChanges, validateAnswerSet, validateDriverCommand, validReasonDrafts,
} from './baseline.ts'
import type { AnswerDraft, BaselineChanges, DriverAfterAnswer } from './baseline.ts'
import { checkDayFields, dayDraft } from './day-draft.ts'
import { currentPlan, plannedDayAt } from './follow-up.ts'
import type { RunPlan } from './follow-up.ts'
import { AppError, dayLocks, findDay, isConfirmationTime, replaceDay, runDays, validateContent } from './run.ts'
import type { Actor, Day, Run } from './run.ts'

export { currentPlan } from './follow-up.ts'
export type { RunPlan } from './follow-up.ts'

export const evaluationFields = ['strength1', 'strength2', 'strength3', 'growth1', 'growth2', 'growth3'] as const
export type EvaluationField = typeof evaluationFields[number]
export type EvaluationTexts = Partial<Record<EvaluationField, string>>
type EvaluationDecision = 'skipped' | 'submitted'
export type EvaluationDraft = { texts: EvaluationTexts; offerPlanRevision: number; decision?: EvaluationDecision }
export type DriverEvaluation = {
  dayId: string
  date: string
  planRevision: number
  state: 'not_offered' | EvaluationDecision
  texts: EvaluationTexts
  offerPlanRevision?: number
}

type DriverCommand = { commandId: string; runId: string; actor: Actor; expectedRevision: number }
export type DriverDayChanges = {
  answers?: BaselineChanges
  evaluation?: { texts?: EvaluationTexts; decision?: EvaluationDecision; previousOfferRevision?: number; markOffer?: true }
}
export type SaveDriverDayDraftCommand = DriverCommand & {
  payload: { dayId: string; planRevision: number; changes: DriverDayChanges }
}
export type ConfirmDriverDayCommand = DriverCommand & {
  payload: { dayId: string; planRevision: number; confirmedAt: string }
}

export function offersEvaluation(plan: RunPlan, day: Day) {
  return day.number === 1 || day.number === plan.lastDay
}

function knownOffer(run: Run, day: Day, revision: number): boolean | undefined {
  if (day.number === 1) return true
  const lastDay = plannedDayAt(run, revision)
  return lastDay === undefined ? undefined : day.number === lastDay
}

export function applyEvaluationChanges(previous: EvaluationDraft | undefined, change: NonNullable<DriverDayChanges['evaluation']>, offerPlanRevision: number): EvaluationDraft {
  return {
    texts: { ...previous?.texts, ...change.texts },
    offerPlanRevision,
    decision: change.decision ?? (previous?.offerPlanRevision === offerPlanRevision ? previous.decision : undefined),
  }
}

export function snapshotEvaluation(dayId: string, date: string, planRevision: number, offered: boolean, draft?: EvaluationDraft): DriverEvaluation {
  return {
    dayId, date, planRevision,
    state: (offered && draft?.offerPlanRevision === planRevision ? draft.decision : undefined) ?? 'not_offered',
    texts: draft?.texts ?? {},
    offerPlanRevision: draft?.offerPlanRevision,
  }
}

export function driverAfterOf(run: Run, day: Day): AnswerDraft<DriverAfterAnswer> {
  return {
    answers: day.driverAfterAnswers === undefined ? run.content.criteria.map(({ id }) => ({
      ...emptyAnswer(day.id, id, 'driver_after'), locked: false,
    })) : day.driverAfterAnswers,
    reasonDrafts: day.driverAfterReasonDrafts ?? {},
  }
}

function isPlanRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isDecision(value: unknown): value is EvaluationDecision {
  return value === 'skipped' || value === 'submitted'
}

function validTexts(texts: unknown): texts is EvaluationTexts {
  return Boolean(texts && typeof texts === 'object' && !Array.isArray(texts) && Object.entries(texts).every(([field, text]) =>
    (evaluationFields as readonly string[]).includes(field) && typeof text === 'string'))
}

export function validateSavedDriverDays(run: Run) {
  const plan = currentPlan(run)
  const baselineConfirmed = firstDayCanDriveAfter(run)
  const days = runDays(run)
  for (const day of days) {
    const { driverAfterAnswers, driverAfterReasonDrafts, driverConfirmation, evaluationDraft, driverEvaluation } = day
    if (driverAfterAnswers !== undefined) {
      validateAnswerSet(run, driverAfterAnswers, 'driver_after', day.id)
      if (day.number !== 1 && driverAfterAnswers.some(answer => answer.locked !== false || answer.inheritedFrom !== undefined
        || !validAnswerContent(answer))) throw new AppError('storage_read')
    }
    if (!baselineConfirmed) {
      if ((driverAfterAnswers !== undefined && (day.number === 1
        || driverAfterAnswers.some(answer => answer.value !== null || answer.answerRevision !== 0)))
        || [driverAfterReasonDrafts, driverConfirmation, evaluationDraft, driverEvaluation].some(value => value !== undefined)) {
        throw new AppError('storage_read')
      }
      continue
    }
    if (driverAfterReasonDrafts !== undefined && (!driverAfterAnswers || driverConfirmation
      || !validReasonDrafts(driverAfterAnswers, driverAfterReasonDrafts)
      || driverAfterAnswers.some(answer => answer.locked && Object.hasOwn(driverAfterReasonDrafts, answer.criterionId)))) {
      throw new AppError('storage_read')
    }
    if (evaluationDraft !== undefined && (!evaluationDraft || driverConfirmation || !validTexts(evaluationDraft.texts)
      || !isPlanRevision(evaluationDraft.offerPlanRevision) || evaluationDraft.offerPlanRevision > plan.revision
      || knownOffer(run, day, evaluationDraft.offerPlanRevision) === false
      || (evaluationDraft.decision !== undefined && !isDecision(evaluationDraft.decision)))) throw new AppError('storage_read')
    if (driverConfirmation) {
      const offered = driverEvaluation && knownOffer(run, day, driverEvaluation.planRevision)
      if (!driverAfterAnswers || driverAfterAnswers.some(answer => answer.value === null) || !day.identityConfirmed
        || !driverEvaluation || driverEvaluation.dayId !== day.id || driverEvaluation.date !== day.date
        || !isPlanRevision(driverEvaluation.planRevision) || driverEvaluation.planRevision > plan.revision
        || !validTexts(driverEvaluation.texts)
        || !['not_offered', 'skipped', 'submitted'].includes(driverEvaluation.state)
        || (offered !== undefined && offered !== isDecision(driverEvaluation.state))
        || (driverEvaluation.offerPlanRevision !== undefined && (!isPlanRevision(driverEvaluation.offerPlanRevision)
          || driverEvaluation.offerPlanRevision > driverEvaluation.planRevision
          || knownOffer(run, day, driverEvaluation.offerPlanRevision) === false))
        || (isDecision(driverEvaluation.state) && driverEvaluation.offerPlanRevision !== driverEvaluation.planRevision)) {
        throw new AppError('storage_read')
      }
    } else if (driverEvaluation !== undefined) throw new AppError('storage_read')
  }
}

export function validateDriverDayDraftCommand(command: SaveDriverDayDraftCommand) {
  validateDriverCommand(command, command.payload?.dayId)
  const { changes, planRevision } = command.payload
  if (!isPlanRevision(planRevision) || !changes || (!changes.answers && !changes.evaluation)) {
    throw new AppError('invalid_command')
  }
  if (changes.answers !== undefined) validateAnswerChanges(changes.answers)
  const evaluation = changes.evaluation
  if (evaluation !== undefined && (!evaluation || (!evaluation.texts && evaluation.decision === undefined && !evaluation.markOffer)
    || (evaluation.markOffer !== undefined && evaluation.markOffer !== true)
    || (evaluation.texts !== undefined && (!validTexts(evaluation.texts) || !Object.keys(evaluation.texts).length))
    || (evaluation.previousOfferRevision !== undefined && (!isPlanRevision(evaluation.previousOfferRevision)
      || evaluation.previousOfferRevision >= planRevision || !evaluation.texts || evaluation.decision !== undefined || evaluation.markOffer))
    || (evaluation.decision !== undefined && !isDecision(evaluation.decision)))) throw new AppError('invalid_command')
}

export function validateConfirmDriverDayCommand(command: ConfirmDriverDayCommand) {
  validateDriverCommand(command, command.payload?.dayId)
  if (!isPlanRevision(command.payload.planRevision) || !isConfirmationTime(command.payload.confirmedAt)) {
    throw new AppError('invalid_command')
  }
}

function writableDriverDay(run: Run, command: SaveDriverDayDraftCommand | ConfirmDriverDayCommand) {
  if (command.runId !== run.id) throw new AppError('run_missing')
  const plan = currentPlan(run)
  if (command.expectedRevision !== run.revision || command.payload.planRevision !== plan.revision) throw new AppError('stale')
  const day = findDay(run, command.payload.dayId)
  if (!day) throw new AppError('day_missing')
  if (dayLocks(run, day).dayLocked || day.driverConfirmation) throw new AppError('locked')
  if (!firstDayCanDriveAfter(run)) throw new AppError('baseline_required')
  if (run.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
  if (day.driverId !== run.driver.id) throw new AppError('storage_read')
  validateContent(run.content)
  const draft = driverAfterOf(run, day)
  validateAnswerSet(run, draft.answers, 'driver_after', day.id)
  return { day, plan, draft }
}

export function updateDriverDayDraft(run: Run, command: SaveDriverDayDraftCommand): Run {
  validateDriverDayDraftCommand(command)
  const { day, plan, draft } = writableDriverDay(run, command)
  const { answers, evaluation } = command.payload.changes
  const updated = { ...day }
  if (answers) {
    for (const id of Object.keys(answers)) {
      const answer = draft.answers.find(item => item.criterionId === id)
      if (!answer) throw new AppError('invalid_command')
      if (answer.locked) throw new AppError('locked')
    }
    const applied = applyBaselineChanges(draft, answers)
    updated.driverAfterAnswers = applied.answers
    updated.driverAfterReasonDrafts = applied.reasonDrafts
  }
  if (evaluation) {
    const offered = offersEvaluation(plan, day)
    const previous = day.evaluationDraft
    const oldRevision = evaluation.previousOfferRevision
    if (oldRevision !== undefined) {
      const known = knownOffer(run, day, oldRevision)
      if (known === false || (known === undefined && previous?.offerPlanRevision !== oldRevision)) throw new AppError('invalid_command')
    }
    if (!offered && oldRevision === undefined) throw new AppError('invalid_command')
    const issues = checkBaselineAnswers(updated.driverAfterAnswers ?? draft.answers)
    const complete = Object.keys(issues).length === 0
    const verifiedRevision = oldRevision ?? (previous?.offerPlanRevision === plan.revision ? plan.revision : undefined)
    if (!complete && (evaluation.decision || evaluation.markOffer || verifiedRevision === undefined)) {
      throw new AppError<Record<string, string>>('validation', issues)
    }
    const offerPlanRevision = offered && complete ? plan.revision : verifiedRevision!
    updated.evaluationDraft = applyEvaluationChanges(previous, evaluation, offerPlanRevision)
  }
  return replaceDay(run, updated)
}

export function confirmDriverDay(run: Run, command: ConfirmDriverDayCommand): Run {
  validateConfirmDriverDayCommand(command)
  const { day, plan, draft } = writableDriverDay(run, command)
  const fields = dayDraft(run, day)
  const issues: Record<string, string> = { ...checkDayFields(fields, 'driver'), ...checkBaselineAnswers(draft.answers) }
  const offered = offersEvaluation(plan, day)
  const evaluation = snapshotEvaluation(day.id, day.date, plan.revision, offered, day.evaluationDraft)
  if (offered && evaluation.state === 'not_offered') issues.evaluation = 'Gå til egenevalueringen og velg om du vil sende den inn eller hoppe over.'
  if (Object.keys(issues).length) throw new AppError<Record<string, string>>('validation', issues)

  const updated: Day = {
    ...day,
    ...(!day.identityConfirmed && { identityConfirmed: true,
      driverIdentity: { name: fields.driverName, employeeNumber: fields.employeeNumber } }),
    driverAfterAnswers: draft.answers,
    driverEvaluation: evaluation,
    driverConfirmation: {
      actor: { ...command.actor, name: fields.driverName }, confirmedAt: command.payload.confirmedAt,
    },
  }
  delete updated.evaluationDraft
  delete updated.driverAfterReasonDrafts
  return replaceDay(run, updated)
}
