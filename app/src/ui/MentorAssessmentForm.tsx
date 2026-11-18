import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { availableExtraDays, previewFollowUp } from '../domain/follow-up.ts'
import { mentorAssessmentIssues } from '../domain/mentor-day.ts'
import type { ReviewTarget } from '../domain/mentor-day.ts'
import { reasonRequirement, validateReason } from '../domain/reason.ts'
import type { Actor, Criterion } from '../domain/run.ts'
import { AssessmentMatrix, Modal } from './AssessmentMatrix.tsx'
import { answerText, focusMatrixField } from './assessment-fields.ts'
import { CalendarDate } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'
import { FollowUpConflict, FollowUpForm } from './FollowUpForm.tsx'
import { useMentorDraft } from './use-mentor-draft.ts'
import type { MentorView } from './use-mentor-draft.ts'

type Props = {
  ref: Ref<{ flush: () => Promise<boolean> }>
  initial: MentorView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
  navigating: boolean
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
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [completeness, setCompleteness] = useState<'checking' | 'failed' | 'checked'>()
  const [reasonError, setReasonError] = useState(false)
  const issueHeading = useRef<HTMLHeadingElement>(null)
  const focusCheck = useRef(false)
  const section = useRef<HTMLElement>(null)
  const reasonField = useRef<HTMLTextAreaElement>(null)
  const reviewFocus = useRef<{ id: string; trigger: HTMLElement }>(undefined)
  const canEdit = mentorDay.editable && !conflict
  const busy = navigating || reviewing
  const blocked = busy || editor.reviewPending
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
  const planView = previous && conflict?.latest ? { ...conflict.latest.selected, mentorDay: previous } : saved
  const conflictProposal = previous && editor.planDirty && previewFollowUp(previous.followUp.window, draft.followUp)
  const planBlocked = !canEdit || blocked || Boolean(draft.problem?.savedPlan || (draft.problem && editor.planPending))
  const planIssue = 'field' in editor.planPreview ? editor.planPreview : undefined
  const status = draft.writing ? 'Lagrer …'
    : draft.problem?.savedPlan ? (editor.dirty ? 'Oppfølgingen er lagret. Andre endringer er ikke lagret.' : 'Lagret på denne enheten')
    : draft.problem ? 'Ulagrede endringer'
    : editor.planDirty && planIssue ? 'Ufullstendig planutkast · Fullfør eller forkast utkastet før du går videre.'
    : editor.dirty ? 'Lagrer …' : 'Lagret på denne enheten'
  const retryLabel = draft.problem?.savedPlan ? 'Les lagrede opplysninger på nytt' : 'Prøv igjen'
  const modalStatus = dialog && dialog.kind !== 'help'

  useImperativeHandle(ref, () => ({ flush: editor.flush }))
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

  async function showMissing() {
    if (blocked || conflict) return
    focusCheck.current = true
    setCompleteness('checking')
    setCompleteness(await editor.refresh() ? 'checked' : 'failed')
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
        <button className="button secondary" type="button" id={`comment-trigger-${id}`}
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
        </div>
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
      <p className="baseline-state">{mentorDay.confirmation ? `Låst. Bekreftet av ${mentorDay.confirmation.actor.name}, fadder.`
        : mentorDay.editable ? 'Faddervurderingen er ikke bekreftet' : 'Faddervurderingen er låst'}</p>
      <p>{answered} av {mentorDay.answers.length} fadderpunkter besvart. {reviewCount > 0
        ? `${reviewCount} av sjåførens relevansvalg må behandles.` : 'Ingen aktuelle relevansvalg krever behandling.'}</p>
      {!mentorDay.driverReady && mentorDay.editable && <p>Du kan fortsette å fylle ut. Sjåføren må bekrefte sin del før dagen kan låses.</p>}
      <p className="save-status" role={modalStatus ? undefined : 'status'} aria-atomic={modalStatus ? undefined : true}>{status}</p>
      {notice && <p className="error-panel" role="alert">{notice}</p>}
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
      {mentorDay.editable && <div className="actions mentor-completion">
        <button type="button" className="button secondary" aria-disabled={blocked || Boolean(conflict)}
          onClick={() => void showMissing()}>Kontroller mangler</button>
      </div>}
      {completeness && (
        <section className={showIssues && (issues.length || planIssue) ? 'error-panel baseline-missing' : 'baseline-missing'} aria-labelledby="mentor-missing-heading">
          <h2 id="mentor-missing-heading" tabIndex={-1} ref={issueHeading}>Mangler i faddervurderingen</h2>
          <p aria-live="polite">{completeness === 'checking' ? 'Kontrollerer lagrede opplysninger …'
            : completeness === 'failed' ? 'Kontrollen kunne ikke fullføres. Prøv igjen.' : null}</p>
          {showIssues && !issues.length && <p>Alle fadderpunkter og aktuelle relevansvalg er behandlet.</p>}
          {showIssues && (issues.length > 0 || planIssue) && <ul>{issues.map(issue => {
            const text = `${mentorDay.criteria.find(({ id }) => id === issue.criterionId)?.title} · ${issue.message}`
            return (
              <li key={`${issue.criterionId}/${issue.field}`}>
                {canEdit ? <button className="issue-link" type="button" onClick={() => focusIssue(issue.criterionId, issue.field)}>
                  {text}
                </button> : text}
              </li>
            )
          })}{planIssue && <li>
            {planBlocked || editor.planPending ? `Oppfølging · ${planIssue.message}` : <button className="issue-link" type="button" onClick={() => focusMatrixField(
              planIssue.field === 'need' ? 'follow-up-yes' : planIssue.field === 'extraDays' ? 'follow-up-count'
                : availableExtraDays(mentorDay.followUp.window).length && draft.followUp.type !== 'training'
                  ? 'follow-up-type' : 'follow-up-training',
            )}>Oppfølging · {planIssue.message}</button>}
          </li>}</ul>}
        </section>
      )}
      <AssessmentMatrix criteria={mentorDay.criteria} answers={mentorDay.answers} rows={rows} issues={answerIssues}
        editable={canEdit} blocked={blocked} context={`Fadder · Faddervurdering · Dag ${saved.day}`} reasonLabel="Fadders begrunnelse"
        onHelp={(criterion, trigger) => setDialog({ kind: 'help', criterion, trigger })}
        onChoice={(criterion, value, trigger) => {
          if (value === 'not_relevant') setDialog({ kind: 'reason', criterion, trigger })
          else editor.updateRows(criterion.id, { value, reason: null })
        }} renderDetails={details} />
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
