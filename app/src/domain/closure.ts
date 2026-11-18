import { validateSavedBaseline } from './baseline.ts'
import { dayFields } from './day-draft.ts'
import type { DayField } from './day-draft.ts'
import { validateSavedDriverDays } from './driver-day.ts'
import { validateSavedPlan } from './follow-up.ts'
import { checkMentorDay, validateSavedMentorDays } from './mentor-day.ts'
import { AppError, dayLocks, hasText, isConfirmation, isConfirmationTime, isId, runDays, validateSavedRun } from './run.ts'
import type { Actor, Confirmation, Day, Run } from './run.ts'

export type ConclusionStatus = 'approved' | 'follow_up_needed'
export type ConclusionDraft = { text: string; status: ConclusionStatus | null; mentorName: string }

type RunHistory = Omit<Run, 'lifecycle' | 'conclusionDraft' | 'closureSnapshot'>

export type ClosureSnapshot = Readonly<{
  documentVersion: 1
  pdfLayoutVersion: 1
  history: RunHistory & Required<Pick<Run, 'baseline' | 'baselineConfirmation'>>
  conclusion: Readonly<Omit<ConclusionDraft, 'mentorName' | 'status'> & { status: ConclusionStatus }>
  closedBy: Confirmation
}>

type ClosureCommand = { commandId: string; runId: string; actor: Actor; expectedRevision: number }
export type SaveConclusionCommand = ClosureCommand & { payload: ConclusionDraft }
export type CloseRunCommand = ClosureCommand & {
  payload: ConclusionDraft & { status: ConclusionStatus; confirmedAt: string }
}

export type ClosureIssue = {
  dayId?: string
  dayNumber?: number
  message: string
} & ({ section: 'session'; field: DayField } | { section: 'days' | 'baseline' | 'after' | 'mentor' | 'history' })

function validStatus(value: unknown): value is ConclusionStatus {
  return value === 'approved' || value === 'follow_up_needed'
}

function validDraft(value: ConclusionDraft) {
  return typeof value?.text === 'string' && typeof value.mentorName === 'string'
    && (value.status === null || validStatus(value.status))
}

export function conclusionDraft(run: Run): ConclusionDraft {
  return run.conclusionDraft ?? {
    text: '', status: null, mentorName: runDays(run).at(-1)?.mentorName ?? '',
  }
}

function dayMatchesConfirmations(day: Day) {
  return day.identityConfirmed && day.session && day.driverIdentity && day.driverConfirmation
    && day.mentorConfirmation && day.driverAfterAnswers && day.mentorDay && day.driverEvaluation
    && day.driverConfirmation.actor.name === day.driverIdentity.name
    && day.mentorConfirmation.actor.name === day.mentorName
}

export function checkClosureDays(run: Run): ClosureIssue[] {
  if (!run.firstDay) return [{ section: 'days', message: 'Opprett og bekreft minst én dag.' }]
  const issues: ClosureIssue[] = []
  if (!run.baselineConfirmation) {
    issues.push({ dayId: run.firstDay.id, dayNumber: 1, section: 'baseline', message: 'Førvurderingen må bekreftes av sjåføren.' })
  } else if (run.baselineConfirmation.actor.name !== run.firstDay.driverIdentity?.name) {
    issues.push({
      dayId: run.firstDay.id, dayNumber: 1, section: 'history',
      message: 'Identiteten på den låste førvurderingen samsvarer ikke med bekreftelsen.',
    })
  }
  for (const day of runDays(run)) {
    const atDay = { dayId: day.id, dayNumber: day.number }
    const { dayLocked, identityLocked } = dayLocks(run, day)
    if (dayLocked && day.mentorConfirmation) {
      if (!dayMatchesConfirmations(day)) {
        issues.push({ ...atDay, section: 'history', message: 'Øktopplysningene og bekreftelsene for den låste dagen samsvarer ikke.' })
      }
      continue
    }
    const { driverAfterMissing, fields } = checkMentorDay(run, day)
    if (driverAfterMissing && run.baselineConfirmation) {
      issues.push({ ...atDay, section: 'after', message: 'Ettervurderingen må bekreftes av sjåføren.' })
    }
    for (const field of dayFields) {
      const message = fields[field]
      if (message && !(identityLocked && ['driverName', 'employeeNumber', 'date'].includes(field))) {
        issues.push({ ...atDay, section: 'session', field, message })
      }
    }
    issues.push({ ...atDay, section: 'mentor', message: 'Fadder må fullføre og bekrefte dagen.' })
  }
  return issues
}

function validateConclusionCommand(command: SaveConclusionCommand, fields: readonly string[]) {
  const ids = [command.commandId, command.runId, command.actor?.id]
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1 || !validDraft(command.payload)
    || Object.keys(command.payload).some(key => !fields.includes(key))) {
    throw new AppError('invalid_command')
  }
  if (command.actor.role !== 'fadder') throw new AppError('wrong_role')
}

