import { AppError, dayLocks, findDay, hasText, isCalendarDate, isId, runDays } from './run.ts'
import type { Actor, Day, Run, RunReceipt } from './run.ts'

export type RunPlan = { revision: number; lastDay: Day['number'] }
export type FollowUpChoice = { kind: 'none' } | { kind: 'training' } | { kind: 'days'; extraDays: number }
type MentorActor = Actor & { role: 'fadder'; name: string }
export type FollowUpDecision = {
  id: string
  dayId: string
  source: 'daily' | 'extension'
  choice: FollowUpChoice
}
export type PlanEvent = {
  decisionId: string
  dayId: string
  dayNumber: Day['number']
  date: string
  actor: MentorActor
  commandId: string
  oldLastDay: Day['number']
  newLastDay: Day['number']
  planRevision: number
  source: FollowUpDecision['source']
  choice: FollowUpChoice
}
export type SaveFollowUpCommand = {
  commandId: string
  runId: string
  actor: Actor
  expectedRevision: number
  payload: { dayId: string; source: FollowUpDecision['source']; choice: FollowUpChoice }
}
export type FollowUpReceipt = RunReceipt & {
  plan: RunPlan
  event: PlanEvent
  window: PlanWindow
  status: ReturnType<typeof runStatus>
}

export type FollowUpInput = { need: '' | 'yes' | 'no'; type: '' | 'days' | 'training'; extraDays: string }
type PlanWindow = { withoutDecision: number; minimumLastDay: number }
type FollowUpPreview = { field: keyof FollowUpInput; message: string } | { choice: FollowUpChoice; proposedLastDay: Day['number'] }
const lastAllowedDay = 5

export function currentPlan(run: Run): RunPlan {
  return run.plan ?? { revision: 1, lastDay: run.initialLastDay }
}

export function plannedDayAt(run: Run, revision: number): Day['number'] | undefined {
  if (revision === 1) return run.initialLastDay
  const plan = currentPlan(run)
  if (revision === plan.revision) return plan.lastDay
  if (revision === run.planHistoryBase?.revision) return run.planHistoryBase.lastDay
  return run.planEvents?.find(event => event.planRevision === revision)?.newLastDay
}

function historyBase(run: Run): RunPlan {
  if (run.planHistoryBase) return run.planHistoryBase
  if (!run.planEvents && !run.followUpDecisions) return currentPlan(run)
  return { revision: 1, lastDay: run.initialLastDay }
}

function extraDays(choice?: FollowUpChoice) {
  return choice?.kind === 'days' ? choice.extraDays : 0
}

function plannedLastDay(initial: number, decisions: readonly FollowUpDecision[]) {
  return initial + decisions.reduce((sum, decision) => sum + extraDays(decision.choice), 0)
}

export function runStatus(run: Run) {
  if (run.lifecycle === 'closed' && run.closureSnapshot) return 'Avsluttet'
  return run.followUpDecisions?.some(({ choice }) => choice.kind !== 'none') ? 'Under oppfølging' : 'Pågående'
}

export function dailyFollowUp(run: Run, day: Day) {
  return run.followUpDecisions?.find(decision => decision.source === 'daily' && decision.dayId === day.id)
}

function confirmedAsLastDay(run: Run, day: Day) {
  // Dag 1 eksisterte allerede da en endagsplan ga det felles første- og siste-dagstilbudet.
  if (day.number === 1) return run.initialLastDay === 1
  const evaluation = day.driverEvaluation
  const offerRevision = evaluation?.offerPlanRevision
  if (offerRevision === undefined) return false
  const offeredLastDay = plannedDayAt(run, offerRevision)
  if (offeredLastDay !== undefined) return offeredLastDay === day.number
  // Eldre mellomdager kunne bare få tilbud når de var siste dag.
  return true
}

export function followUpWindow(run: Run, day: Day, source: FollowUpDecision['source'] = 'daily'): PlanWindow {
  const currentLastDay = currentPlan(run).lastDay
  const lastCreated = runDays(run).at(-1)!
  const withoutDecision = plannedLastDay(historyBase(run).lastDay, run.followUpDecisions ?? [])
    - (source === 'daily' ? extraDays(dailyFollowUp(run, day)?.choice) : 0)
  const minimumLastDay = lastCreated.driverConfirmation && !confirmedAsLastDay(run, lastCreated)
    && lastCreated.number < currentLastDay ? lastCreated.number + 1 : lastCreated.number
  return { withoutDecision, minimumLastDay }
}

