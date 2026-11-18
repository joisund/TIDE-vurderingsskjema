import { AppError, dayLocks, findDay, hasText, isCalendarDate, isId, runDays } from './run.ts'
import type { Actor, Day, FieldErrors, Role, Run, SessionFields } from './run.ts'

export type DayDraft = SessionFields & {
  driverName: string
  employeeNumber: string
  mentorName: string
  date: string
}

export type DayField = keyof DayDraft
export type DayChanges = Partial<DayDraft>
export type DayFieldAccess = Record<DayField, 'editable' | 'read-only' | 'locked'>
export type DayDraftErrors = FieldErrors<DayDraft>

export type SaveDayDraftCommand = {
  commandId: string
  runId: string
  actor: Actor
  expectedRevision: number
  payload: { dayId: string; changes: DayChanges }
}

export const dayFields = [
  'driverName', 'employeeNumber', 'mentorName', 'date', 'bus1', 'bus2', 'routes', 'startTime', 'endTime',
] as const satisfies readonly DayField[]

const emptySession: SessionFields = { bus1: '', bus2: '', routes: '', startTime: '', endTime: '' }

export function dayDraft(run: Run, day: Day): DayDraft {
  const identity = day.driverIdentity ?? run.driver
  const { bus1, bus2, routes, startTime, endTime } = day.session ?? emptySession
  return {
    driverName: identity.name,
    employeeNumber: identity.employeeNumber,
    mentorName: day.mentorNameDraft ?? day.mentorName,
    date: day.date,
    bus1, bus2, routes, startTime, endTime,
  }
}

export function dayFieldAccess(run: Run, day: Day, role: Role): DayFieldAccess {
  const { dayLocked, identityLocked } = dayLocks(run, day)
  const mentor = role === 'fadder' ? 'editable' : 'read-only'
  const identity = identityLocked ? 'locked' : mentor
  const mentorField = dayLocked ? 'locked' : mentor
  const time = dayLocked ? 'locked' : 'editable'
  return {
    driverName: identity, employeeNumber: identity, date: identity,
    mentorName: mentorField, bus1: mentorField, bus2: mentorField, routes: mentorField,
    startTime: time, endTime: time,
  }
}

export function isShiftTime(value: string) {
  return value.length === 5 && /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}

export function checkDayFields(fields: DayDraft, forStage: 'driver' | 'day-lock'): DayDraftErrors {
  const issues: DayDraftErrors = {}
  if (!hasText(fields.driverName)) issues.driverName = 'Skriv inn sjåførens navn.'
  if (!hasText(fields.employeeNumber)) issues.employeeNumber = 'Skriv inn ansattnummer.'
  if (!hasText(fields.mentorName)) issues.mentorName = 'Skriv inn fadderens navn.'
  if (!isCalendarDate(fields.date)) issues.date = 'Oppgi en gyldig dato som ÅÅÅÅ-MM-DD.'
  if (forStage === 'driver') return issues

  if (!hasText(fields.bus1) && !hasText(fields.bus2)) issues.bus1 = 'Oppgi minst én buss.'
  if (!hasText(fields.routes)) issues.routes = 'Oppgi linjene for økten.'
  if (!isShiftTime(fields.startTime)) issues.startTime = 'Oppgi inn-tid i formatet HH:mm, for eksempel 07:30.'
  if (!isShiftTime(fields.endTime)) issues.endTime = 'Oppgi ut-tid i formatet HH:mm, for eksempel 16:00.'
  return issues
}

export function validateDayDraftCommand(command: SaveDayDraftCommand) {
  const ids = [command.commandId, command.runId, command.actor?.id, command.payload?.dayId]
  const changes = command.payload?.changes
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length
    || (command.actor.role !== 'fadder' && command.actor.role !== 'sjåfør')
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1
    || !changes || Object.keys(changes).length === 0) {
    throw new AppError('invalid_command')
  }
  for (const [field, value] of Object.entries(changes)) {
    if (!(dayFields as readonly string[]).includes(field) || typeof value !== 'string') {
      throw new AppError('invalid_command')
    }
  }
}

export function updateDayDraft(run: Run, command: SaveDayDraftCommand): Run {
  validateDayDraftCommand(command)
  if (run.id !== command.runId) throw new AppError('run_missing')
  if (run.revision !== command.expectedRevision) throw new AppError('stale')
  if (run.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
  const { dayId, changes } = command.payload
  const day = findDay(run, dayId)
  if (!day) throw new AppError('day_missing')
  if (day.driverId !== run.driver.id) throw new AppError('storage_read')
  const access = dayFieldAccess(run, day, command.actor.role)
  for (const field of Object.keys(changes) as DayField[]) {
    if (access[field] === 'locked') throw new AppError('locked')
    if (access[field] === 'read-only') throw new AppError('wrong_role')
  }

  const { driverName, employeeNumber, mentorName, date, ...session } = { ...dayDraft(run, day), ...changes }
  if (changes.date !== undefined) {
    if (!isCalendarDate(date)) {
      throw new AppError<DayDraft>('validation', { date: 'Oppgi en gyldig dato som ÅÅÅÅ-MM-DD.' })
    }
    const outOfOrder = runDays(run).some(other =>
      (other.number < day.number && other.date >= date) || (other.number > day.number && other.date <= date),
    )
    if (outOfOrder) {
      throw new AppError<DayDraft>('validation', { date: 'Velg en unik dato i stigende dagsrekkefølge.' })
    }
  }

  const updated = {
    ...day, driverIdentity: { name: driverName, employeeNumber }, date,
    session: { ...day.session, ...session },
  }
  if (changes.mentorName !== undefined) {
    if (hasText(mentorName)) {
      updated.mentorName = mentorName
      delete updated.mentorNameDraft
    } else {
      updated.mentorNameDraft = mentorName
    }
  }
  const revision = run.revision + 1
  if (day.number === 1) return { ...run, revision, firstDay: { ...updated, number: 1 } }
  const laterDays = run.laterDays?.map(item => item.id === day.id ? { ...updated, number: item.number } : item)
  return { ...run, revision, laterDays }
}
