import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import { mentorDayConfirmationView } from '../application/run-application.ts'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { DayField } from '../domain/day-draft.ts'
import { availableExtraDays, previewFollowUp } from '../domain/follow-up.ts'
import { mentorAssessmentIssues } from '../domain/mentor-day.ts'
import type { ConfirmMentorDayCommand, MentorDayReceipt, ReviewTarget } from '../domain/mentor-day.ts'
import { reasonRequirement, validateReason } from '../domain/reason.ts'
import type { Actor, Criterion } from '../domain/run.ts'
import { AssessmentMatrix, Modal } from './AssessmentMatrix.tsx'
import { answerText, focusMatrixField } from './assessment-fields.ts'
import { CalendarDate, ConfirmationTime } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'
import { FollowUpConflict, FollowUpForm } from './FollowUpForm.tsx'
import { useMentorDraft } from './use-mentor-draft.ts'
import type { MentorView } from './use-mentor-draft.ts'

type Props = {
  ref: Ref<MentorAssessmentHandle>
  initial: MentorView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
  onDayField: (field: DayField) => void
  onDriverPart: (part: 'baseline' | 'after') => void
  navigating: boolean
}

export type MentorAssessmentHandle = {
  flush: () => Promise<boolean>
  restoreLock?: (latest: WorkspaceView & { selected: DayView }) => void
}

type Dialog = { criterion: Criterion; trigger: HTMLElement } & (
  { kind: 'help' } | { kind: 'reason' }
  | { kind: 'reject'; target: ReviewTarget; driverReason: string; driverName: string }
)

