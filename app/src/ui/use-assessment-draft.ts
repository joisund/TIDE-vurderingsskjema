import { useRef, useState } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { applyBaselineChanges, checkBaselineAnswers } from '../domain/baseline.ts'
import type { BaselineChanges, BaselineDraftRow, SaveBaselineDraftCommand } from '../domain/baseline.ts'
import { applyEvaluationChanges, evaluationFields } from '../domain/driver-day.ts'
import type { DriverDayChanges, EvaluationTexts, SaveDriverDayDraftCommand } from '../domain/driver-day.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { useAutosaveDeadline } from './use-autosave-deadline.ts'

// Null er en uttrykkelig sletting av begrunnelsesutkastet frem til kvittering.
type Row = Omit<BaselineDraftRow, 'reasonDraft'> & { reasonDraft?: string | null }
type Rows = Record<string, Row>
type Stored = WorkspaceView & { selected: DayView }
type Problem = { error: unknown; conflict?: { stored?: Stored; readError?: unknown } }
type EvaluationChanges = NonNullable<DriverDayChanges['evaluation']>
type Decision = EvaluationChanges['decision']
type Draft = {
  saved: DayView; rows: Rows; texts: EvaluationTexts; decision?: Decision; previousOfferRevision?: number
  markOffer?: true
  writing: boolean; problem?: Problem
}
export type AssessmentPhase = 'before' | 'driver_after'
type Options = {
  initial: DayView
  phase: AssessmentPhase
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
}

export function assessmentOf(day: DayView, phase: AssessmentPhase) {
  const assessment = phase === 'before' ? day.baseline : day.driverAfter
  if (!assessment) throw new AppError('storage_read')
  return assessment
}

function rowsOf(day: DayView, phase: AssessmentPhase): Rows {
  const { answers, reasonDrafts } = assessmentOf(day, phase)
  return Object.fromEntries(answers.map(({ criterionId, value, reason }) => [
    criterionId, { value, reason, reasonDraft: reasonDrafts[criterionId] },
  ]))
}

function textsOf(day: DayView) {
  return day.driverAfter?.evaluation?.texts ?? day.driverAfter?.evaluationDraft?.texts ?? {}
}

export function evaluationDecisionOf(day: DayView): Decision {
  const draft = day.driverAfter?.evaluationDraft
  return draft?.offerPlanRevision === day.planRevision && day.driverAfter?.evaluationOffered ? draft?.decision : undefined
}

function draftOf(saved: DayView, phase: AssessmentPhase): Draft {
  return {
    saved, rows: rowsOf(saved, phase), writing: false,
    texts: phase === 'driver_after' ? textsOf(saved) : {},
    decision: phase === 'driver_after' ? evaluationDecisionOf(saved) : undefined,
  }
}

function changedTexts(texts: EvaluationTexts, saved: EvaluationTexts): EvaluationTexts {
  return Object.fromEntries(evaluationFields.filter(field => (texts[field] ?? '') !== (saved[field] ?? ''))
    .map(field => [field, texts[field] ?? '']))
}

function draftChanges(state: Draft, phase: AssessmentPhase): DriverDayChanges {
  const answers = changesSince(state.rows, rowsOf(state.saved, phase))
  if (phase === 'before') return Object.keys(answers).length ? { answers } : {}
  const texts = changedTexts(state.texts, textsOf(state.saved))
  const written = Object.keys(texts).length > 0
  const choice = state.decision !== evaluationDecisionOf(state.saved)
  return {
    ...(Object.keys(answers).length && { answers }),
    ...((written || choice || state.markOffer) && { evaluation: {
      texts: written ? texts : undefined,
      decision: choice ? state.decision : undefined,
      previousOfferRevision: written ? state.previousOfferRevision : undefined,
      markOffer: state.markOffer,
    } }),
  }
}

function sameAnswer(a: Row, b: Row) {
  return a.value === b.value && a.reason === b.reason
}

function changesSince(rows: Rows, saved: Rows): BaselineChanges {
  return Object.fromEntries(Object.entries(rows).filter(([id, row]) =>
    !sameAnswer(row, saved[id]) || row.reasonDraft !== saved[id].reasonDraft).map(([id, row]) => [
    id, { ...row, reasonDraft: row.reasonDraft ?? undefined },
  ]))
}

function reviewedRows(local: Rows, previous: Rows, stored: Rows): Rows {
  return Object.fromEntries(Object.entries(stored).map(([id, storedRow]) => {
    const localRow = local[id]
    const previousRow = previous[id]
    const answer = sameAnswer(localRow, previousRow) && localRow.reasonDraft !== null ? storedRow : localRow
    return [id, {
      value: answer.value,
      reason: answer.reason,
      reasonDraft: localRow.reasonDraft === previousRow.reasonDraft ? storedRow.reasonDraft : localRow.reasonDraft,
    }]
  }))
}