function projectChoice(window: PlanWindow, choice: FollowUpChoice): FollowUpPreview {
  const proposed = window.withoutDecision + extraDays(choice)
  if (proposed > lastAllowedDay) {
    return { field: 'extraDays', message: 'Planen kan ha maksimalt fem dager.' } as const
  }
  if (proposed < window.minimumLastDay) {
    const field = choice.kind === 'days' ? 'extraDays' : choice.kind === 'training' ? 'type' : 'need'
    return { field, message: 'Forslaget gir en siste dag som ikke passer med opprettede dager og sjåførens bekreftelser.' } as const
  }
  return { choice, proposedLastDay: proposed as Day['number'] }
}

export function followUpInput(choice?: FollowUpChoice): FollowUpInput {
  switch (choice?.kind) {
    case 'none': return { need: 'no', type: '', extraDays: '' }
    case 'training': return { need: 'yes', type: 'training', extraDays: '' }
    case 'days': return { need: 'yes', type: 'days', extraDays: String(choice.extraDays) }
    default: return { need: '', type: '', extraDays: '' }
  }
}

export function previewFollowUp(window: PlanWindow, input: FollowUpInput): FollowUpPreview {
  if (input.need === '') return { field: 'need', message: 'Velg Ja eller Nei.' } as const
  if (input.need === 'no') return projectChoice(window, { kind: 'none' })
  if (input.type === '') return { field: 'type', message: 'Velg flere fadderdager eller utvidet kjøretrening.' } as const
  if (input.type === 'training') return projectChoice(window, { kind: 'training' })
  if (!/^[1-9]\d*$/.test(input.extraDays)) return { field: 'extraDays', message: 'Velg antall ekstra dager.' } as const
  return projectChoice(window, { kind: 'days', extraDays: Number(input.extraDays) })
}

export function availableExtraDays(window: PlanWindow) {
  return Array.from({ length: Math.max(0, lastAllowedDay - window.withoutDecision) }, (_, index) => index + 1)
    .filter(extraDays => window.withoutDecision + extraDays >= window.minimumLastDay)
}

function validChoice(choice: FollowUpChoice) {
  if (!choice || typeof choice !== 'object') return false
  const keys = Object.keys(choice)
  if (choice.kind === 'none' || choice.kind === 'training') return keys.length === 1 && keys[0] === 'kind'
  return choice.kind === 'days' && keys.length === 2 && Object.hasOwn(choice, 'extraDays')
    && Number.isSafeInteger(choice.extraDays) && choice.extraDays > 0
}

export function validateFollowUpCommand(command: SaveFollowUpCommand) {
  const { payload } = command
  const ids = [command.commandId, command.runId, command.actor?.id, payload?.dayId]
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1
    || !['daily', 'extension'].includes(payload?.source) || !validChoice(payload?.choice)
    || Object.keys(payload).some(key => !['dayId', 'source', 'choice'].includes(key))) {
    throw new AppError('invalid_command')
  }
  if (command.actor.role !== 'fadder') throw new AppError('wrong_role')
  if (payload.source === 'extension' && payload.choice.kind !== 'days') throw new AppError('validation')
}