const draftFields = ['text', 'status', 'mentorName']

export function validateSaveConclusionCommand(command: SaveConclusionCommand) {
  validateConclusionCommand(command, draftFields)
}

export function validateCloseRunCommand(command: CloseRunCommand) {
  validateConclusionCommand(command, [...draftFields, 'confirmedAt'])
  if (!isConfirmationTime(command.payload.confirmedAt)) throw new AppError('invalid_command')
  if (!validStatus(command.payload.status) || !hasText(command.payload.mentorName)) throw new AppError('validation')
}

function assertWritable(run: Run, command: ClosureCommand) {
  if (run.id !== command.runId) throw new AppError('run_missing')
  if (run.lifecycle === 'closed') throw new AppError('locked')
  if (run.revision !== command.expectedRevision) throw new AppError('stale')
  if (run.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
}

export function saveConclusion(run: Run, command: SaveConclusionCommand): Run {
  validateSaveConclusionCommand(command)
  assertWritable(run, command)
  const { text, status, mentorName } = command.payload
  return { ...run, revision: run.revision + 1, conclusionDraft: { text, status, mentorName } }
}

// Samme kontroll brukes før lagring og før senere eksport av den frosne dokumentkilden.
export function validateClosureSnapshot(snapshot: ClosureSnapshot): void {
  if (snapshot?.documentVersion !== 1 || snapshot.pdfLayoutVersion !== 1
    || !snapshot.history?.baseline || !snapshot.history.baselineConfirmation
    || !isConfirmation(snapshot.closedBy, 'fadder') || !validStatus(snapshot.conclusion?.status)
    || typeof snapshot.conclusion.text !== 'string') throw new AppError('storage_read')
  const run = { ...snapshot.history, lifecycle: 'closed' as const }
  validateSavedRun(run)
  validateSavedBaseline(run)
  validateSavedPlan(run)
  validateSavedDriverDays(run)
  validateSavedMentorDays(run)

  const days = runDays(run)
  let positions = snapshot.history.baseline.answers.length
  if (snapshot.history.baselineConfirmation.actor.name !== run.firstDay.driverIdentity?.name) {
    throw new AppError('storage_read')
  }
  for (const day of days) {
    if (!dayMatchesConfirmations(day)) throw new AppError('storage_read')
    positions += day.driverAfterAnswers!.length + day.mentorDay!.answers.length
  }
  if (!days.length || positions !== 22 + 44 * days.length) throw new AppError('storage_read')
}

export function validateSavedClosure(run: Run): void {
  if (run.lifecycle === 'open') {
    if (run.closureSnapshot !== undefined || (run.conclusionDraft !== undefined && !validDraft(run.conclusionDraft))) {
      throw new AppError('storage_read')
    }
    return
  }
  const snapshot = run.closureSnapshot
  if (!snapshot || snapshot.history?.id !== run.id || snapshot.history.revision !== run.revision
    || run.conclusionDraft !== undefined) throw new AppError('storage_read')
  validateClosureSnapshot(snapshot)
  const days = runDays(run)
  const frozenDays = runDays({ ...snapshot.history, lifecycle: 'closed' })
  if (days.length !== frozenDays.length || days.some((day, index) => day.id !== frozenDays[index].id)) {
    throw new AppError('storage_read')
  }
}

export function closeRun(run: Run, command: CloseRunCommand): Run {
  validateCloseRunCommand(command)
  assertWritable(run, command)
  const { text, status, mentorName, confirmedAt } = command.payload
  const saved = conclusionDraft(run)
  if (saved.text !== text || saved.status !== status || saved.mentorName !== mentorName) throw new AppError('stale')
  if (checkClosureDays(run).length || !run.baseline || !run.baselineConfirmation) throw new AppError('validation')

  const revision = run.revision + 1
  const snapshot: ClosureSnapshot = structuredClone({
    documentVersion: 1,
    pdfLayoutVersion: 1,
    history: {
      id: run.id, revision, driver: run.driver, initialLastDay: run.initialLastDay,
      plan: run.plan, planHistoryBase: run.planHistoryBase, followUpDecisions: run.followUpDecisions, planEvents: run.planEvents,
      firstDay: run.firstDay, laterDays: run.laterDays, content: run.content,
      baseline: run.baseline, baselineConfirmation: run.baselineConfirmation,
    },
    conclusion: { text, status },
    closedBy: { actor: { ...command.actor, name: mentorName.trim() }, confirmedAt },
  })
  validateClosureSnapshot(snapshot)
  return { ...run, revision, lifecycle: 'closed', conclusionDraft: undefined, closureSnapshot: snapshot }
}
