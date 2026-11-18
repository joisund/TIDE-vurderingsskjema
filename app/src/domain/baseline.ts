import { checkDayFields, dayDraft } from './day-draft.ts'
import { AppError, isConfirmationTime, isId, validateContent } from './run.ts'
import type { Actor, Run } from './run.ts'
import { reasonRequirement, validateReason } from './reason.ts'

export const answerValues = ['ok', 'needs_improvement', 'not_relevant'] as const
export type AnswerValue = typeof answerValues[number]
export type AnswerContent = { value: AnswerValue | null; reason: string | null }
export type Answer = AnswerContent & {
  id: string
  criterionId: string
  phase: 'before' | 'driver_after'
  answerRevision: number
}
export type DriverAfterAnswer = Answer & { locked: boolean; inheritedFrom?: string }
export type BaselineDraftRow = AnswerContent & { reasonDraft?: string }
export type BaselineChanges = Record<string, BaselineDraftRow>
export type Baseline = { answers: Answer[]; reasonDrafts: Partial<Record<string, string>> }

type BaselineCommand = { commandId: string; runId: string; actor: Actor; expectedRevision: number }
export type SaveBaselineDraftCommand = BaselineCommand & { payload: { changes: BaselineChanges } }
export type ConfirmBaselineCommand = BaselineCommand & { payload: { confirmedAt: string } }

