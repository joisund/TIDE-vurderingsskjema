import { useRef, useState } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { BaselineDraftRow } from '../domain/baseline.ts'
import { followUpInput, previewFollowUp } from '../domain/follow-up.ts'
import type { FollowUpChoice, FollowUpInput, FollowUpReceipt, SaveFollowUpCommand } from '../domain/follow-up.ts'
import { applyMentorChanges } from '../domain/mentor-day.ts'
import type { MentorDayChanges, RelevanceReview, ReviewInput, ReviewRelevanceCommand, SaveMentorDayCommand } from '../domain/mentor-day.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { useAutosaveDeadline } from './use-autosave-deadline.ts'

export type MentorView = DayView & { mentorDay: NonNullable<DayView['mentorDay']> }
type Stored = WorkspaceView & { selected: DayView }
type Problem = { error: unknown; savedPlan?: FollowUpReceipt; conflict?: { latest?: Stored; readError?: unknown; roleBlocked?: true } }
// Null bevarer en uttrykkelig tømming av råteksten frem til kvittering.
type Row = Omit<BaselineDraftRow, 'reasonDraft'> & { reasonDraft?: string | null }
type ReviewAttempt = { id: string; input: ReviewInput; command?: ReviewRelevanceCommand }
type Draft = {
  saved: MentorView
  rows: Record<string, Row>
  comments: Record<string, string>
  rejectionDrafts: Record<string, string>
  followUp: FollowUpInput
  writing: boolean
  problem?: Problem
}
type Options = {
  initial: MentorView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
}

function draftOf(saved: MentorView): Draft {
  const { answers, reasonDrafts, comments, rejectionDrafts, followUp } = saved.mentorDay
  return {
    saved, writing: false,
    rows: Object.fromEntries(answers.map(({ criterionId, value, reason }) => [
      criterionId, { value, reason, reasonDraft: reasonDrafts[criterionId] },
    ])),
    comments: Object.fromEntries(Object.entries(comments).map(([id, comment]) => [id, comment?.text ?? ''])),
    rejectionDrafts: Object.fromEntries(Object.entries(rejectionDrafts).map(([id, text]) => [id, text ?? ''])),
    followUp: followUpInput(followUp.decision?.choice),
  }
}

function planChanged(draft: Draft) {
  const initial = followUpInput(draft.saved.mentorDay.followUp.decision?.choice)
  const { need, type, extraDays } = draft.followUp
  return need !== initial.need || type !== initial.type || extraDays !== initial.extraDays
}

function acknowledgePlan(saved: MentorView, receipt: FollowUpReceipt): MentorView {
  const { event, plan, window, status, revision } = receipt
  return {
    ...saved, status, revision, planRevision: plan.revision, plannedLastDay: plan.lastDay,
    plannedLastDate: saved.days.find(day => day.number === plan.lastDay)?.date,
    mentorDay: {
      ...saved.mentorDay,
      followUp: {
        decision: { id: event.decisionId, dayId: event.dayId, source: event.source, choice: event.choice },
        window,
        history: [...saved.mentorDay.followUp.history, event],
      },
    },
  }
}

function changedText(local: Draft['comments'], saved: Draft['comments']) {
  return Object.fromEntries(Object.entries(local).filter(([id, text]) => text !== (saved[id] ?? '')))
}

function changesSince(draft: Draft): MentorDayChanges {
  const saved = draftOf(draft.saved)
  const answers = Object.fromEntries(Object.entries(draft.rows).filter(([id, row]) => {
    const previous = saved.rows[id]
    return row.value !== previous.value || row.reason !== previous.reason || row.reasonDraft !== previous.reasonDraft
  }).map(([id, row]) => [id, { ...row, reasonDraft: row.reasonDraft ?? undefined }]))
  const comments = changedText(draft.comments, saved.comments)
  const rejectionDrafts = Object.fromEntries(Object.entries(draft.rejectionDrafts)
    .filter(([id, text]) => text !== saved.rejectionDrafts[id]))
  return {
    ...(Object.keys(answers).length && { answers }),
    ...(Object.keys(comments).length && { comments }),
    ...(Object.keys(rejectionDrafts).length && { rejectionDrafts }),
  }
}

