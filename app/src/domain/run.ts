import type { Baseline, DriverAfterAnswer } from './baseline.ts'
import type { EvaluationDraft, DriverEvaluation } from './driver-day.ts'
import type { FollowUpDecision, PlanEvent, RunPlan } from './follow-up.ts'
import type { MentorDay } from './mentor-day.ts'
import type { ClosureSnapshot, ConclusionDraft } from './closure.ts'

export type Role = 'fadder' | 'sjåfør'
export type Actor = { id: string; role: Role }
export type StartPlan = 1 | 2 | 3

export type CreateRunFields = {
  driverName: string
  employeeNumber: string
  mentorName: string
  firstDate: string
  initialLastDay: string
}

export type FieldErrors<T = CreateRunFields> = Partial<Record<keyof T, string>>

export type Criterion = { id: string; title: string; help: string }
export type ContentSnapshot = {
  criteriaVersion: string
  ruleVersion: string
  helpVersion: string
  criteria: readonly Criterion[]
}

export type Confirmation = { actor: Actor & { name: string }; confirmedAt: string }
export type MentorConfirmation = Confirmation & { date: string; part: 'mentor_day' }
export type SessionFields = { bus1: string; bus2: string; routes: string; startTime: string; endTime: string }

export type Day = {
  id: string
  number: 1 | 2 | 3 | 4 | 5
  date: string
  driverId: string
  driverIdentity?: { name: string; employeeNumber: string }
  mentorName: string
  mentorNameDraft?: string
  identityConfirmed: boolean
  driverConfirmation?: Confirmation
  mentorConfirmation?: MentorConfirmation
  session?: SessionFields
  driverAfterAnswers?: DriverAfterAnswer[]
  driverAfterReasonDrafts?: Baseline['reasonDrafts']
  evaluationDraft?: EvaluationDraft
  driverEvaluation?: DriverEvaluation
  mentorDay?: MentorDay
}

export type FirstDay = Day & { number: 1 }

export type Run = {
  id: string
  revision: number
  lifecycle: 'open' | 'closed'
  driver: { id: string; name: string; employeeNumber: string }
  initialLastDay: StartPlan
  plan?: RunPlan
  planHistoryBase?: RunPlan
  followUpDecisions?: FollowUpDecision[]
  planEvents?: PlanEvent[]
  firstDay: FirstDay
  laterDays?: (Day & { number: 2 | 3 | 4 | 5 })[]
  baseline?: Baseline
  baselineConfirmation?: Confirmation
  content: ContentSnapshot
  conclusionDraft?: ConclusionDraft
  closureSnapshot?: ClosureSnapshot
}

export type CreateRunCommand = {
  commandId: string
  runId: string
  actor: Actor
  expectedRevision: number
  payload: CreateRunFields & { driverId: string; dayId: string }
}

export type RunReceipt = { runId: string; dayId: string; revision: number }

export type ErrorCode =
  | 'validation' | 'invalid_command' | 'invalid_content' | 'wrong_role' | 'stale' | 'baseline_required'
  | 'day_limit' | 'plan_required' | 'driver_identity_required'
  | 'command_conflict' | 'run_missing' | 'day_missing' | 'locked' | 'storage_open' | 'storage_read'
  | 'storage_write' | 'storage_blocked' | 'schema_changed'
  | 'unsupported_schema' | 'resource_load'

export class AppError<T = CreateRunFields> extends Error {
  readonly code: ErrorCode
  readonly fields: FieldErrors<T>

  constructor(code: ErrorCode, fields: FieldErrors<T> = {}) {
    super(code)
    this.code = code
    this.fields = fields
  }
}

// Kriterium-ID-ene følger de 22 faste nummerposisjonene i PRD-addendumet (versjon 1).
export const criterionIds: readonly string[] = Object.freeze(
  Array.from({ length: 22 }, (_, index) => `criterion-${String(index + 1).padStart(2, '0')}`),
)

export function validateContent(content: ContentSnapshot): void {
  if (!Array.isArray(content?.criteria) || !hasText(content.criteriaVersion)
    || !hasText(content.ruleVersion) || !hasText(content.helpVersion)) {
    throw new AppError('invalid_content')
  }
  const expected = new Set(criterionIds)
  for (const criterion of content.criteria) {
    if (!expected.delete(criterion?.id) || !hasText(criterion.title) || !hasText(criterion.help)) {
      throw new AppError('invalid_content')
    }
  }
  if (expected.size) {
    throw new AppError('invalid_content')
  }
}

// Datoen er den valgte kalenderdatoen i Europe/Oslo. Den representeres aldri som et tidspunkt.
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= monthLengths[month - 1]
}

function startPlanFrom(value: string): StartPlan | undefined {
  switch (value) {
    case '1': return 1
    case '2': return 2
    case '3': return 3
  }
}

export function validateCreateRun(fields: CreateRunFields): FieldErrors {
  const errors: FieldErrors = {}
  if (!hasText(fields.driverName)) errors.driverName = 'Skriv inn sjåførens navn.'
  if (!hasText(fields.employeeNumber)) errors.employeeNumber = 'Skriv inn ansattnummer.'
  if (!hasText(fields.mentorName)) errors.mentorName = 'Skriv inn fadderens navn.'
  if (!isCalendarDate(fields.firstDate)) errors.firstDate = 'Oppgi en gyldig første kalenderdato.'
  if (!startPlanFrom(fields.initialLastDay)) errors.initialLastDay = 'Velg en startplan på én, to eller tre dager.'
  return errors
}