export function useAssessmentDraft({ initial, phase, actor, application, report, onSaved, onAdopt }: Options) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial, phase))
  const current = useRef(draft)
  const deadline = useAutosaveDeadline()
  const active = useRef<Promise<boolean>>(undefined)
  const attempt = useRef<{ changes: DriverDayChanges; command: SaveBaselineDraftCommand | SaveDriverDayDraftCommand }>(undefined)
  const [reviewing, setReviewing] = useState(false)
  const selection = { runId: initial.id, dayId: initial.dayId }

  function publish(next: Draft) {
    current.current = next
    setDraft(next)
  }

  function matchesActor(stored: Stored) {
    return stored.actor.id === actor.id && stored.actor.role === actor.role
  }

  async function readStored(restoreRole = false): Promise<NonNullable<Problem['conflict']>> {
    try {
      const latest = await application.withOpenStorage(() => restoreRole
        ? application.changeRole(actor.role, selection)
        : application.read(selection))
      if (latest.blocked) return { readError: new AppError('wrong_role') }
      if (!latest.selected || (phase === 'driver_after' && !latest.selected.driverAfter)) throw new AppError('storage_read')
      return { stored: { ...latest, selected: latest.selected } }
    } catch (error) {
      report(error)
      return { readError: error }
    }
  }

  function schedule() {
    deadline.schedule(() => { void flush(false) })
  }

  function update(id: string, patch: Partial<Row>) {
    const state = current.current
    if (!assessmentOf(state.saved, phase).editable || state.problem?.conflict) return
    const previous = state.rows[id]
    const row = { ...previous, ...patch }
    if (sameAnswer(row, previous) && row.reasonDraft === previous.reasonDraft) return
    publish({ ...state, rows: { ...state.rows, [id]: row }, problem: undefined })
    schedule()
  }

  function updateEvaluation(patch: Pick<Draft, 'texts' | 'decision'>) {
    const state = current.current
    if (!state.saved.driverAfter?.editable || !state.saved.driverAfter.evaluationOffered || state.problem?.conflict) return
    const texts = { ...state.texts, ...patch.texts }
    const decision = patch.decision ?? state.decision
    publish({ ...state, texts, decision, problem: undefined })
    schedule()
  }

  function markEvaluationOffer() {
    const state = current.current
    const after = state.saved.driverAfter
    if (!after?.editable || !after.evaluationOffered || after.evaluationDraft?.offerPlanRevision === state.saved.planRevision) return
    publish({ ...state, markOffer: true })
  }

  async function write(base: DayView, changes: DriverDayChanges) {
    deadline.reset()
    publish({ ...current.current, writing: true, problem: undefined })
    if (attempt.current && JSON.stringify(attempt.current.changes) !== JSON.stringify(changes)) {
      const latest = await readStored()
      const stored = latest.stored
      if (!stored) {
        publish({ ...current.current, writing: false, problem: { error: latest.readError } })
        return false
      }
      attempt.current = undefined
      if (!matchesActor(stored) || stored.selected.revision !== base.revision || stored.selected.planRevision !== base.planRevision) {
        publish({ ...current.current, writing: false, problem: { error: new AppError('stale'), conflict: latest } })
        return false
      }
      changes = draftChanges(current.current, phase)
      if (!Object.keys(changes).length) {
        publish({ ...current.current, writing: false })
        return true
      }
    }
    attempt.current ??= { changes, command: phase === 'before'
      ? application.newBaselineDraftCommand(actor, base.id, base.revision, changes.answers!)
      : application.newDriverDayDraftCommand(actor, base, changes) }
    const sent = attempt.current
    try {
      const receipt = await application.withOpenStorage(() => 'dayId' in sent.command.payload
        ? application.executeDriverDayDraft(sent.command as SaveDriverDayDraftCommand)
        : application.executeBaselineDraft(sent.command as SaveBaselineDraftCommand))
      attempt.current = undefined
      const saved = { ...base, revision: receipt.revision }
      const applied = sent.changes.answers
      const evaluation = sent.changes.evaluation
      if (phase === 'before' && applied) saved.baseline = { ...base.baseline, ...applyBaselineChanges(base.baseline, applied) }
      if (phase === 'driver_after' && base.driverAfter) {
        const answers = applied ? applyBaselineChanges(base.driverAfter, applied) : base.driverAfter
        const issues = checkBaselineAnswers(answers.answers, base.day === 1 ? base.baseline.answers : undefined)
        const offeredAndComplete = base.driverAfter.evaluationOffered && !Object.keys(issues).length
        saved.driverAfter = {
          ...base.driverAfter, ...answers,
          ...(evaluation && { evaluationDraft: applyEvaluationChanges(base.driverAfter.evaluationDraft,
            evaluation, offeredAndComplete ? base.planRevision : evaluation.previousOfferRevision ?? base.planRevision) }),
        }
      }
      const rows = { ...current.current.rows }
      for (const [id, row] of Object.entries(applied ?? {})) {
        if (sameAnswer(rows[id], row) && row.reasonDraft === undefined && rows[id].reasonDraft === null) {
          rows[id] = { ...rows[id], reasonDraft: undefined }
        }
      }
      const next = { ...current.current, saved, rows, writing: false }
      if (evaluation?.markOffer) next.markOffer = undefined
      if (evaluation?.previousOfferRevision && !Object.keys(changedTexts(next.texts, textsOf(saved))).length) {
        next.previousOfferRevision = undefined
      }
      publish(next)
      onSaved(saved)
      if (Object.keys(draftChanges(next, phase)).length) schedule()
      else deadline.reset()
      return true
    } catch (error) {
      report(error)
      const conflict = error instanceof AppError && ['stale', 'locked', 'wrong_role', 'command_conflict'].includes(error.code)
        ? await readStored()
        : undefined
      if (conflict || (error instanceof AppError && ['invalid_command', 'validation'].includes(error.code))) attempt.current = undefined
      publish({ ...current.current, writing: false, problem: { error, conflict } })
      return false
    }
  }

  async function flush(drain = true) {
    deadline.cancel()
    if (!drain && active.current) return true
    if (reviewing) return false
    while (true) {
      if (active.current) {
        if (!await active.current) return false
        continue
      }
      const state = current.current
      if (state.problem) return false
      const changes = draftChanges(state, phase)
      if (!attempt.current && !Object.keys(changes).length) {
        deadline.reset()
        return true
      }
      const writing = write(state.saved, changes)
      active.current = writing
      const result = await writing
      active.current = undefined
      if (!result || !drain) return result
    }
  }

  async function retry() {
    const state = current.current
    if (!state.problem || reviewing || active.current) return
    const { conflict } = state.problem
    const stored = conflict?.stored
    if (conflict && (!stored || !matchesActor(stored) || !assessmentOf(stored.selected, phase).editable)) return
    if (stored) {
      const latest = draftOf(stored.selected, phase)
      const rows = reviewedRows(state.rows, rowsOf(state.saved, phase), latest.rows)
      const planChanged = stored.selected.planRevision !== state.saved.planRevision
      const offered = latest.saved.driverAfter?.evaluationOffered
      const complete = Object.keys(checkBaselineAnswers(assessmentOf(latest.saved, phase).answers
        .map(answer => ({ ...answer, ...rows[answer.criterionId] })),
      phase === 'driver_after' && latest.saved.day === 1 ? latest.saved.baseline.answers : undefined)).length === 0
      publish({
        ...latest, rows,
        ...(phase === 'driver_after' && {
          texts: { ...latest.texts, ...changedTexts(state.texts, textsOf(state.saved)) },
          decision: planChanged || !complete || !offered || state.decision === evaluationDecisionOf(state.saved) ? latest.decision : state.decision,
          previousOfferRevision: offered && complete ? undefined : state.previousOfferRevision ?? (planChanged ? state.saved.planRevision : undefined),
        }),
      })
      onSaved(stored.selected)
    } else publish({ ...state, problem: undefined })
    await flush()
  }

  async function reloadConflict(restoreRole = false) {
    if (!current.current.problem?.conflict || reviewing) return
    setReviewing(true)
    const conflict = await readStored(restoreRole)
    const state = current.current
    if (state.problem) publish({ ...state, problem: { error: state.problem.error, conflict } })
    setReviewing(false)
  }

  function adopt(stored: Stored) {
    if (active.current) return
    reset(stored.selected)
    onAdopt(stored)
  }

  function reset(saved: DayView) {
    deadline.cancel()
    deadline.reset()
    attempt.current = undefined
    publish(draftOf(saved, phase))
  }

  const conflict = draft.problem?.conflict
  const changed = draftChanges(draft, phase)
  return {
    draft, changed, flush, update, updateEvaluation, markEvaluationOffer, retry, reloadConflict, adopt, readStored, conflict, reviewing,
    accept: (saved: DayView) => {
      reset(saved)
      onSaved(saved)
    },
    dirty: Boolean(draft.problem || attempt.current) || Object.keys(changed).length > 0,
    staleRole: Boolean(conflict?.stored && !matchesActor(conflict.stored)),
    cleanSnapshot: () => {
      const state = current.current
      return !state.writing && !state.problem && !attempt.current && !Object.keys(draftChanges(state, phase)).length
        ? state.saved : undefined
    },
  }
}