export function useMentorDraft({ initial, actor, application, report, onSaved, onAdopt }: Options) {
  const [draft, setDraft] = useState(() => draftOf(initial))
  const [notice, setNotice] = useState('')
  const current = useRef(draft)
  const deadline = useAutosaveDeadline()
  const active = useRef<Promise<boolean>>(undefined)
  const draftAttempt = useRef<SaveMentorDayCommand>(undefined)
  const planAttempt = useRef<SaveFollowUpCommand>(undefined)
  const reviewAttempt = useRef<ReviewAttempt>(undefined)
  const [reviewing, setReviewing] = useState(false)
  const processing = useRef(false)
  const selection = { runId: initial.id, dayId: initial.dayId }

  function publish(next: Draft) {
    current.current = next
    setDraft(next)
  }

  function schedule() {
    deadline.schedule(() => { void flush(false) })
  }

  function updateRows(id: string, patch: Partial<Row>) {
    update({ rows: { ...current.current.rows, [id]: { ...current.current.rows[id], ...patch } } })
  }

  function updateText(field: 'comments' | 'rejectionDrafts', id: string, text: string) {
    update({ [field]: { ...current.current[field], [id]: text } })
  }

  function update(patch: Partial<Pick<Draft, 'rows' | 'comments' | 'rejectionDrafts' | 'followUp'>>) {
    const state = current.current
    if (!state.saved.mentorDay.editable || processing.current || state.problem?.conflict || reviewAttempt.current) return
    publish({ ...state, ...patch })
    if (!state.problem) schedule()
  }

  function updateFollowUp(followUp: FollowUpInput) {
    if (planAttempt.current || current.current.problem?.savedPlan) return
    update({ followUp })
  }

  function discardFollowUp() {
    if (planAttempt.current || processing.current) return
    updateFollowUp(followUpInput(current.current.saved.mentorDay.followUp.decision?.choice))
  }

  function matchesActor(stored: WorkspaceView) {
    return stored.actor.id === actor.id && stored.actor.role === actor.role
  }

  async function readStored(restoreRole = false): Promise<NonNullable<Problem['conflict']>> {
    try {
      const latest = await application.withOpenStorage(() => restoreRole
        ? application.changeRole(actor.role, selection)
        : application.read(selection))
      if (latest.blocked) return { readError: new AppError('wrong_role'), roleBlocked: true }
      if (latest.selected?.id !== selection.runId || latest.selected.dayId !== selection.dayId) throw new AppError('storage_read')
      return { latest: { ...latest, selected: latest.selected } }
    } catch (error) {
      report(error)
      return { readError: error }
    }
  }

  function adopt(latest: Stored) {
    const { selected } = latest
    if (selected.mentorDay && matchesActor(latest)) publish(draftOf({ ...selected, mentorDay: selected.mentorDay }))
    onAdopt(latest)
  }

  function accept(saved: MentorView) {
    publish(draftOf(saved))
    onSaved(saved)
  }

  function cleanSnapshot() {
    const state = current.current
    if (processing.current || active.current || state.problem || draftAttempt.current || planAttempt.current
      || reviewAttempt.current || planChanged(state) || Object.keys(changesSince(state)).length) return undefined
    return state.saved
  }

  function restoreLock(latest: Stored) {
    const state = current.current
    deadline.cancel()
    draftAttempt.current = undefined
    planAttempt.current = undefined
    reviewAttempt.current = undefined
    if (Object.keys(changesSince(state)).length || planChanged(state)) {
      publish({ ...state, writing: false, problem: { error: new AppError('locked'), conflict: { latest } } })
    } else adopt(latest)
  }

  async function handleFailure(error: unknown, review = false) {
    report(error)
    const stale = error instanceof AppError && ['stale', 'locked', 'wrong_role', 'command_conflict'].includes(error.code)
    if (!stale) {
      publish({ ...current.current, writing: false, problem: { error } })
      return false
    }
    draftAttempt.current = undefined
    planAttempt.current = undefined
    reviewAttempt.current = undefined
    const conflict = await readStored()
    const state = current.current
    if (review && conflict.latest && matchesActor(conflict.latest) && !Object.keys(changesSince(state)).length && !planChanged(state)) {
      adopt(conflict.latest)
      setNotice('Løpet ble endret. Relevansavgjørelsen ble ikke lagret. Kontroller det lagrede sjåførsvaret og velg på nytt.')
    } else publish({ ...state, writing: false, problem: { error, conflict } })
    return false
  }

  async function writeDraft(changes: MentorDayChanges) {
    deadline.reset()
    const { saved } = current.current
    publish({ ...current.current, writing: true })
    draftAttempt.current ??= application.newMentorDayCommand(actor, saved, changes)
    const command = draftAttempt.current
    try {
      const receipt = await application.withOpenStorage(() => application.executeMentorDay(command))
      draftAttempt.current = undefined
      const mentorDay = {
        ...saved.mentorDay,
        ...applyMentorChanges(saved.mentorDay, command.payload.changes, { ...actor, role: saved.context, name: saved.mentorDay.mentorName }),
      }
      const rows = { ...current.current.rows }
      for (const [id, sent] of Object.entries(command.payload.changes.answers ?? {})) {
        const mine = rows[id]
        if (mine.reasonDraft === null && sent.reasonDraft === undefined && mine.value === sent.value && mine.reason === sent.reason) {
          rows[id] = { ...mine, reasonDraft: undefined }
        }
      }
      const next = { ...current.current, saved: { ...saved, mentorDay, revision: receipt.revision }, rows, writing: false }
      publish(next)
      onSaved(next.saved)
      if (Object.keys(changesSince(next)).length || planChanged(next)) schedule()
      else deadline.reset()
      return true
    } catch (error) {
      return handleFailure(error)
    }
  }

  async function writePlan(choice: FollowUpChoice) {
    deadline.reset()
    const { saved } = current.current
    planAttempt.current ??= application.newFollowUpCommand(actor, saved, choice)
    const command = planAttempt.current
    publish({ ...current.current, writing: true })
    let receipt: FollowUpReceipt
    try {
      receipt = await application.withOpenStorage(() => application.executeFollowUp(command))
    } catch (error) {
      return handleFailure(error)
    }
    planAttempt.current = undefined
    const acknowledged = acknowledgePlan(saved, receipt)
    publish({ ...current.current, saved: acknowledged, writing: false })
    onSaved(acknowledged)
    return readAfterPlan(receipt)
  }

  async function readAfterPlan(receipt: FollowUpReceipt) {
    const { latest, readError } = await readStored()
    const state = current.current
    const mentorDay = latest?.selected.mentorDay
    const sameActor = Boolean(latest && matchesActor(latest))
    const commandFound = mentorDay?.followUp.history.some(event => event.commandId === receipt.event.commandId)
    if (!latest || (sameActor && !commandFound)) {
      publish({ ...state, writing: false, problem: { error: readError ?? new AppError('storage_read'), savedPlan: receipt } })
      return false
    }
    if (sameActor && mentorDay && latest.selected.revision === receipt.revision) {
      const next = { ...state, saved: { ...latest.selected, mentorDay }, writing: false, problem: undefined }
      publish(next)
      onAdopt(latest)
      if (Object.keys(changesSince(next)).length || planChanged(next)) schedule()
      else deadline.reset()
      return true
    }
    const hadReview = Boolean(reviewAttempt.current)
    reviewAttempt.current = undefined
    if (Object.keys(changesSince(state)).length || planChanged(state)) {
      publish({
        ...state, writing: false,
        problem: { error: new AppError('stale'), conflict: { latest }, savedPlan: receipt },
      })
      return false
    }
    adopt(latest)
    setNotice(hadReview
      ? 'Oppfølgingen ble lagret. Kontroller sjåførens svar på nytt før du behandler relevans.'
      : 'Oppfølgingen ble lagret. Løpet har siden blitt oppdatert.')
    return sameActor && !hadReview
  }

  async function flush(drain = true, duringReview = false) {
    deadline.cancel()
    if (processing.current && !duringReview) return false
    while (true) {
      if (active.current) {
        if (!drain) return true
        if (!await active.current) return false
        continue
      }
      const state = current.current
      if (state.problem || (reviewAttempt.current && !duringReview)) return false
      const changes = changesSince(state)
      const proposal = previewFollowUp(state.saved.mentorDay.followUp.window, state.followUp, state.saved.context)
      const choice = planAttempt.current?.payload.choice
        ?? (planChanged(state) && 'choice' in proposal ? proposal.choice : undefined)
      let writing: Promise<boolean>
      if (draftAttempt.current) {
        writing = writeDraft(changes)
      } else if (choice) {
        writing = writePlan(choice)
      } else if (Object.keys(changes).length) {
        writing = writeDraft(changes)
      } else {
        deadline.reset()
        return !planChanged(state) || !drain || duringReview
      }
      active.current = writing
      const result = await writing
      active.current = undefined
      if (!result || !drain) return result
    }
  }

  async function writeReview(command: ReviewRelevanceCommand) {
    const { saved } = current.current
    publish({ ...current.current, writing: true, problem: undefined })
    try {
      const receipt = await application.withOpenStorage(() => application.executeReview(command))
      reviewAttempt.current = undefined
      const { criterionId, answerId, answerRevision, decision, rejectionComment } = command.payload
      const previous = saved.mentorDay.relevance[criterionId]
      if (previous.state === 'not_applicable') throw new AppError('storage_read')
      const mentorActor = { ...actor, role: saved.context, name: saved.mentorDay.mentorName }
      const target = { answerId, answerRevision }
      const review: RelevanceReview = decision === 'accepted'
        ? { ...target, decision, actor: mentorActor } : { ...target, decision, rejectionComment, actor: mentorActor }
      const rejectionDrafts = { ...saved.mentorDay.rejectionDrafts }
      const localRejections = { ...current.current.rejectionDrafts }
      if (decision === 'rejected') {
        delete rejectionDrafts[criterionId]
        delete localRejections[criterionId]
      }
      const mentorDay = {
        ...saved.mentorDay, rejectionDrafts,
        relevance: {
          ...saved.mentorDay.relevance,
          [criterionId]: { state: decision, target, reason: previous.reason, review },
        },
      }
      const next = {
        ...current.current, saved: { ...saved, mentorDay, revision: receipt.revision },
        rejectionDrafts: localRejections, writing: false,
      }
      publish(next)
      onSaved(next.saved)
      return true
    } catch (error) {
      return handleFailure(error, true)
    }
  }

  async function review(id: string, input: ReviewInput, rejectionDraft?: string) {
    if (processing.current || reviewAttempt.current || current.current.problem || !current.current.saved.mentorDay.editable) return
    if (rejectionDraft !== undefined) updateText('rejectionDrafts', id, rejectionDraft)
    const attempt: ReviewAttempt = { id, input }
    reviewAttempt.current = attempt
    await finishReview(attempt)
  }

  async function finishReview(attempt: ReviewAttempt) {
    processing.current = true
    setReviewing(true)
    setNotice('')
    if (current.current.problem) publish({ ...current.current, problem: undefined })
    try {
      if (!attempt.command) {
        if (!await flush(true, true)) return
        attempt.command = application.newReviewCommand(actor, current.current.saved, attempt.id, attempt.input)
      }
      await writeReview(attempt.command)
    } finally {
      processing.current = false
      setReviewing(false)
    }
  }

  async function retry() {
    const problem = current.current.problem
    if (!problem || problem.conflict || processing.current || active.current) return
    if (problem.savedPlan) {
      const reading = readAfterPlan(problem.savedPlan)
      active.current = reading
      setReviewing(true)
      let refreshed: boolean
      try {
        refreshed = await reading
      } finally {
        active.current = undefined
        setReviewing(false)
      }
      if (refreshed && reviewAttempt.current) await finishReview(reviewAttempt.current)
    } else if (reviewAttempt.current) await finishReview(reviewAttempt.current)
    else {
      publish({ ...current.current, problem: undefined })
      await flush()
    }
  }

  async function refreshConflict(restoreRole = false) {
    if (processing.current || !current.current.problem?.conflict) return
    processing.current = true
    setReviewing(true)
    try {
      const conflict = await readStored(restoreRole)
      const state = current.current
      if (state.problem) publish({ ...state, problem: { ...state.problem, conflict } })
    } finally {
      processing.current = false
      setReviewing(false)
    }
  }

  async function resolveConflict(keepMine: boolean) {
    const state = current.current
    const latest = state.problem?.conflict?.latest
    if (!latest || processing.current) return
    setNotice('')
    if (!keepMine) {
      adopt(latest)
      return
    }
    const { selected } = latest
    if (!selected.mentorDay?.editable || !matchesActor(latest)) return
    const next = draftOf({ ...selected, mentorDay: selected.mentorDay })
    const saved = draftOf(state.saved)
    const changes = changesSince(state)
    const rows = { ...next.rows }
    for (const id of Object.keys(changes.answers ?? {})) {
      const mine = state.rows[id]
      const previous = saved.rows[id]
      rows[id] = {
        ...(mine.value !== previous.value || mine.reason !== previous.reason ? mine : rows[id]),
        reasonDraft: mine.reasonDraft !== previous.reasonDraft ? mine.reasonDraft : rows[id].reasonDraft,
      }
    }
    publish({
      ...next, rows, comments: { ...next.comments, ...changes.comments },
      rejectionDrafts: { ...next.rejectionDrafts, ...changes.rejectionDrafts },
      followUp: planChanged(state) ? state.followUp : next.followUp,
    })
    onSaved(next.saved)
    if (!planChanged(current.current)
      || 'choice' in previewFollowUp(selected.mentorDay.followUp.window, current.current.followUp, selected.context)) await flush()
  }

  async function refresh() {
    if (processing.current || reviewAttempt.current) return undefined
    processing.current = true
    setReviewing(true)
    try {
      // Et ufullstendig planutkast skal kunne vises som mangel sammen med det lagrede grunnlaget.
      if (!await flush(true, true)) return undefined
      const { latest } = await readStored()
      if (!latest) return undefined
      if (latest.selected.dayLocked && latest.selected.mentorDay && matchesActor(latest)) {
        restoreLock(latest)
        return { ...latest.selected, mentorDay: latest.selected.mentorDay }
      }
      const state = current.current
      if (planChanged(state)) {
        if (!matchesActor(latest) || latest.selected.revision !== state.saved.revision) {
          publish({ ...state, problem: { error: new AppError('stale'), conflict: { latest } } })
          return undefined
        }
      } else adopt(latest)
      setNotice('')
      if (latest.selected.mentorDay && matchesActor(latest)) return current.current.saved
    } finally {
      processing.current = false
      setReviewing(false)
    }
  }

  const changes = changesSince(draft)
  const conflict = draft.problem?.conflict
  const planDirty = planChanged(draft)
  const planPreview = previewFollowUp(draft.saved.mentorDay.followUp.window, draft.followUp, draft.saved.context)
  return {
    draft, changes, notice, conflict, reviewing, updateRows, updateText, flush, review, retry, refresh, refreshConflict, resolveConflict,
    readStored, adopt, accept, cleanSnapshot, restoreLock,
    staleRole: Boolean(conflict?.latest && !matchesActor(conflict.latest)),
    reviewPending: Boolean(reviewAttempt.current),
    planDirty, planPreview, updateFollowUp, discardFollowUp, planPending: Boolean(planAttempt.current),
    dirty: Boolean((draft.problem && !draft.problem.savedPlan) || Object.keys(changes).length
      || draftAttempt.current || reviewAttempt.current || planDirty),
  }
}
