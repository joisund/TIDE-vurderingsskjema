import { useLayoutEffect, useRef, useState } from 'react'
import type { RunApplication, TechnicalView, WorkspaceView } from '../application/run-application.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { withTechnicalPointChange } from '../domain/technical-training.ts'
import type { PointChange, SaveTechnicalTraining, TechnicalHeader } from '../domain/technical-training.ts'
import { useAutosaveDeadline } from './use-autosave-deadline.ts'

type Changes = Required<SaveTechnicalTraining['payload']>
type PendingWrite = { command: SaveTechnicalTraining; changes: Changes }
type Draft = {
  saved: TechnicalView
  changes: Changes
  writing: boolean
  error?: unknown
  conflict?: { latest?: TechnicalView }
}

function emptyChanges(): Changes {
  return { header: {}, points: {} }
}

function hasChanges(changes: Changes) {
  return Object.keys(changes.header).length > 0 || Object.keys(changes.points).length > 0
}

export function matchesTechnicalView(latest: WorkspaceView, actor: Actor, initial: TechnicalView): latest is WorkspaceView & { technical: TechnicalView } {
  return latest.actor.id === actor.id && latest.actor.role === actor.role
    && latest.technical?.documentId === initial.documentId && latest.technical.driverRef === initial.driverRef
}

export function useTechnicalDraft(initial: TechnicalView, actor: Actor, application: RunApplication,
  report: (error: unknown) => void, suspended: boolean) {
  const deadline = useAutosaveDeadline()
  const [state, setState] = useState<Draft>(() => ({ saved: initial, changes: emptyChanges(), writing: false }))
  const current = useRef(state)
  const retry = useRef<PendingWrite>(undefined)
  const active = useRef<Promise<boolean>>(undefined)
  const suspendedNow = useRef(suspended)

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

  function updateHeader(field: keyof TechnicalHeader, value: string) {
    const { saved, changes, conflict } = current.current
    if (saved.status !== 'draft' || conflict || value === (changes.header[field] ?? saved.header[field])) return
    publish({ ...current.current, changes: { ...changes, header: { ...changes.header, [field]: value } }, error: undefined })
    schedule()
  }

  function updatePoint(id: string, change: PointChange) {
    const { saved, changes, conflict } = current.current
    if (actor.role !== 'sjåfør' || saved.status !== 'draft' || conflict) return
    const previous = changes.points[id]
    // En ikke anvendt dialogtekst kan lagres samtidig med en tidligere avkrysning.
    const edited = change.status === undefined ? { ...previous, ...change } : {
      ...(previous?.reasonDraft !== undefined && { reasonDraft: previous.reasonDraft }), ...change,
    }
    publish({ ...current.current, changes: { ...changes, points: { ...changes.points, [id]: edited } }, error: undefined })
    schedule()
  }

  function readWorkspace() {
    return application.withOpenStorage(() => application.read())
  }

  async function readLatest() {
    const latest = await readWorkspace()
    if (!matchesTechnicalView(latest, actor, initial)) throw new AppError('stale')
    return latest.technical
  }

  function setConflict(error: unknown, latest?: TechnicalView) {
    deadline.cancel()
    retry.current = undefined
    publish({ ...current.current, writing: false, error, conflict: { latest } })
  }

  async function write() {
    const { saved, changes } = current.current
    retry.current ??= {
      changes,
      command: application.newSaveTechnicalCommand(actor, saved, {
        ...(Object.keys(changes.header).length > 0 && { header: changes.header }),
        ...(Object.keys(changes.points).length > 0 && { points: changes.points }),
      }),
    }
    const attempt = retry.current
    deadline.reset()
    publish({ ...current.current, writing: true })
    try {
      const receipt = await application.withOpenStorage(() => application.executeTechnical(attempt.command))
      const latest = await readLatest()
      retry.current = undefined
      const pending = current.current.changes
      const remaining: Changes = {
        header: Object.fromEntries(Object.entries(pending.header).filter(([name, value]) =>
          attempt.changes.header[name as keyof TechnicalHeader] !== value)),
        points: Object.fromEntries(Object.entries(pending.points).filter(([id, value]) =>
          attempt.changes.points[id] !== value)),
      }
      publish({ saved: latest, changes: remaining, writing: false })
      if (hasChanges(remaining)) {
        if (receipt.revision !== latest.revision) {
          setConflict(new AppError('stale'), latest)
          return false
        }
        schedule()
      }
      return true
    } catch (error) {
      report(error)
      if (error instanceof AppError && ['stale', 'locked', 'wrong_role', 'command_conflict', 'technical_document_missing',
        'technical_version', 'technical_points', 'technical_incomplete'].includes(error.code)) {
        let latest: TechnicalView | undefined
        try {
          latest = await readLatest()
        } catch (readError) {
          report(readError)
        }
        setConflict(error, latest)
      } else publish({ ...current.current, writing: false, error })
      return false
    }
  }

  async function flush(drain = true) {
    deadline.cancel()
    if (!drain && active.current) return true
    while (true) {
      if (active.current) {
        if (!await active.current) return false
        continue
      }
      if (current.current.error || current.current.conflict) return false
      if (!retry.current && !hasChanges(current.current.changes)) {
        deadline.reset()
        return true
      }
      const writing = write()
      active.current = writing
      void writing.then(() => {
        if (active.current === writing) active.current = undefined
      })
      const written = await writing
      if (!written || !drain) return written
    }
  }

  function retrySave() {
    if (active.current || current.current.conflict) return
    publish({ ...current.current, error: undefined })
    void flush()
  }

  function restore(latest: TechnicalView) {
    if (active.current || current.current.saved.revision === latest.revision) return
    if (hasChanges(current.current.changes)) setConflict(new AppError('stale'), latest)
    else publish({ saved: latest, changes: emptyChanges(), writing: false })
  }

  async function discardConflict() {
    if (!current.current.conflict || active.current) return
    try {
      const latest = await readWorkspace()
      if (!matchesTechnicalView(latest, actor, initial)) return latest
      publish({ saved: latest.technical, changes: emptyChanges(), writing: false })
    } catch (error) {
      report(error)
      setConflict(error)
    }
  }

  const { changes, saved, writing, error, conflict } = state
  const visible = conflict?.latest ?? saved
  return {
    saved: visible,
    header: conflict ? visible.header : { ...saved.header, ...changes.header },
    points: conflict ? visible.points : saved.points.map(point => changes.points[point.id]
      ? withTechnicalPointChange(point, changes.points[point.id]) : point),
    writing, error, conflict, changes,
    dirty: writing || Boolean(error) || hasChanges(changes),
    hasLocalChanges: () => Boolean(active.current || current.current.error || hasChanges(current.current.changes)),
    updateHeader, updatePoint, flush, restore, retrySave, discardConflict, readLatest,
  }
}