export function MentorAssessmentForm({ ref, navigating, ...options }: Props) {
  const editor = useMentorDraft(options)
  const { draft, changes, conflict, notice, reviewing } = editor
  const { saved, rows, comments, rejectionDrafts } = draft
  const { mentorDay } = saved
  const [dialog, setDialog] = useState<Dialog>()
  const [confirmDialog, setConfirmDialog] = useState<{ snapshot: MentorView; trigger: HTMLElement }>()
  const [confirmationIssue, setConfirmationIssue] = useState('')
  const [unresolved, setUnresolved] = useState<ConfirmMentorDayCommand>()
  const [confirming, setConfirming] = useState(false)
  const confirmingRef = useRef(false)
  const lockedStatus = useRef<HTMLParagraphElement>(null)
  const checkButton = useRef<HTMLButtonElement>(null)
  const focusLock = useRef(false)
  const focusOpen = useRef(false)
  const checkingRef = useRef(false)
  const [planNavigationBlocked, setPlanNavigationBlocked] = useState(false)
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [completeness, setCompleteness] = useState<'checking' | 'failed' | 'checked'>()
  const [reasonError, setReasonError] = useState(false)
  const issueHeading = useRef<HTMLHeadingElement>(null)
  const focusCheck = useRef(false)
  const section = useRef<HTMLElement>(null)
  const reasonField = useRef<HTMLTextAreaElement>(null)
  const reviewFocus = useRef<{ id: string; trigger: HTMLElement }>(undefined)
  const canEdit = mentorDay.editable && !conflict
  const busy = navigating || reviewing || confirming
  const blocked = busy || editor.reviewPending || Boolean(unresolved)
  const showIssues = completeness === 'checked'
  const issues = mentorAssessmentIssues(
    mentorDay.answers.map(answer => ({ ...answer, ...rows[answer.criterionId] })),
    mentorDay.relevance,
    Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, row.reasonDraft ?? undefined])),
  )
  const answerIssues = showIssues
    ? Object.fromEntries(issues.filter(issue => issue.field !== 'review').map(issue => [issue.criterionId, issue.message])) : {}
  const reviewIssues = showIssues
    ? Object.fromEntries(issues.filter(issue => issue.field === 'review').map(issue => [issue.criterionId, issue.message])) : {}
  const answered = Object.values(rows).filter(row => row.value !== null).length
  const reviewCount = issues.filter(issue => issue.field === 'review').length
  const previous = conflict?.latest?.selected.mentorDay
  const confirmation = previous?.confirmation ?? mentorDay.confirmation
  const planView = previous && conflict?.latest ? { ...conflict.latest.selected, mentorDay: previous } : saved
  const conflictProposal = previous && editor.planDirty && previewFollowUp(previous.followUp.window, draft.followUp)
  const planBlocked = !canEdit || blocked || Boolean(draft.problem?.savedPlan || (draft.problem && editor.planPending))
  const planIssue = 'field' in editor.planPreview ? editor.planPreview : undefined
  const completion = mentorDay.completion
  const fieldIssues = Object.entries(completion?.fields ?? {}) as [DayField, string][]
  const hasIssues = Boolean(issues.length || planIssue || fieldIssues.length || !mentorDay.driverReady)
  const status = draft.writing ? 'Lagrer …'
    : draft.problem?.savedPlan ? (editor.dirty ? 'Oppfølgingen er lagret. Andre endringer er ikke lagret.' : 'Lagret på denne enheten')
    : draft.problem ? 'Ulagrede endringer'
    : editor.planDirty && planIssue ? 'Ufullstendig planutkast · Fullfør eller forkast utkastet før du går videre.'
    : editor.dirty ? 'Lagrer …' : 'Lagret på denne enheten'
  const retryLabel = draft.problem?.savedPlan ? 'Les lagrede opplysninger på nytt' : 'Prøv igjen'
  const modalStatus = confirmDialog || (dialog && dialog.kind !== 'help')

  useImperativeHandle(ref, () => ({
    flush: () => confirmingRef.current || unresolved ? Promise.resolve(false) : editor.flush(),
    restoreLock: latest => {
      focusLock.current = true
      focusCheck.current = false
      setDialog(undefined)
      setConfirmDialog(undefined)
      setCompleteness(undefined)
      setUnresolved(undefined)
      setConfirmationIssue('')
      editor.restoreLock(latest)
    },
  }))
  useLayoutEffect(() => {
    if (confirmation && focusLock.current) {
      focusLock.current = false
      lockedStatus.current?.focus()
    }
  }, [confirmation, completeness])
  useLayoutEffect(() => {
    if (!confirmDialog && !unresolved && focusOpen.current) {
      focusOpen.current = false
      checkButton.current?.focus()
    }
  }, [confirmDialog, unresolved])
  useLayoutEffect(() => {
    if (completeness && focusCheck.current) {
      focusCheck.current = false
      issueHeading.current?.focus()
    }
  }, [completeness])

  useLayoutEffect(() => {
    const focus = reviewFocus.current
    if (reviewing || editor.reviewPending || !focus) return
    reviewFocus.current = undefined
    const active = document.activeElement
    if ((!focus.trigger.isConnected || focus.trigger.getAttribute('aria-disabled') === 'true')
      && (active === document.body || active === focus.trigger || active === section.current)) {
      focusMatrixField(`comment-trigger-${focus.id}`)
    }
  }, [reviewing, editor.reviewPending])

  useLayoutEffect(() => {
    if (reasonError) reasonField.current?.focus()
  }, [reasonError])

  function dismiss() {
    setDialog(undefined)
    setReasonError(false)
  }

  function reasonText(criterionId: string, kind: 'reason' | 'reject') {
    if (kind === 'reason') return rows[criterionId].reasonDraft ?? rows[criterionId].reason ?? ''
    const relevance = mentorDay.relevance[criterionId]
    return rejectionDrafts[criterionId] ?? (relevance.state === 'rejected' ? relevance.review.rejectionComment ?? '' : '')
  }

  function saveReason(event: FormEvent<HTMLFormElement>, activeDialog: Dialog) {
    event.preventDefault()
    if (!canEdit || blocked || activeDialog.kind === 'help' || draft.problem) return
    const id = activeDialog.criterion.id
    const raw = reasonText(id, activeDialog.kind)
    const reason = validateReason(raw)
    if (!reason.valid) {
      setReasonError(true)
      reasonField.current?.focus()
      return
    }
    if (activeDialog.kind === 'reason') {
      editor.updateRows(id, { value: 'not_relevant', reason: reason.text, reasonDraft: null })
    } else {
      reviewFocus.current = { id, trigger: activeDialog.trigger }
      void editor.review(id, { ...activeDialog.target, decision: 'rejected', rejectionComment: reason.text }, raw)
    }
    dismiss()
  }

  async function showMissing(trigger: HTMLElement) {
    if (blocked || conflict || checkingRef.current || dialog || confirmDialog) return
    checkingRef.current = true
    setConfirmationIssue('')
    focusCheck.current = true
    setCompleteness('checking')
    const refreshed = await editor.refresh()
    checkingRef.current = false
    if (refreshed?.dayLocked) {
      focusCheck.current = false
      focusLock.current = true
      setCompleteness(undefined)
      return
    }
    setCompleteness(refreshed ? 'checked' : 'failed')
    const snapshot = editor.cleanSnapshot()
    if (refreshed && snapshot?.mentorDay.completion?.complete) setConfirmDialog({ snapshot, trigger })
  }

  function adoptConfirmation(stored: NonNullable<Awaited<ReturnType<typeof editor.readStored>>['latest']>) {
    focusLock.current = Boolean(stored.selected.mentorDay?.confirmation)
    setConfirmDialog(undefined)
    setUnresolved(undefined)
    setCompleteness(undefined)
    editor.adopt(stored)
  }

  async function confirm(snapshot: MentorView) {
    const clean = editor.cleanSnapshot()
    if (confirmingRef.current || unresolved || clean?.revision !== snapshot.revision || !clean.mentorDay.completion?.complete) return
    confirmingRef.current = true
    setConfirming(true)
    setConfirmationIssue('')
    const { actor, application, report } = options
    const command = application.newConfirmMentorDayCommand(actor, snapshot)
    let receipt: MentorDayReceipt | undefined
    let failure: unknown
    try {
      receipt = await application.withOpenStorage(() => application.executeConfirmMentorDay(command))
    } catch (error) {
      failure = error
      report(error)
    }
    const { latest, readError } = await editor.readStored()
    if (latest && (latest.selected.revision !== snapshot.revision || latest.actor.id !== actor.id || latest.actor.role !== actor.role)) {
      adoptConfirmation(latest)
      if (!latest.selected.dayLocked) setConfirmationIssue('Løpet eller den aktive rollen ble endret. Kontroller de lagrede opplysningene før du bekrefter på nytt.')
    } else if (receipt) {
      focusLock.current = true
      setConfirmDialog(undefined)
      setUnresolved(undefined)
      setCompleteness(undefined)
      editor.accept(mentorDayConfirmationView(snapshot, receipt))
    } else if (latest) {
      setUnresolved(undefined)
      setConfirmationIssue(`Dagen kunne ikke bekreftes. ${explain(failure)}`)
    } else {
      setUnresolved(command)
      setConfirmationIssue(`Status for dagsbekreftelsen kunne ikke leses. ${explain(readError)}`)
    }
    confirmingRef.current = false
    setConfirming(false)
  }

  async function verifyConfirmation() {
    if (confirmingRef.current || !unresolved) return
    confirmingRef.current = true
    setConfirming(true)
    const { latest, readError } = await editor.readStored()
    if (latest) {
      focusOpen.current = !latest.selected.dayLocked
      adoptConfirmation(latest)
      setConfirmationIssue(latest.selected.dayLocked ? '' : 'Dagen er åpen. Kontroller de lagrede opplysningene før du bekrefter på nytt.')
    } else setConfirmationIssue(`Status for dagsbekreftelsen kunne ikke leses. ${explain(readError)}`)
    confirmingRef.current = false
    setConfirming(false)
  }

  function focusPlanIssue() {
    if (!planIssue) return
    focusMatrixField(planIssue.field === 'need' ? 'follow-up-yes' : planIssue.field === 'extraDays' ? 'follow-up-count'
      : availableExtraDays(mentorDay.followUp.window).length && draft.followUp.type !== 'training'
        ? 'follow-up-type' : 'follow-up-training')
  }

  function leaveForIssue(navigate: () => void) {
    if (editor.planDirty && planIssue) {
      setPlanNavigationBlocked(true)
      focusPlanIssue()
      return
    }
    setPlanNavigationBlocked(false)
    navigate()
  }

  function focusIssue(criterionId: string, field: typeof issues[number]['field']) {
    const target = field === 'review' ? `review-${criterionId}-accept`
      : `answer-${criterionId}-${field === 'reason' ? 'not_relevant' : 'ok'}`
    focusMatrixField(target)
    if (field === 'reason' && !blocked) {
      document.getElementById(target)?.click()
      setReasonError(true)
    }
  }

  function details(criterion: Criterion) {
    const { id, title } = criterion
    const relevance = mentorDay.relevance[id]
    const commentOpen = Boolean(openComments[id])
    const comment = mentorDay.comments[id]
    const author = mentorDay.answers.find(answer => answer.criterionId === id)?.actor
    return (
      <div className="mentor-row-details">
        {author && <p className="hint">Fadders svar · {author.name}</p>}
        {mentorDay.reasonDrafts[id]?.trim() && <p className="assessment-text">Lagret begrunnelsesutkast · {mentorDay.reasonDrafts[id]}</p>}
        {mentorDay.rejectionDrafts[id]?.trim() && <p className="assessment-text">Lagret avslagsutkast · {mentorDay.rejectionDrafts[id]}</p>}
        {mentorDay.editable ? <><button className="button secondary" type="button" id={`comment-trigger-${id}`}
          aria-label={`Kommentar til ${title} · Fadder · Dag ${saved.day}`}
          aria-expanded={commentOpen} aria-controls={`comment-${id}`}
          onClick={() => setOpenComments(current => ({ ...current, [id]: !current[id] }))}>Kommentar</button>
        {!commentOpen && comments[id] && <p className="hint">Kommentar fra fadder · {comment?.actor.name ?? mentorDay.mentorName}</p>}
        <div className="mentor-comment" id={`comment-${id}`} hidden={!commentOpen}>
          <label htmlFor={`comment-text-${id}`}>Fadders kommentar · {title} · Dag {saved.day}</label>
          {comment && <p className="hint">Lagret av {comment.actor.name}, fadder.</p>}
          <p className="hint" id={`comment-hint-${id}`}>Frivillig</p>
          <textarea id={`comment-text-${id}`} aria-describedby={`comment-hint-${id}`}
            readOnly={!canEdit || blocked} value={comments[id] ?? ''}
            onChange={event => editor.updateText('comments', id, event.currentTarget.value)} />
        </div></> : comment && <><p className="hint">Fadders kommentar · {comment.actor.name}</p>
          <p className="assessment-text">{comment.text}</p></>}
        {relevance.state === 'not_applicable' ? (
          relevance.previouslyReviewed && <p className="hint">Sjåføren har ikke lenger valgt Ikke relevant.</p>
        ) : (
          <section className="mentor-review" aria-label={`Behandle sjåførens relevansvalg · ${title} · Dag ${saved.day}`}>
            <h3>Sjåførens relevansvalg</h3>
            <p><strong>{mentorDay.driverName}, sjåfør</strong> · Ikke relevant</p>
            <p className="assessment-text">Sjåførens begrunnelse · {relevance.reason}</p>
            {relevance.state === 'pending' && <p>Fadders avgjørelse · Ikke behandlet</p>}
            {relevance.state === 'outdated' && <p>Fadders avgjørelse · Utdatert</p>}
            {'review' in relevance && (
              <>
                <p>Fadders avgjørelse · {relevance.state === 'accepted' ? 'Bekreftet' : 'Avslått'} av {relevance.review.actor.name}</p>
                {relevance.review.rejectionComment && <p className="assessment-text">Fadders avslagskommentar · {relevance.review.rejectionComment}</p>}
              </>
            )}
            {reviewIssues[id] && <p className="field-error" id={`review-issue-${id}`}>{reviewIssues[id]}</p>}
            {canEdit && (
              <div className="actions">
                <button type="button" className="button secondary" id={`review-${id}-accept`}
                  aria-disabled={blocked || Boolean(draft.problem)}
                  aria-label={`Bekreft sjåførens Ikke relevant · ${title} · Dag ${saved.day}`}
                  aria-describedby={reviewIssues[id] ? `review-issue-${id}` : undefined}
                  onClick={event => {
                    if (blocked || draft.problem) return
                    if (document.activeElement === event.currentTarget) reviewFocus.current = { id, trigger: event.currentTarget }
                    void editor.review(id, { ...relevance.target, decision: 'accepted' })
                  }}>Bekreft Ikke relevant</button>
                <button type="button" className="button secondary" aria-disabled={blocked || Boolean(draft.problem)}
                  aria-label={`Avslå sjåførens Ikke relevant · ${title} · Dag ${saved.day}`}
                  aria-describedby={reviewIssues[id] ? `review-issue-${id}` : undefined}
                  onClick={event => {
                    if (!blocked && !draft.problem) setDialog({
                      kind: 'reject', criterion, trigger: event.currentTarget,
                      target: relevance.target, driverReason: relevance.reason, driverName: mentorDay.driverName,
                    })
                  }}>Avslå Ikke relevant</button>
              </div>
            )}
          </section>
        )}
      </div>
    )
  }

  return (
    <section aria-label="Fadderens vurdering" ref={section} tabIndex={-1}>
      <p className="context">Fadder · {mentorDay.mentorName} · Dag {saved.day} · <CalendarDate value={saved.fields.date} /></p>
      <p ref={lockedStatus} tabIndex={-1} className="baseline-state">{confirmation ? `Låst. Bekreftet av ${confirmation.actor.name}, fadder.`
        : mentorDay.editable ? 'Faddervurderingen er ikke bekreftet' : 'Faddervurderingen er låst'}</p>
      {confirmation && <p className="hint">Faddervurdering · <CalendarDate value={confirmation.date} /> · Bekreftelsestid{' '}
        <ConfirmationTime value={confirmation.confirmedAt} />
      </p>}
      <p>{answered} av {mentorDay.answers.length} fadderpunkter besvart. {reviewCount > 0
        ? `${reviewCount} av sjåførens relevansvalg må behandles.` : 'Ingen aktuelle relevansvalg krever behandling.'}</p>
      {!mentorDay.driverReady && mentorDay.editable && <p>Du kan fortsette å fylle ut. Sjåføren må bekrefte sin del før dagen kan låses.</p>}
      <p className="save-status" role={modalStatus ? undefined : 'status'} aria-atomic={modalStatus ? undefined : true}>{status}</p>
      {notice && <p className="error-panel" role="alert">{notice}</p>}
      {!confirmDialog && confirmationIssue && <div className="day-problem">
        <p className="error-panel" role="alert">{confirmationIssue}</p>
        {unresolved && <div className="actions">
          <button type="button" className="button secondary" aria-disabled={busy || undefined}
            onClick={() => void verifyConfirmation()}>Kontroller lagret tilstand</button>
        </div>}
      </div>}
      {draft.problem && (
        <div className="day-problem">
          <p className="error-panel" role="alert">{draft.problem.savedPlan
            ? conflict ? 'Oppfølgingen ble lagret. Løpet er oppdatert. Kontroller de andre endringene.'
              : 'Oppfølgingen ble lagret. Gjeldende lagrede opplysninger kunne ikke leses.'
            : `Endringene er ikke lagret. Prøv igjen. ${conflict ? 'Kontroller de lagrede opplysningene før du fortsetter.'
              : editor.reviewPending ? 'Prøv igjen for å lagre relevansavgjørelsen.' : explain(draft.problem.error)}`}</p>
          {!conflict && <button className="button secondary" type="button" disabled={busy}
            onClick={() => void editor.retry()}>{retryLabel}</button>}
        </div>
      )}
      {conflict && (
        <section className="saved-snapshot" aria-labelledby="mentor-conflict-heading">
          <h2 id="mentor-conflict-heading">Lagrede fadderopplysninger</h2>
          {conflict.latest ? (
            <>
              <p>Sammenlign fadderutkastet med de lagrede opplysningene.</p>
              {editor.planDirty && <FollowUpConflict saved={conflict.latest.selected} value={draft.followUp}
                proposal={conflictProposal || undefined} />}
              <ul className="assessment-text">
                {mentorDay.criteria.filter(({ id }) => changes.answers?.[id] || changes.comments?.[id] !== undefined
                  || changes.rejectionDrafts?.[id] !== undefined).map(({ id, title }) => {
                  const stored = previous?.answers.find(answer => answer.criterionId === id)
                  return (
                    <li key={id}>
                      <strong>{title}</strong>
                      {changes.answers?.[id] && <>
                        {stored && <p>Lagret svar · {answerText(stored)} {stored.reason}</p>}
                        <p>Ditt svar · {answerText(rows[id])} {rows[id].reason}</p>
                        {previous?.reasonDrafts[id] !== undefined && <p>Lagret begrunnelsesutkast · {previous.reasonDrafts[id]}</p>}
                        {rows[id].reasonDraft !== undefined && <p>Ditt begrunnelsesutkast · {rows[id].reasonDraft}</p>}
                      </>}
                      {changes.comments?.[id] !== undefined && <>
                        <p>Lagret kommentar · {previous?.comments[id]?.text || 'Tom'}</p>
                        <p>Din kommentar · {comments[id] || 'Tom'}</p>
                      </>}
                      {changes.rejectionDrafts?.[id] !== undefined && <>
                        <p>Lagret avslagsutkast · {previous?.rejectionDrafts[id] || 'Tomt'}</p>
                        <p>Ditt avslagsutkast · {rejectionDrafts[id] || 'Tomt'}</p>
                      </>}
                    </li>
                  )
                })}
              </ul>
              <div className="actions">
                {editor.staleRole && <button className="button secondary" type="button" disabled={blocked}
                  onClick={() => void editor.refreshConflict(true)}>Gjenoppta som fadder</button>}
                {!editor.staleRole && previous?.editable && <button className="button primary" type="button" disabled={blocked}
                  onClick={() => void editor.resolveConflict(true)}>{conflictProposal && 'field' in conflictProposal
                    ? 'Behold fadderutkastet for redigering' : 'Lagre mitt fadderutkast'}</button>}
                <button className="button secondary" type="button" disabled={blocked}
                  onClick={() => void editor.resolveConflict(false)}>Bruk lagrede opplysninger</button>
              </div>
            </>
          ) : (
            <>
              <p className="field-error">{explain(conflict.readError)}</p>
              <button className="button secondary" type="button" disabled={blocked}
                onClick={() => void editor.refreshConflict()}>Hent lagrede opplysninger</button>
            </>
          )}
        </section>
      )}
      <FollowUpForm view={planView} value={draft.followUp} result={editor.planPreview} dirty={editor.planDirty}
        showIssues={showIssues} blocked={planBlocked} saving={draft.writing || editor.planPending} pending={editor.planPending}
        failed={Boolean(draft.problem)} currentLastDay={conflict?.latest?.selected.plannedLastDay ?? saved.plannedLastDay}
        onChange={editor.updateFollowUp} onDiscard={editor.discardFollowUp} onSave={() => void editor.flush()} />
      {planNavigationBlocked && editor.planDirty && planIssue && <p role="alert" className="field-error">Fullfør eller forkast planutkastet før du åpner en annen del av skjemaet.</p>}
      {mentorDay.editable && !confirmation && <div className="actions mentor-completion">
        <button ref={checkButton} type="button" className="button secondary" aria-disabled={blocked || Boolean(conflict)}
          onClick={event => void showMissing(event.currentTarget)}>Kontroller mangler</button>
      </div>}
      {completeness && (
        <section className={showIssues && hasIssues ? 'error-panel baseline-missing' : 'baseline-missing'} aria-labelledby="mentor-missing-heading">
          <h2 id="mentor-missing-heading" tabIndex={-1} ref={issueHeading}>Mangler i faddervurderingen</h2>
          <p aria-live="polite">{completeness === 'checking' ? 'Kontrollerer lagrede opplysninger …'
            : completeness === 'failed' ? 'Kontrollen kunne ikke fullføres. Prøv igjen.' : null}</p>
          {showIssues && !issues.length && <p>Alle fadderpunkter og aktuelle relevansvalg er behandlet.</p>}
          {showIssues && hasIssues && <ul>
            {completion?.baselineMissing && <li><button className="issue-link" type="button" onClick={() => leaveForIssue(() => options.onDriverPart('baseline'))}>
              Sjåføren må bekrefte førvurderingen.
            </button></li>}
            {completion?.driverAfterMissing && <li>{saved.driverAfter
              ? <button className="issue-link" type="button" onClick={() => leaveForIssue(() => options.onDriverPart('after'))}>Sjåføren må bekrefte dagens ettervurdering.</button>
              : 'Sjåføren må bekrefte dagens ettervurdering etter førvurderingen.'}</li>}
            {fieldIssues.map(([field, message]) => <li key={field}><button className="issue-link" type="button"
              onClick={() => leaveForIssue(() => options.onDayField(field))}>Øktopplysninger · {message}</button></li>)}
            {issues.map(issue => {
            const text = `${mentorDay.criteria.find(({ id }) => id === issue.criterionId)?.title} · ${issue.message}`
            return (
              <li key={`${issue.criterionId}/${issue.field}`}>
                {canEdit ? <button className="issue-link" type="button" onClick={() => focusIssue(issue.criterionId, issue.field)}>
                  {text}
                </button> : text}
              </li>
            )
          })}{planIssue && <li>
            {planBlocked || editor.planPending ? `Oppfølging · ${planIssue.message}` : <button className="issue-link" type="button" onClick={focusPlanIssue}>Oppfølging · {planIssue.message}</button>}
          </li>}</ul>}
        </section>
      )}
      <AssessmentMatrix criteria={mentorDay.criteria} answers={mentorDay.answers} rows={rows} issues={answerIssues}
        editable={canEdit} blocked={blocked} context={`Fadder · Faddervurdering · Dag ${saved.day}`} reasonLabel="Fadders begrunnelse"
        helpDisabled={completeness === 'checking'}
        onHelp={(criterion, trigger) => {
          if (!checkingRef.current && !confirmDialog) setDialog({ kind: 'help', criterion, trigger })
        }}
        onChoice={(criterion, value, trigger) => {
          if (value === 'not_relevant') setDialog({ kind: 'reason', criterion, trigger })
          else editor.updateRows(criterion.id, { value, reason: null })
        }} renderDetails={details} />
      {confirmDialog && <Modal title="Bekreft faddervurderingen og lås dagen" trigger={confirmDialog.trigger}
        fallbackFocus={section} dismiss={() => setConfirmDialog(undefined)} blocking={confirming}>
        <p>Fadder · {confirmDialog.snapshot.mentorDay.mentorName}</p>
        <p>Dag {confirmDialog.snapshot.day} · <CalendarDate value={confirmDialog.snapshot.fields.date} /></p>
        <p>Du bekrefter faddervurderingen for dag {confirmDialog.snapshot.day}.</p>
        <p><strong>Dagens vurderinger og kommentarer låses permanent.</strong></p>
        <p>Faddervurderingen, relevansbehandlingen, øktopplysningene og dagens oppfølgingsvalg blir skrivebeskyttet. Sjåførens før- og ettervurdering forblir låst.</p>
        {[...Object.values(confirmDialog.snapshot.mentorDay.reasonDrafts), ...Object.values(confirmDialog.snapshot.mentorDay.rejectionDrafts)]
          .some(text => text?.trim()) && <p>Lagrede utkast til begrunnelser og avslag forblir merket som utkast.</p>}
        {confirmationIssue && <p className="field-error" role="alert">{confirmationIssue}</p>}
        <p className="save-status" role="status">{confirming ? 'Bekrefter …' : ''}</p>
        <div className="actions">
          <button type="button" className="button secondary" aria-disabled={confirming}
            onClick={() => { if (!confirmingRef.current) setConfirmDialog(undefined) }}>Avbryt</button>
          {unresolved ? <button type="button" className="button primary" aria-disabled={confirming}
            onClick={() => void verifyConfirmation()}>Kontroller lagret tilstand</button>
            : <button type="button" className="button primary" aria-disabled={confirming}
              onClick={() => void confirm(confirmDialog.snapshot)}>Bekreft og lås dagen</button>}
        </div>
      </Modal>}
      {dialog && (
        <Modal title={dialog.kind === 'help' ? `Hjelp om ${dialog.criterion.title}`
          : dialog.kind === 'reason' ? 'Begrunn Ikke relevant' : 'Avslå sjåførens Ikke relevant'}
          trigger={dialog.trigger} fallbackFocus={section} dismiss={dismiss} help={dialog.kind === 'help'}>
          {dialog.kind === 'help' ? (
            <>
              <p>{dialog.criterion.help}</p>
              <button type="button" className="button secondary" onClick={dismiss}>Lukk hjelp</button>
            </>
          ) : (
            <form onSubmit={event => saveReason(event, dialog)}>
              <p className="dialog-context" id="mentor-dialog-context">Fadder · {mentorDay.mentorName} · Faddervurdering · Dag {saved.day}</p>
              <p className="dialog-criterion" id="mentor-dialog-criterion">{dialog.criterion.title}</p>
              {dialog.kind === 'reject' && (
                <p className="assessment-text" id="mentor-dialog-driver-reason">{dialog.driverName}, sjåfør · Ikke relevant · {dialog.driverReason}</p>
              )}
              <label htmlFor="mentor-reason">{dialog.kind === 'reason' ? 'Begrunn hvorfor dette ikke er relevant' : 'Fadders kommentar ved avslag'}</label>
              <p id="mentor-reason-hint" className="hint">{reasonRequirement}</p>
              <textarea id="mentor-reason" ref={reasonField} value={reasonText(dialog.criterion.id, dialog.kind)}
                readOnly={!canEdit || blocked}
                aria-invalid={reasonError || undefined}
                aria-describedby={`mentor-dialog-criterion mentor-dialog-context ${dialog.kind === 'reject' ? 'mentor-dialog-driver-reason ' : ''}${reasonError ? 'mentor-reason-error' : 'mentor-reason-hint'}`}
                onChange={event => {
                  const text = event.currentTarget.value
                  if (dialog.kind === 'reason') editor.updateRows(dialog.criterion.id, { reasonDraft: text })
                  else editor.updateText('rejectionDrafts', dialog.criterion.id, text)
                  setReasonError(false)
                }} />
              {reasonError && <p id="mentor-reason-error" className="field-error" role="alert">{reasonRequirement}</p>}
              <p className="save-status" role="status" aria-atomic="true">{status}</p>
              {draft.problem && <p className="field-error" role="alert">{conflict
                ? 'Lukk dialogen for å kontrollere de lagrede opplysningene.'
                : draft.problem.savedPlan ? 'Oppfølgingen ble lagret. Gjeldende lagrede opplysninger kunne ikke leses.'
                  : 'Endringene er ikke lagret. Prøv igjen.'}</p>}
              {draft.problem && !conflict && <button type="button" className="button secondary" disabled={busy}
                onClick={() => void editor.retry()}>{retryLabel}</button>}
              <div className="actions">
                <button type="button" className="button secondary" onClick={dismiss}>Avbryt</button>
                <button type="submit" className="button primary" disabled={!canEdit || blocked || Boolean(draft.problem)}>
                  {dialog.kind === 'reason' ? 'Lagre begrunnelse' : 'Avslå Ikke relevant'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  )
}