export function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function validateCreateIds(command: CreateRunCommand) {
  const ids = [command.commandId, command.runId, command.actor?.id, command.payload?.driverId, command.payload?.dayId]
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length) {
    throw new AppError('invalid_command')
  }
}

export function isConfirmationTime(time: unknown): time is string {
  return typeof time === 'string' && isCalendarDate(time.slice(0, 10))
    && /^T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(time.slice(10))
    && time.endsWith('Z')
}

export function isConfirmation(confirmation: Confirmation, role: Role) {
  return isId(confirmation?.actor?.id) && confirmation.actor.role === role && hasText(confirmation.actor.name)
    && isConfirmationTime(confirmation.confirmedAt)
}

export function dayLocks(run: Run, day: Day) {
  const dayLocked = run.lifecycle === 'closed' || Boolean(day.mentorConfirmation)
  const identityLocked = dayLocked || day.identityConfirmed
    || Boolean(day.number === 1 ? run.baselineConfirmation : day.driverConfirmation)
  return { dayLocked, identityLocked }
}

export function validateSavedRun(run: Run) {
  if (!isId(run?.id) || !['open', 'closed'].includes(run.lifecycle) || !isId(run.driver?.id)
    || !hasText(run.driver.name) || !hasText(run.driver.employeeNumber)
    || !Number.isSafeInteger(run.revision) || run.revision < 1
    || !run.firstDay || (run.laterDays !== undefined && !Array.isArray(run.laterDays))
    || (run.baselineConfirmation !== undefined && !isConfirmation(run.baselineConfirmation, 'sjåfør'))
    || ![1, 2, 3].includes(run.initialLastDay)) {
    throw new AppError('storage_read')
  }
  const days = runDays(run)
  const ids = new Set<string>()
  let previousDate = ''
  for (const [index, day] of days.entries()) {
    const locks = day && dayLocks(run, day)
    if (!isId(day?.id) || ids.has(day.id) || day.driverId !== run.driver.id
      || day.number !== index + 1 || day.number > 5 || typeof day.identityConfirmed !== 'boolean'
      || !hasText(day.mentorName) || !isCalendarDate(day.date) || day.date <= previousDate
      || (day.mentorNameDraft !== undefined && (typeof day.mentorNameDraft !== 'string' || hasText(day.mentorNameDraft)))
      || (day.driverConfirmation !== undefined && !isConfirmation(day.driverConfirmation, 'sjåfør'))
      || (day.mentorConfirmation !== undefined && (!isConfirmation(day.mentorConfirmation, 'fadder')
        || day.mentorConfirmation.date !== day.date || day.mentorConfirmation.part !== 'mentor_day'))
      || (day.identityConfirmed && !(day.number === 1 ? run.baselineConfirmation : day.driverConfirmation))
      // 1.1 lagret ingen bekreftede dager. Bare ulåst identitet kan falle tilbake på løpsprofilen.
      || (locks.identityLocked && (!hasText(day.driverIdentity?.name) || !hasText(day.driverIdentity?.employeeNumber)))
      || (locks.dayLocked && day.mentorNameDraft !== undefined)
      || (day.driverIdentity !== undefined && (typeof day.driverIdentity?.name !== 'string'
        || typeof day.driverIdentity.employeeNumber !== 'string'))
      || (day.session !== undefined && (typeof day.session?.bus1 !== 'string'
        || typeof day.session.bus2 !== 'string' || typeof day.session.routes !== 'string'
        || typeof day.session.startTime !== 'string' || typeof day.session.endTime !== 'string'))) {
      throw new AppError('storage_read')
    }
    ids.add(day.id)
    previousDate = day.date
  }
}

export function runDays(run: Run): Day[] {
  return [run.firstDay, ...(run.laterDays ?? [])]
}

export function findDay(run: Run, dayId: string): Day | undefined {
  return runDays(run).find(day => day.id === dayId)
}

export function replaceDay(run: Run, day: Day): Run {
  const revision = run.revision + 1
  if (day.number === 1) return { ...run, revision, firstDay: { ...day, number: 1 } }
  const laterDays = run.laterDays?.map(item => item.id === day.id ? { ...day, number: item.number } : item)
  return { ...run, revision, laterDays }
}

export function createRun(command: CreateRunCommand, content: ContentSnapshot): Run {
  validateCreateIds(command)
  if (command.actor.role !== 'fadder') throw new AppError('wrong_role')
  if (command.expectedRevision !== 0) throw new AppError('stale')
  const fields = command.payload
  const errors = validateCreateRun(fields)
  const initialLastDay = startPlanFrom(fields.initialLastDay)
  if (Object.keys(errors).length || !initialLastDay) throw new AppError('validation', errors)
  validateContent(content)

  return {
    id: command.runId,
    revision: 1,
    lifecycle: 'open',
    driver: { id: fields.driverId, name: fields.driverName.trim(), employeeNumber: fields.employeeNumber.trim() },
    initialLastDay,
    firstDay: {
      id: fields.dayId,
      number: 1,
      date: fields.firstDate,
      driverId: fields.driverId,
      driverIdentity: { name: fields.driverName.trim(), employeeNumber: fields.employeeNumber.trim() },
      mentorName: fields.mentorName.trim(),
      identityConfirmed: false,
    },
    content: { ...content, criteria: content.criteria.map(criterion => ({ ...criterion })) },
  }
}
