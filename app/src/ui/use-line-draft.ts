import { useLayoutEffect, useRef, useState } from 'react'
import type { LineTrainingView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import type { LineEntry, LineEntryChange, LineEntryFields, LineHeader, SaveLineTraining } from '../domain/line-training.ts'
import { useAutosaveDeadline } from './use-autosave-deadline.ts'

type EditableEntry = LineEntryFields & { entryId: string; status: 'draft' }
type Changes = { header: Partial<LineHeader>; entries: Map<string, LineEntryFields | null> }
type ReadRestriction = 'unreadable' | 'unverified'
type PendingWrite = { command: SaveLineTraining; changes: Changes }
type Draft = {
  saved: LineTrainingView; changes: Changes; writing: boolean; pendingWrite?: PendingWrite
  error?: unknown; conflict?: true; readRestriction?: ReadRestriction
}

function emptyChanges(): Changes {
  return { header: {}, entries: new Map() }
}

function hasChanges(changes: Changes) {
  return Boolean(Object.keys(changes.header).length || changes.entries.size)
}

function applyPendingEntries(entries: LineEntry[], changes: Changes): (LineEntry | EditableEntry)[] {
  const byId = new Map<string, LineEntry | EditableEntry>(entries.map(entry => [entry.entryId, entry]))
  for (const [entryId, fields] of changes.entries) {
    if (fields === null) byId.delete(entryId)
    else byId.set(entryId, { ...byId.get(entryId), entryId, ...fields, status: 'draft' })
  }
  return [...byId.values()]
}

function matchesLineContext(view: WorkspaceView, actor: Actor, expected: LineTrainingView) {
  const address = view.lineTraining ?? view.lineProblem
  return view.actor.id === actor.id && view.actor.role === actor.role
    && view.technicalDriverId === expected.driverRef && address?.documentId === expected.documentId
    && address.documentType === expected.documentType
}

export function matchesLineView(view: WorkspaceView, actor: Actor, expected: LineTrainingView): view is WorkspaceView & { lineTraining: LineTrainingView } {
  return matchesLineContext(view, actor, expected) && view.lineTraining?.driverRef === expected.driverRef
}

const conflicts = new Set(['stale', 'wrong_role', 'locked', 'command_conflict', 'line_document_missing', 'line_history', 'line_version', 'line_template'])

export function useLineDraft(initial: LineTrainingView, actor: Actor, application: RunApplication,
  report: (error: unknown) => void, suspended: boolean) {
  const [state, setState] = useState<Draft>(() => ({ saved: initial, changes: emptyChanges(), writing: false }))
  const current = useRef(state)
  const active = useRef<Promise<boolean>>(undefined)
  const suspendedNow = useRef(suspended)
  const deadline = useAutosaveDeadline()

  function publish(next: Draft) {
    current.current = next
    setState(next)
  }

  function schedule() {
    if (!suspendedNow.current) deadline.schedule(() => { void flush(false) })
  }

  useLayoutEffect(() => {
    suspendedNow.current = suspended
    if (suspended) deadline.cancel()
    else if (!current.current.error && hasChanges(current.current.changes)) schedule()
  }, [suspended])

  function updateHeader(field: keyof LineHeader, value: string) {
    const { saved, changes, conflict } = current.current
    if (actor.role !== 'instruktør' || saved.snapshots.length || conflict || suspendedNow.current) return
    publish({ ...current.current, changes: { ...changes, header: { ...changes.header, [field]: value } }, error: undefined })
    schedule()
  }

  function changeEntry(entryId: string, value: LineEntryFields | null) {
    const { saved, changes, conflict } = current.current
    if (actor.role !== 'sjåfør' || conflict || suspendedNow.current) return
    if (saved.entries.some(entry => entry.entryId === entryId && entry.status === 'confirmed')) return
    const entries = new Map(changes.entries)
    entries.set(entryId, value)
    publish({ ...current.current, changes: { ...changes, entries }, error: undefined })
    schedule()
  }

  function readWorkspace() {
    return application.withOpenStorage(() => application.read())
  }

  async function readLatest() {
    const latest = await readWorkspace()
    if (!matchesLineView(latest, actor, initial)) throw new AppError('stale')
    return latest.lineTraining
  }

  function setConflict(error: unknown, saved = current.current.saved, readRestriction?: ReadRestriction) {
    deadline.cancel()
    publish({ ...current.current, saved, writing: false, pendingWrite: undefined, error, conflict: true, readRestriction })
  }

  function startWrite() {
    const { saved, changes } = current.current
    const existing = new Set(saved.entries.map(entry => entry.entryId))
    const updates: LineEntryChange[] = []
    for (const [entryId, fields] of changes.entries) {
      if (fields === null) {
        if (existing.has(entryId)) updates.push({ entryId, kind: 'remove' })
      } else updates.push({ entryId, fields, kind: existing.has(entryId) ? 'edit' : 'add' })
    }
    const header = Object.keys(changes.header).length ? changes.header : undefined
    if (!header && !updates.length) return undefined
    return { changes, command: application.newSaveLineCommand(actor, saved, { header, ...(updates.length && { changes: updates }) }) }
  }

  async function write() {
    const attempt = current.current.pendingWrite ?? startWrite()
    deadline.reset()
    if (!attempt) {
      publish({ ...current.current, changes: emptyChanges(), writing: false })
      return true
    }
    publish({ ...current.current, writing: true, pendingWrite: attempt })
    try {
      const receipt = await application.withOpenStorage(() => application.executeLineTraining(attempt.command))
      const saved = await readLatest()
      if (current.current.readRestriction) return false
      const pending = current.current.changes
      const changes: Changes = {
        header: Object.fromEntries(Object.entries(pending.header).filter(([name, value]) =>
          attempt.changes.header[name as keyof LineHeader] !== value)),
        entries: new Map([...pending.entries].filter(([id, value]) => attempt.changes.entries.get(id) !== value)),
      }
      publish({ saved, changes, writing: false })
      if (!hasChanges(changes)) return true
      if (receipt.revision !== saved.revision) {
        setConflict(new AppError('stale'), saved)
        return false
      }
      schedule()
      return true
    } catch (error) {
      report(error)
      if (error instanceof AppError && conflicts.has(error.code)) {
        try {
          const workspace = await readWorkspace()
          if (matchesLineView(workspace, actor, initial)) setConflict(error, workspace.lineTraining)
          else if (matchesLineContext(workspace, actor, initial) && workspace.lineProblem) {
            setConflict(new AppError(workspace.lineProblem.error), undefined, 'unreadable')
          } else setConflict(error, undefined, 'unverified')
        } catch (readError) {
          report(readError)
          setConflict(error, undefined, 'unverified')
        }
      } else if (!current.current.readRestriction) {
        const pendingWrite = error instanceof AppError && error.code === 'line_clock' ? undefined : attempt
        publish({ ...current.current, writing: false, pendingWrite, error })
      }
      return false
    }
  }

  async function flush(drain = true) {
    deadline.cancel()
    if (active.current && !drain) return true
    while (true) {
      if (active.current) {
        if (!await active.current) return false
        continue
      }
      if (current.current.error || current.current.conflict) return false
      if (!current.current.pendingWrite && !hasChanges(current.current.changes)) {
        deadline.reset()
        return true
      }
      const attempt = write()
      active.current = attempt
      const stored = await attempt
      active.current = undefined
      if (!stored || !drain) return stored
    }
  }

  function retrySave() {
    if (active.current || current.current.conflict) return
    publish({ ...current.current, error: undefined })
    void flush()
  }

  function restore(latest: LineTrainingView) {
    if (active.current || (!current.current.readRestriction && current.current.saved.revision === latest.revision)) return
    if (hasChanges(current.current.changes)) setConflict(new AppError('stale'), latest)
    else publish({ saved: latest, changes: emptyChanges(), writing: false })
  }

  async function discardChanges() {
    if (active.current) return
    try {
      const latest = await readWorkspace()
      deadline.cancel()
      if (matchesLineView(latest, actor, initial)) publish({ saved: latest.lineTraining, changes: emptyChanges(), writing: false })
      return latest
    } catch (error) {
      report(error)
      setConflict(error, undefined, 'unverified')
    }
  }

  const { saved, changes, conflict, writing, pendingWrite, error, readRestriction } = state
  return {
    saved, changes, conflict, writing, error, readRestriction, dirty: writing || Boolean(error) || hasChanges(changes),
    pendingEntryChanges: pendingWrite?.changes.entries,
    header: conflict ? saved.header : { ...saved.header, ...changes.header },
    entries: conflict ? saved.entries : applyPendingEntries(saved.entries, changes),
    hasLocalChanges: () => Boolean(active.current || hasChanges(current.current.changes)),
    changeEntry, updateHeader, flush, retrySave, restore, readLatest, discardChanges,
    restoreReadError: (error: AppError) => setConflict(error, undefined, 'unreadable'),
  }
}
