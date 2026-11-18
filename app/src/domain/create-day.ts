import { dayDraft } from './day-draft.ts'
import { driverAfterOf } from './driver-day.ts'
import { currentPlan } from './follow-up.ts'
import { mentorDayOf } from './mentor-day.ts'
import { AppError, assertProfessionalRole, hasText, isAssessmentContext, professionalTerms, isCalendarDate, isId, runDays, validateContent } from './run.ts'
import type { Actor, Day, Run, RunReceipt } from './run.ts'

export type CreateDayFields = { date: string; mentorName: string }
export type CreateDayCommand = {
  commandId: string
  runId: string
  actor: Actor
  expectedRevision: number
  payload: CreateDayFields & { dayId: string }
}
export type CreateDayReceipt = RunReceipt & { created: boolean }

export function validateCreateDayCommand(command: CreateDayCommand) {
  const { payload } = command
  const ids = [command.commandId, command.runId, command.actor?.id, payload?.dayId]
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1
    || typeof payload.date !== 'string' || typeof payload.mentorName !== 'string'
    || Object.keys(payload).some(key => !['dayId', 'date', 'mentorName'].includes(key))) {
    throw new AppError('invalid_command')
  }
  if (!isAssessmentContext(command.actor.role)) throw new AppError('wrong_role')
}

export function createDay(run: Run, command: CreateDayCommand) {
  validateCreateDayCommand(command)
  const context = assertProfessionalRole(run, command.actor)
  if (run.id !== command.runId) throw new AppError('run_missing')
  if (run.lifecycle !== 'open') throw new AppError('locked')
  const { date, dayId, mentorName } = command.payload
  const days = runDays(run)
  const existing = days.find(day => day.date === date)
  // En annen fane kan ha registrert datoen først. Bare eksisterende dag velges.
  if (existing) return { run, dayId: existing.id }
  if (run.revision !== command.expectedRevision) throw new AppError('stale')
  if (run.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
  const number = days.length + 1
  if (number > 5) throw new AppError('day_limit')
  if (number > currentPlan(run).lastDay) throw new AppError('plan_required')
  if ([run.driver.id, ...days.map(day => day.id)].some(id => id.toLowerCase() === dayId.toLowerCase())) {
    throw new AppError('invalid_command')
  }
  if (!isCalendarDate(date)) {
    throw new AppError<CreateDayFields>('validation', { date: 'Oppgi en gyldig dato som ÅÅÅÅ-MM-DD.' })
  }
  if (date <= days.at(-1)!.date) {
    throw new AppError<CreateDayFields>('validation', { date: 'Velg en dato etter siste registrerte dato.' })
  }
  if (!hasText(mentorName)) {
    throw new AppError<CreateDayFields>('validation', { mentorName: `Skriv inn ${professionalTerms(context).possessive} navn.` })
  }
  const { driverName: name, employeeNumber } = dayDraft(run, run.firstDay)
  if (!hasText(name) || !hasText(employeeNumber)) throw new AppError('driver_identity_required')
  validateContent(run.content)
  const day = {
    id: dayId, number: number as Exclude<Day['number'], 1>, date, driverId: run.driver.id,
    driverIdentity: { name, employeeNumber }, mentorName: mentorName.trim(), identityConfirmed: false,
  }
  const newDay = { ...day, driverAfterAnswers: driverAfterOf(run, day).answers, mentorDay: mentorDayOf(run, day) }
  return {
    run: { ...run, revision: run.revision + 1, laterDays: [...(run.laterDays ?? []), newDay] },
    dayId,
  }
}