function answerId(parentId: string, phase: Answer['phase'], criterionId: string) {
  // UUIDv8 over løps-/dagsnøkkel, fase og kriterium (FNV-1a-128).
  // Samme schema 1-rad gir samme identifikator før og etter første skriv.
  const key = `${parentId.toLowerCase()}:${phase}:${criterionId}`
  let hash = 0x6c62272e07bb014262b821756295c58dn
  for (const char of key) hash = BigInt.asUintN(128, (hash ^ BigInt(char.charCodeAt(0))) * 0x1000000000000000000013bn)
  const hex = hash.toString(16).padStart(32, '0')
  const variant = (8 | (parseInt(hex[16], 16) & 3)).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`
}

function emptyAnswer(id: string, criterionId: string, phase: Answer['phase']): Answer {
  return { id, criterionId, phase, value: null, reason: null, answerRevision: 0 }
}

// Eldre lagrede løp har samme entydige førposisjoner fra første lesing.
export function baselineOf(run: Run): Baseline {
  return run.baseline ?? {
    answers: run.content.criteria.map(({ id }) => emptyAnswer(answerId(run.id, 'before', id), id, 'before')),
    reasonDrafts: {},
  }
}

function validContent(answer: AnswerContent) {
  if (answer.value === 'not_relevant') {
    if (typeof answer.reason !== 'string') return false
    const reason = validateReason(answer.reason)
    return reason.valid && reason.text === answer.reason
  }
  return (answer.value === null || answerValues.includes(answer.value)) && answer.reason === null
}

function validateAnswerSet(run: Run, answers: Answer[], phase: Answer['phase']) {
  if (!Array.isArray(answers)) throw new AppError('storage_read')
  const expected = new Set(run.content.criteria.map(criterion => criterion.id))
  for (const answer of answers) {
    const expectedId = answerId(phase === 'before' ? run.id : run.firstDay.id, phase, answer?.criterionId)
    if (!expected.delete(answer?.criterionId) || answer.id !== expectedId || answer.phase !== phase
      || !Number.isSafeInteger(answer.answerRevision) || answer.answerRevision < 0 || answer.answerRevision > run.revision
      || (answer.value !== null && answer.answerRevision === 0)) throw new AppError('storage_read')
  }
  if (expected.size) throw new AppError('storage_read')
}

export function validateSavedBaseline(run: Run) {
  validateContent(run.content)
  if (run.baseline === undefined) {
    if (run.baselineConfirmation !== undefined || run.firstDay.driverAfterAnswers !== undefined) {
      throw new AppError('storage_read')
    }
    return
  }

  const { answers, reasonDrafts } = baselineOf(run)
  validateAnswerSet(run, answers, 'before')
  if (answers.some(answer => !validContent(answer)) || !reasonDrafts || typeof reasonDrafts !== 'object'
    || Array.isArray(reasonDrafts) || Object.entries(reasonDrafts).some(([id, draft]) =>
      !run.content.criteria.some(criterion => criterion.id === id) || typeof draft !== 'string')) {
    throw new AppError('storage_read')
  }

  const inheritedAnswers = run.firstDay.driverAfterAnswers
  if (!run.baselineConfirmation) {
    if (inheritedAnswers !== undefined) throw new AppError('storage_read')
    return
  }
  if (!inheritedAnswers || !run.firstDay.identityConfirmed || answers.some(answer => answer.value === null)
    || Object.keys(reasonDrafts).length) throw new AppError('storage_read')
  validateAnswerSet(run, inheritedAnswers, 'driver_after')
  const before = new Map(answers.map(answer => [answer.criterionId, answer]))
  for (const answer of inheritedAnswers) {
    const source = before.get(answer.criterionId)!
    if (!validContent(answer) || (source.value === 'not_relevant'
      ? !(answer.locked === true && answer.inheritedFrom === source.id && answer.value === source.value && answer.reason === source.reason)
      : answer.locked !== false || answer.inheritedFrom !== undefined)) throw new AppError('storage_read')
  }
}

export function checkBaselineAnswers(answers: readonly Answer[]) {
  const issues: Record<string, string> = {}
  for (const answer of answers) {
    if (answer.value === null) issues[answer.criterionId] = 'Velg et svar.'
    else if (!validContent(answer)) issues[answer.criterionId] = reasonRequirement
  }
  return issues
}

function validateBaselineCommand(command: BaselineCommand) {
  const ids = [command.commandId, command.runId, command.actor?.id]
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1) {
    throw new AppError('invalid_command')
  }
  if (command.actor.role !== 'sjåfør') throw new AppError('wrong_role')
}

export function validateBaselineDraftCommand(command: SaveBaselineDraftCommand) {
  validateBaselineCommand(command)
  const changes = command.payload?.changes
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || !Object.keys(changes).length) {
    throw new AppError('invalid_command')
  }
  for (const row of Object.values(changes)) {
    if (!row || !validContent(row) || (row.reasonDraft !== undefined && typeof row.reasonDraft !== 'string')) {
      throw new AppError('validation')
    }
  }
}

export function validateConfirmBaselineCommand(command: ConfirmBaselineCommand) {
  validateBaselineCommand(command)
  if (!isConfirmationTime(command.payload?.confirmedAt)) throw new AppError('invalid_command')
}

function writableBaseline(run: Run, command: BaselineCommand) {
  if (run.id !== command.runId) throw new AppError('run_missing')
  if (run.revision !== command.expectedRevision) throw new AppError('stale')
  if (run.lifecycle !== 'open' || run.baselineConfirmation || run.firstDay.mentorConfirmation) throw new AppError('locked')
  if (run.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
  validateContent(run.content)
  const baseline = baselineOf(run)
  validateAnswerSet(run, baseline.answers, 'before')
  return baseline
}

export function applyBaselineChanges(baseline: Baseline, changes: BaselineChanges): Baseline {
  const reasonDrafts = { ...baseline.reasonDrafts }
  const answers = baseline.answers.map(answer => {
    const row = changes[answer.criterionId]
    if (!row) return answer
    if (row.reasonDraft === undefined) delete reasonDrafts[answer.criterionId]
    else reasonDrafts[answer.criterionId] = row.reasonDraft
    const { value, reason } = row
    if (value === answer.value && reason === answer.reason) return answer
    return { ...answer, value, reason, answerRevision: answer.answerRevision + 1 }
  })
  return { answers, reasonDrafts }
}

export function updateBaselineDraft(run: Run, command: SaveBaselineDraftCommand): Run {
  validateBaselineDraftCommand(command)
  const baseline = writableBaseline(run, command)
  if (Object.keys(command.payload.changes).some(id => !run.content.criteria.some(criterion => criterion.id === id))) {
    throw new AppError('invalid_command')
  }
  return { ...run, baseline: applyBaselineChanges(baseline, command.payload.changes), revision: run.revision + 1 }
}

export function firstDayCanDriveAfter(run: Run) {
  return Boolean(run.baselineConfirmation && run.baseline && run.firstDay.identityConfirmed && run.firstDay.driverAfterAnswers)
}

export function confirmBaseline(run: Run, command: ConfirmBaselineCommand): Run {
  validateConfirmBaselineCommand(command)
  const baseline = writableBaseline(run, command)
  const day = run.firstDay
  const fields = dayDraft(run, day)
  const issues = { ...checkDayFields(fields, 'driver'), ...checkBaselineAnswers(baseline.answers) }
  if (day.number !== 1 || !isId(day.id) || !isId(day.driverId) || day.driverId !== run.driver.id) {
    throw new AppError('invalid_command')
  }
  if (Object.keys(issues).length) throw new AppError<Record<string, string>>('validation', issues)

  const driverAfterAnswers = baseline.answers.map(source => {
    const answer = emptyAnswer(answerId(day.id, 'driver_after', source.criterionId), source.criterionId, 'driver_after')
    return source.value === 'not_relevant'
      ? { ...answer, value: source.value, reason: source.reason, answerRevision: 1, inheritedFrom: source.id, locked: true }
      : { ...answer, locked: false }
  })
  return {
    ...run,
    revision: run.revision + 1,
    baseline: { answers: baseline.answers, reasonDrafts: {} },
    baselineConfirmation: {
      actor: { ...command.actor, name: fields.driverName },
      confirmedAt: command.payload.confirmedAt,
    },
    firstDay: {
      ...day,
      identityConfirmed: true,
      driverIdentity: { name: fields.driverName, employeeNumber: fields.employeeNumber },
      driverAfterAnswers,
    },
  }
}
