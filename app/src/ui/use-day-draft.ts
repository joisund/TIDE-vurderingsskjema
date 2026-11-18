import { useRef, useState } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { dayFields } from '../domain/day-draft.ts'
import type { DayChanges, DayDraft, DayDraftErrors, DayField, SaveDayDraftCommand } from '../domain/day-draft.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'

import { useAutosaveDeadline } from './use-autosave-deadline.ts'

type StoredDay = WorkspaceView & { selected: DayView }
type Conflict = { stored?: StoredDay; readError?: unknown; edited: DayField[] }
type Problem = { error: AppError<DayDraft>; conflict?: Conflict }
type Draft = { saved: DayView; fields: DayDraft; writing: boolean; problem?: Problem }

type Options = {
  initial: DayView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
}

function changesSince(fields: DayDraft, base: DayDraft, scope: readonly DayField[] = dayFields) {
  const changes: DayChanges = {}
  for (const field of scope) {
    if (fields[field] !== base[field]) changes[field] = fields[field]
  }
  return changes
}

export function useDayDraft({ initial, actor, application, report, onSaved, onAdopt }: Options) {
  const [draft, setDraft] = useState<Draft>(() => ({ saved: initial, fields: initial.fields, writing: false }))
  const current = useRef(draft)
  const [reviewing, setReviewing] = useState(false)
  const deadline = useAutosaveDeadline()
  const active = useRef<Promise<boolean>>(undefined)
  const attempt = useRef<{ signature: string; command: SaveDayDraftCommand }>(undefined)
  const editVersions = useRef<Partial<Record<DayField, number>>>({})
  const selection = { runId: initial.id, dayId: initial.dayId }

  function publish(next: Draft) {
    current.current = next
    setDraft(next)
  }

  function matchesActor(stored: StoredDay) {
    return stored.actor.id === actor.id && stored.actor.role === actor.role
  }

  async function readStored(restoreRole = false): Promise<Pick<Conflict, 'stored' | 'readError'>> {
    try {
      const latest = await application.withOpenStorage(() => restoreRole
        ? application.changeRole(actor.role, selection)
        : application.read(selection))
      if (latest.blocked) return { readError: new AppError('wrong_role') }
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

  function update(field: DayField, value: string) {
    const state = current.current
    const conflict = state.problem?.conflict
    if (state.saved.access[field] !== 'editable'
      || (conflict?.stored && conflict.stored.selected.access[field] !== 'editable')) return
    if (state.fields[field] === value) return
    editVersions.current[field] = (editVersions.current[field] ?? 0) + 1
    const fields = { ...state.fields, [field]: value }
    if (conflict) {
      const edited = conflict.edited.includes(field) ? conflict.edited : [...conflict.edited, field]
      publish({ ...state, fields, problem: { error: state.problem!.error, conflict: { ...conflict, edited } } })
      return
    }
    publish({ ...state, fields, problem: undefined })
    schedule()
  }

  async function write(base: DayView, changes: DayChanges) {
    const signature = JSON.stringify([base.revision, changes])
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, command: application.newDayDraftCommand(actor, selection, base.revision, changes) }
    }
    const { command } = attempt.current
    const versions = { ...editVersions.current }
    deadline.reset()
    publish({ ...current.current, writing: true })
    try {
      const receipt = await application.withOpenStorage(() => application.executeDayDraft(command))
      const state = current.current
      const savedFields = { ...base.fields, ...changes }
      const saved = { ...base, fields: savedFields, revision: receipt.revision }
      const fields = state.problem?.conflict ? { ...savedFields } : state.fields
      if (state.problem?.conflict) {
        for (const field of dayFields) {
          if (versions[field] !== editVersions.current[field]) fields[field] = state.fields[field]
        }
      }
      publish({ saved, fields, writing: false })
      onSaved(saved)
      if (Object.keys(changesSince(fields, savedFields)).length > 0) schedule()
      else deadline.reset()
      return true
    } catch (failure) {
      report(failure)
      const error = failure instanceof AppError ? failure as AppError<DayDraft> : new AppError<DayDraft>('storage_write')
      if (error.code === 'command_conflict') attempt.current = undefined
      const shouldRead = ['stale', 'locked', 'wrong_role', 'command_conflict'].includes(error.code)
      const latest = shouldRead ? await readStored() : undefined
      const state = current.current
      const previous = state.problem?.conflict
      if (error.code === 'validation' && error.fields.date && state.fields.date !== changes.date) {
        const fields = previous ? { ...base.fields } : state.fields
        if (previous) {
          for (const field of previous.edited) fields[field] = state.fields[field]
        }
        publish({ saved: base, fields, writing: false })
        if (previous) onSaved(base)
        schedule()
        return false
      }
      const conflict = latest
        ? { ...latest, edited: previous?.edited ?? Object.keys(changesSince(state.fields, state.saved.fields)) as DayField[] }
        : previous
      publish({ ...state, writing: false, problem: { error, conflict } })
      return false
    }
  }

  function startWrite(base: DayView, changes: DayChanges) {
    const writing = write(base, changes)
    active.current = writing
    void writing.then(() => {
      if (active.current === writing) active.current = undefined
    })
    return writing
  }

  async function flush(drain = true) {
    deadline.cancel()
    if (!drain && active.current) return true
    while (true) {
      if (active.current) {
        if (!await active.current) return false
        continue
      }
      const { saved, fields, problem } = current.current
      if (problem) return false
      const changes = changesSince(fields, saved.fields)
      if (Object.keys(changes).length === 0) {
        deadline.reset()
        return true
      }
      const written = await startWrite(saved, changes)
      if (!written || !drain) return written
    }
  }

  async function reloadConflict(restoreRole = false) {
    const { problem } = current.current
    if (!problem?.conflict || reviewing) return
    setReviewing(true)
    const stored = await readStored(restoreRole)
    const latest = current.current
    const conflict = latest.problem?.conflict
    if (latest.problem && conflict) {
      publish({ ...latest, problem: { ...latest.problem, conflict: { edited: conflict.edited, ...stored } } })
    }
    setReviewing(false)
  }

  function adoptStored() {
    const stored = current.current.problem?.conflict?.stored
    if (!stored || active.current) return
    attempt.current = undefined
    deadline.reset()
    publish({ saved: stored.selected, fields: stored.selected.fields, writing: false })
    onAdopt(stored)
  }

  function adoptLocked() {
    const state = current.current
    const conflict = state.problem?.conflict
    const stored = conflict?.stored
    if (active.current || !state.problem || !conflict || !stored || !matchesActor(stored)) return
    const fields = { ...state.fields }
    const edited = conflict.edited.filter(field => {
      if (stored.selected.access[field] === 'editable') return true
      fields[field] = stored.selected.fields[field]
      return false
    })
    publish({ ...state, fields, problem: { ...state.problem, conflict: { ...conflict, edited } } })
  }

  function retry() {
    const state = current.current
    if (active.current || !state.problem) return
    const conflict = state.problem.conflict
    if (conflict) {
      const { stored, edited } = conflict
      if (!stored || !matchesActor(stored)
        || edited.some(field => stored.selected.access[field] !== 'editable' && state.fields[field] !== stored.selected.fields[field])) return
      const changes = changesSince(state.fields, stored.selected.fields, edited)
      if (Object.keys(changes).length > 0) {
        void startWrite(stored.selected, changes)
      } else adoptStored()
      return
    }
    const changes = changesSince(state.fields, state.saved.fields)
    if (Object.keys(changes).length > 0) {
      void startWrite(state.saved, changes)
    } else publish({ ...state, problem: undefined })
  }

  const conflict = draft.problem?.conflict
  const access = { ...draft.saved.access }
  if (conflict?.stored) {
    for (const field of dayFields) {
      const latest = conflict.stored.selected.access[field]
      if (latest === 'locked' || access[field] === 'editable') access[field] = latest
    }
  }
  const conflictingLocks = Boolean(conflict?.stored && conflict.edited.some(
    field => access[field] !== 'editable' && draft.fields[field] !== conflict.stored?.selected.fields[field],
  ))
  const editableConflictChanges = Boolean(conflict?.stored && conflict.edited.some(
    field => access[field] === 'editable' && draft.fields[field] !== conflict.stored?.selected.fields[field],
  ))
  const dirty = Boolean(draft.problem) || Object.keys(changesSince(draft.fields, draft.saved.fields)).length > 0
  const validation: DayDraftErrors = draft.problem?.error.code === 'validation' ? draft.problem.error.fields : {}
  return {
    draft, access, dirty, validation, conflict, conflictingLocks, editableConflictChanges, reviewing,
    staleRole: Boolean(conflict?.stored && !matchesActor(conflict.stored)),
    update, flush, retry, adoptStored, adoptLocked, reloadConflict,
  }
}