export function saveFollowUp(run: Run, command: SaveFollowUpCommand): Run {
  validateFollowUpCommand(command)
  if (command.runId !== run.id) throw new AppError('run_missing')
  if (command.expectedRevision !== run.revision) throw new AppError('stale')
  const { dayId, source, choice } = command.payload
  const day = findDay(run, dayId)
  if (!day) throw new AppError('day_missing')
  if (run.lifecycle === 'closed' || (source === 'daily' && dayLocks(run, day).dayLocked)) throw new AppError('locked')
  if (source === 'extension' && !day.mentorConfirmation) throw new AppError('validation')
  const previousPlan = currentPlan(run)
  const base = historyBase(run)
  if (run.revision === Number.MAX_SAFE_INTEGER || previousPlan.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
  const projection = projectChoice(followUpWindow(run, day, source), choice)
  if ('field' in projection) throw new AppError<FollowUpInput>('validation', { [projection.field]: projection.message })
  const lastDay = projection.proposedLastDay
  if (source === 'extension' && lastDay <= previousPlan.lastDay) throw new AppError('validation')

  const previous = source === 'daily' ? dailyFollowUp(run, day) : undefined
  const decision: FollowUpDecision = { id: previous?.id ?? command.commandId, dayId, source, choice }
  const decisions = run.followUpDecisions ?? []
  const revision = previousPlan.revision + 1
  const event: PlanEvent = {
    decisionId: decision.id, dayId, dayNumber: day.number, date: day.date, source, choice,
    actor: { id: command.actor.id, role: 'fadder', name: day.mentorName }, commandId: command.commandId,
    oldLastDay: previousPlan.lastDay, newLastDay: lastDay, planRevision: revision,
  }
  return {
    ...run,
    revision: run.revision + 1,
    plan: { revision, lastDay },
    ...(base.revision > 1 && { planHistoryBase: base }),
    followUpDecisions: previous ? decisions.map(item => item.id === previous.id ? decision : item) : [...decisions, decision],
    planEvents: [...(run.planEvents ?? []), event],
  }
}

export function validateSavedPlan(run: Run) {
  const plan = currentPlan(run)
  const days = runDays(run)
  if (!Number.isSafeInteger(plan.revision) || plan.revision < 1 || ![1, 2, 3, 4, 5].includes(plan.lastDay)
    || plan.lastDay < Math.max(run.initialLastDay, days.length)
    || (plan.revision === 1 && plan.lastDay !== run.initialLastDay)) throw new AppError('storage_read')
  const { followUpDecisions: decisions, planEvents: events } = run
  // Story 1.4 kunne lese plansnapshots uten beslutninger eller hendelser.
  if (decisions === undefined && events === undefined && run.planHistoryBase === undefined) return
  if (!Array.isArray(decisions) || !Array.isArray(events) || !events.length) throw new AppError('storage_read')
  const base = historyBase(run)
  if (run.planHistoryBase !== undefined && (!run.planHistoryBase || !Number.isSafeInteger(base.revision)
    || base.revision < 2 || base.revision >= plan.revision || ![1, 2, 3, 4, 5].includes(base.lastDay)
    || base.lastDay < run.initialLastDay)) throw new AppError('storage_read')
  let { revision, lastDay } = base
  const active = new Map<string, FollowUpDecision>()
  const dailyIds = new Map<string, string>()
  const commandIds = new Set<string>()
  for (const event of events) {
    const day = event && findDay(run, event.dayId)
    if (!day || day.number !== event.dayNumber || !isCalendarDate(event.date) || !isId(event.actor?.id)
      || event.actor.role !== 'fadder' || !hasText(event.actor.name) || !isId(event.decisionId)
      || !isId(event.commandId) || commandIds.has(event.commandId) || !validChoice(event.choice)
      || ![1, 2, 3, 4, 5].includes(event.oldLastDay) || ![1, 2, 3, 4, 5].includes(event.newLastDay)
      || event.oldLastDay < day.number || event.newLastDay < day.number
      || event.oldLastDay !== lastDay || event.planRevision !== revision + 1) {
      throw new AppError('storage_read')
    }
    const previous = active.get(event.decisionId)
    if (!previous && event.decisionId !== event.commandId) throw new AppError('storage_read')
    if (event.source === 'daily') {
      const existingId = dailyIds.get(day.id)
      if ((existingId && existingId !== event.decisionId) || (previous && previous.dayId !== day.id)
        || (previous && previous.source !== 'daily')) throw new AppError('storage_read')
      dailyIds.set(day.id, event.decisionId)
    } else if (event.source !== 'extension' || previous || !day.mentorConfirmation || event.date !== day.date
      || event.choice.kind !== 'days' || event.newLastDay <= lastDay) throw new AppError('storage_read')
    active.set(event.decisionId, { id: event.decisionId, dayId: day.id, source: event.source, choice: event.choice })
    commandIds.add(event.commandId)
    revision = event.planRevision
    lastDay = event.newLastDay
    if (lastDay !== plannedLastDay(base.lastDay, [...active.values()])) throw new AppError('storage_read')
  }
  if (plan.revision !== revision || plan.lastDay !== lastDay || decisions.length !== active.size) throw new AppError('storage_read')
  for (const decision of decisions) {
    const expected = active.get(decision?.id)
    if (!expected || expected.dayId !== decision.dayId || expected.source !== decision.source
      || !validChoice(decision.choice) || expected.choice.kind !== decision.choice.kind
      || extraDays(expected.choice) !== extraDays(decision.choice)) throw new AppError('storage_read')
    active.delete(decision.id)
  }
}
