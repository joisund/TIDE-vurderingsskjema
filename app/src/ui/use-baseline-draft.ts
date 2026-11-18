import { useRef, useState } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { applyBaselineChanges } from '../domain/baseline.ts'
import type { BaselineChanges, BaselineDraftRow, SaveBaselineDraftCommand } from '../domain/baseline.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { useAutosaveDeadline } from './use-autosave-deadline.ts'

// Null er en uttrykkelig sletting av begrunnelsesutkastet frem til kvittering.
type Row = Omit<BaselineDraftRow, 'reasonDraft'> & { reasonDraft?: string | null }
type Rows = Record<string, Row>
type Stored = WorkspaceView & { selected: DayView }
type Problem = { error: unknown; conflict?: { stored?: Stored; readError?: unknown } }
type Draft = { saved: DayView; rows: Rows; writing: boolean; problem?: Problem }
type Options = {
  initial: DayView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
}

function rowsOf(day: DayView): Rows {
  const { answers, reasonDrafts } = day.baseline
  return Object.fromEntries(answers.map(({ criterionId, value, reason }) => [
    criterionId, { value, reason, reasonDraft: reasonDrafts[criterionId] },
  ]))
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

export function useBaselineDraft({ initial, actor, application, report, onSaved, onAdopt }: Options) {
  const [draft, setDraft] = useState<Draft>(() => ({ saved: initial, rows: rowsOf(initial), writing: false }))
  const current = useRef(draft)
  const deadline = useAutosaveDeadline()
  const active = useRef<Promise<boolean>>(undefined)
  const attempt = useRef<{ signature: string; command: SaveBaselineDraftCommand }>(undefined)
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
      if (!latest.selected) throw new AppError('storage_read')
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
    if (!state.saved.baseline.editable || state.problem?.conflict) return
    const previous = state.rows[id]
    const row = { ...previous, ...patch }
    if (sameAnswer(row, previous) && row.reasonDraft === previous.reasonDraft) return
    publish({ ...state, rows: { ...state.rows, [id]: row }, problem: undefined })
    schedule()
  }

  async function write(base: DayView, changes: BaselineChanges) {
    const signature = JSON.stringify([base.revision, changes])
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, command: application.newBaselineDraftCommand(actor, base.id, base.revision, changes) }
    }
    const { command } = attempt.current
    const submitted = current.current.rows
    deadline.reset()
    publish({ ...current.current, writing: true, problem: undefined })
    try {
      const receipt = await application.withOpenStorage(() => application.executeBaselineDraft(command))
      const saved = {
        ...base, revision: receipt.revision,
        baseline: { ...base.baseline, ...applyBaselineChanges(base.baseline, changes) },
      }
      const rows = { ...current.current.rows }
      for (const id of Object.keys(changes)) {
        if (rows[id] === submitted[id] && rows[id].reasonDraft === null) {
          rows[id] = { ...rows[id], reasonDraft: undefined }
        }
      }
      publish({ saved, rows, writing: false })
      onSaved(saved)
      if (Object.keys(changesSince(rows, rowsOf(saved))).length) schedule()
      else deadline.reset()
      return true
    } catch (error) {
      report(error)
      if (error instanceof AppError && error.code === 'command_conflict') attempt.current = undefined
      const conflict = error instanceof AppError && ['stale', 'locked', 'wrong_role', 'command_conflict'].includes(error.code)
        ? await readStored()
        : undefined
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
      const { saved, rows, problem } = current.current
      if (problem) return false
      const changes = changesSince(rows, rowsOf(saved))
      if (!Object.keys(changes).length) {
        deadline.reset()
        return true
      }
      const writing = write(saved, changes)
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
    if (conflict && (!stored || !matchesActor(stored) || !stored.selected.baseline.editable)) return
    if (stored) {
      const rows = reviewedRows(state.rows, rowsOf(state.saved), rowsOf(stored.selected))
      publish({ saved: stored.selected, rows, writing: false })
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
    publish({ saved, rows: rowsOf(saved), writing: false })
  }

  const conflict = draft.problem?.conflict
  const changed = changesSince(draft.rows, rowsOf(draft.saved))
  return {
    draft, changed, flush, update, retry, reloadConflict, adopt, readStored, conflict, reviewing,
    accept: (saved: DayView) => {
      reset(saved)
      onSaved(saved)
    },
    dirty: Boolean(draft.problem) || Object.keys(changed).length > 0,
    staleRole: Boolean(conflict?.stored && !matchesActor(conflict.stored)),
    cleanSnapshot: () => {
      const { saved, rows, writing, problem } = current.current
      return !writing && !problem && !Object.keys(changesSince(rows, rowsOf(saved))).length ? saved : undefined
    },
  }
}
