import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { confirmationView, driverDayConfirmationView } from '../application/run-application.ts'
import { checkBaselineAnswers } from '../domain/baseline.ts'
import type { ConfirmBaselineCommand } from '../domain/baseline.ts'
import { checkDayFields } from '../domain/day-draft.ts'
import type { DayField } from '../domain/day-draft.ts'
import { evaluationFields } from '../domain/driver-day.ts'
import type { ConfirmDriverDayCommand, EvaluationField, EvaluationTexts } from '../domain/driver-day.ts'
import { reasonRequirement, validateReason } from '../domain/reason.ts'
import type { Actor, Criterion, RunReceipt } from '../domain/run.ts'
import { AssessmentMatrix, Modal } from './AssessmentMatrix.tsx'
import { answerText, focusMatrixField } from './assessment-fields.ts'
import { CalendarDate, ConfirmationTime } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'
import { assessmentOf, evaluationDecisionOf, useAssessmentDraft } from './use-assessment-draft.ts'
import type { AssessmentPhase } from './use-assessment-draft.ts'

type Props = {
  ref: Ref<{ flush: () => Promise<boolean> }>
  initial: DayView
  phase: AssessmentPhase
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
  onDayField: (field: DayField) => void
  onConfirmIssue: (message: string) => void
  navigating: boolean
}

const evaluationLabels = {
  strength1: 'Styrke 1', strength2: 'Styrke 2', strength3: 'Styrke 3',
  growth1: 'Utviklingsområde 1', growth2: 'Utviklingsområde 2', growth3: 'Utviklingsområde 3',
} satisfies Record<EvaluationField, string>

const evaluationChoice = { submitted: 'Innsending', skipped: 'Hoppet over' }

function hasDriverDayIssues(day: DayView) {
  const issues = { ...checkDayFields(day.fields, 'driver'), ...checkBaselineAnswers(day.driverAfter!.answers) }
  return Object.keys(issues).length > 0
}

function EvaluationFields({ texts, update }: { texts: EvaluationTexts; update?: (field: EvaluationField, text: string) => void }) {
  return (
    <>
      {['Mine styrker som sjåfør', 'På disse områdene kan jeg bli bedre'].map((group, index) => (
        <fieldset className="evaluation-fields" key={group}>
          <legend>{group}</legend>
          {evaluationFields.slice(index * 3, index * 3 + 3).map(field => (
            <label key={field}>
              {evaluationLabels[field]} · frivillig
              <textarea value={texts[field] ?? ''} readOnly={!update}
                onChange={update && (event => update(field, event.currentTarget.value))} />
            </label>
          ))}
        </fieldset>
      ))}
    </>
  )
}

type Dialog =
  | { kind: 'help' | 'reason'; criterion: Criterion; trigger: HTMLElement }
  | { kind: 'confirm'; snapshot: DayView; trigger: HTMLElement }

export function AssessmentForm({ ref, onDayField, onConfirmIssue, navigating, ...options }: Props) {
  const editor = useAssessmentDraft(options)
  const { draft, conflict, staleRole, reviewing } = editor
  const { saved, rows } = draft
  const after = options.phase === 'driver_after'
  const assessment = assessmentOf(saved, options.phase)
  const phaseName = after ? 'Ettervurdering' : 'Førvurdering'
  const dayNumber = after ? saved.day : 1
  const confirmation = (conflict?.stored && assessmentOf(conflict.stored.selected, options.phase).confirmation) ?? assessment.confirmation
  const [dialog, setDialog] = useState<Dialog>()
  const [evaluationStep, setEvaluationStep] = useState(false)
  const [checking, setChecking] = useState(false)
  const [showProblems, setShowProblems] = useState(false)
  const [reasonError, setReasonError] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState('')
  const [hasUnresolvedConfirmation, setHasUnresolvedConfirmation] = useState(false)
  const [requestedFocus, setRequestedFocus] = useState<{ target: 'missing' | 'evaluation' | 'locked' | 'continue' | 'recovery' }>()
  const confirmingRef = useRef(false)
  const confirmationAttempt = useRef<ConfirmBaselineCommand | ConfirmDriverDayCommand>(undefined)
  const unresolved = useRef<DayView>(undefined)
  const verifiedAbort = useRef(false)
  const missingHeading = useRef<HTMLHeadingElement>(null)
  const evaluationHeading = useRef<HTMLHeadingElement>(null)
  const conflictHeading = useRef<HTMLHeadingElement>(null)
  const lockedStatus = useRef<HTMLParagraphElement>(null)
  const reasonField = useRef<HTMLTextAreaElement>(null)
  const canEdit = assessment.editable && !conflict
  const blockEdits = checking || navigating || hasUnresolvedConfirmation
  const answerIssues = checkBaselineAnswers(assessment.answers.map(answer => ({ ...answer, ...rows[answer.criterionId] })))
  const dayIssues = checkDayFields(assessment.fields, 'driver')
  const issues = Object.keys(answerIssues).length + Object.keys(dayIssues).length
  const evaluation = saved.driverAfter?.evaluation
  const savedDecision = saved.driverAfter?.evaluationDraft?.decision
  const conflictDay = conflict?.stored?.selected
  const conflictResult = conflictDay?.driverAfter?.evaluation?.state
  const conflictDecision = conflictResult === 'submitted' || conflictResult === 'skipped' ? conflictResult
    : conflictDay?.driverAfter?.evaluationDraft?.decision
  const evaluationOffered = Boolean(after && saved.driverAfter?.evaluationOffered)
  const showEvaluation = evaluationStep && evaluationOffered && assessment.editable && (issues === 0 || Boolean(conflict))
  const hasTexts = Object.values(draft.texts).some(Boolean)

  useLayoutEffect(() => {
    if (!requestedFocus) return
    const targets = {
      missing: missingHeading.current,
      evaluation: evaluationHeading.current,
      locked: lockedStatus.current,
      continue: document.getElementById('driver-after-continue'),
      recovery: conflictHeading.current ?? evaluationHeading.current,
    }
    const target = targets[requestedFocus.target] ?? document.querySelector<HTMLElement>('main h1')
    target?.focus()
  }, [requestedFocus])

  function showMissing() {
    setEvaluationStep(false)
    setShowProblems(true)
    setRequestedFocus({ target: 'missing' })
  }

  useImperativeHandle(ref, () => ({ flush: () => confirmingRef.current || unresolved.current ? Promise.resolve(false) : editor.flush() }))

  function setUnresolvedConfirmation(snapshot?: DayView) {
    unresolved.current = snapshot
    setHasUnresolvedConfirmation(Boolean(snapshot))
  }

  function dismiss() {
    if (dialog?.kind === 'confirm' && verifiedAbort.current) {
      confirmationAttempt.current = undefined
      verifiedAbort.current = false
    }
    setDialog(undefined)
    setReasonError(false)
    if (!unresolved.current) setConfirmationError('')
  }

  function checkCompletion(trigger: HTMLElement) {
    if (unresolved.current && !confirmingRef.current) {
      setDialog({ kind: 'confirm', snapshot: unresolved.current, trigger })
      return
    }
    const snapshot = editor.cleanSnapshot()
    if (!snapshot || !assessmentOf(snapshot, options.phase).editable || navigating) return
    if (issues) {
      showMissing()
      return
    }
    setShowProblems(false)
    setConfirmationError('')
    setDialog({ kind: 'confirm', snapshot, trigger })
  }

  async function continueAfter(trigger: HTMLElement, decision?: 'skipped' | 'submitted') {
    if (confirmingRef.current || navigating || !canEdit) return
    if (unresolved.current) {
      setDialog({ kind: 'confirm', snapshot: unresolved.current, trigger })
      return
    }
    if (!decision && !editor.cleanSnapshot()) return
    confirmingRef.current = true
    setChecking(true)
    onConfirmIssue('')
    try {
      if (!await editor.flush()) { setRequestedFocus({ target: 'recovery' }); return }
      const snapshot = editor.cleanSnapshot()
      if (!snapshot) return
      let actual = await reviewAfterSnapshot(snapshot)
      if (!actual) return
      const planChanged = actual.planRevision !== snapshot.planRevision
      if (actual.driverAfter.evaluationOffered && (!decision || planChanged)) {
        editor.markEvaluationOffer()
        if (!await editor.flush()) { setRequestedFocus({ target: 'recovery' }); return }
        setEvaluationStep(true)
        setRequestedFocus({ target: 'evaluation' })
        return
      }

      if (planChanged) {
        setEvaluationStep(false)
        onConfirmIssue('Planen ble endret. Kontroller dagens ettervurdering før du bekrefter.')
        setRequestedFocus({ target: 'continue' })
        return
      }
      if (decision) {
        editor.updateEvaluation({ texts: {}, decision })
        if (!await editor.flush()) { setRequestedFocus({ target: 'recovery' }); return }
        const chosen = editor.cleanSnapshot()
        if (!chosen) return
        const latest = await reviewAfterSnapshot(chosen)
        if (!latest) return
        if (latest.planRevision !== chosen.planRevision || evaluationDecisionOf(latest) !== decision) {
          setEvaluationStep(latest.driverAfter.evaluationOffered)
          onConfirmIssue('Egenevalueringen ble endret. Kontroller opplysningene og velg på nytt.')
          setRequestedFocus({ target: latest.driverAfter.evaluationOffered ? 'evaluation' : 'continue' })
          return
        }
        actual = latest
      }
      setConfirmationError('')
      setDialog({ kind: 'confirm', snapshot: actual, trigger })
    } finally {
      confirmingRef.current = false
      setChecking(false)
    }
  }

  async function reviewAfterSnapshot(snapshot: DayView) {
    const { stored, readError } = await editor.readStored()
    if (!stored) {
      onConfirmIssue('Opplysningene kunne ikke kontrolleres. ' + explain(readError))
      return
    }
    if (editor.cleanSnapshot() !== snapshot) return
    const roleChanged = stored.actor.id !== options.actor.id || stored.actor.role !== options.actor.role
    const actual = stored.selected
    if (roleChanged || actual.revision !== snapshot.revision || actual.planRevision !== snapshot.planRevision) editor.adopt(stored)
    const afterView = actual.driverAfter
    if (roleChanged || !afterView) return
    if (!afterView.editable) {
      if (afterView.confirmation) setRequestedFocus({ target: 'locked' })
      return
    }
    if (hasDriverDayIssues(actual)) {
      showMissing()
      return
    }
    setShowProblems(false)
    return { ...actual, driverAfter: afterView }
  }

  async function verifyUnresolved() {
    if (!unresolved.current || confirmingRef.current || navigating) return
    confirmingRef.current = true
    setChecking(true)
    try {
      const { stored, readError } = await editor.readStored()
      if (!stored) {
        setConfirmationError(`Status for ${after ? 'etterbekreftelsen' : 'førbekreftelsen'} kunne ikke leses. Prøv igjen. ${explain(readError)}`)
        return
      }
      setUnresolvedConfirmation()
      confirmationAttempt.current = undefined
      setConfirmationError('')
      editor.adopt(stored)
      if (assessmentOf(stored.selected, options.phase).confirmation) setRequestedFocus({ target: 'locked' })
      else if (after && stored.selected.driverAfter?.editable && hasDriverDayIssues(stored.selected)) showMissing()
      else setRequestedFocus({ target: 'recovery' })
    } finally {
      confirmingRef.current = false
      setChecking(false)
    }
  }

  function recoverFocus(snapshot?: DayView) {
    if (snapshot && assessmentOf(snapshot, options.phase).confirmation) setRequestedFocus({ target: 'locked' })
    else if (after && snapshot?.driverAfter?.editable && hasDriverDayIssues(snapshot)) showMissing()
    else setRequestedFocus({ target: 'recovery' })
  }

  function saveReason(event: FormEvent<HTMLFormElement>, criterionId: string) {
    event.preventDefault()
    if (!canEdit || blockEdits || confirmingRef.current
      || assessment.answers.some(answer => answer.criterionId === criterionId && 'locked' in answer && answer.locked)) return
    const row = rows[criterionId]
    const reason = validateReason(row.reasonDraft ?? row.reason ?? '')
    if (!reason.valid) {
      setReasonError(true)
      reasonField.current?.focus()
      return
    }
    editor.update(criterionId, { value: 'not_relevant', reason: reason.text, reasonDraft: null })
    dismiss()
  }

  async function confirm(snapshot: DayView) {
    const clean = editor.cleanSnapshot()
    if (confirmingRef.current || clean?.revision !== snapshot.revision || clean.planRevision !== snapshot.planRevision) return
    confirmingRef.current = true
    verifiedAbort.current = false
    setConfirming(true)
    setConfirmationError('')
    const { actor, application, report } = options
    if (confirmationAttempt.current?.expectedRevision !== snapshot.revision) {
      confirmationAttempt.current = after ? application.newConfirmDriverDayCommand(actor, snapshot)
        : application.newConfirmBaselineCommand(actor, snapshot.id, snapshot.revision)
    }

    const command = confirmationAttempt.current
    let failure: unknown
    let receipt: RunReceipt | undefined
    try {
      receipt = await application.withOpenStorage(() => after
        ? application.executeConfirmDriverDay(command as ConfirmDriverDayCommand)
        : application.executeConfirmBaseline(command as ConfirmBaselineCommand))
    } catch (error) {
      failure = error
      report(error)
    }
    const { stored, readError } = await editor.readStored()
    // Ved lesefeil kan en kvittert, uendret dialogrevisjon fremdeles vises som låst.
    const acknowledged = receipt && (after ? driverDayConfirmationView(snapshot, command as ConfirmDriverDayCommand, receipt)
      : confirmationView(snapshot, command as ConfirmBaselineCommand, receipt))
    const roleChanged = stored && (stored.actor.id !== actor.id || stored.actor.role !== actor.role)
    const changed = stored && (stored.selected.revision !== snapshot.revision || stored.selected.planRevision !== snapshot.planRevision || roleChanged)
    if (acknowledged || changed) {
      const actual = stored?.selected ?? acknowledged
      const locked = Boolean(actual && assessmentOf(actual, options.phase).confirmation)
      setUnresolvedConfirmation()
      dismiss()
      if (stored) editor.adopt(stored)
      else if (acknowledged) editor.accept(acknowledged)
      if (!actual?.driverAfter?.evaluationOffered) setEvaluationStep(false)
      confirmationAttempt.current = undefined
      if (locked) setRequestedFocus({ target: 'locked' })
      if (!locked) {
        onConfirmIssue(roleChanged
          ? `Den aktive rollen ble endret i en annen fane. Velg sjåførrollen for å bekrefte ${phaseName.toLowerCase()}en.`
          : 'Løpet ble endret. Kontroller de lagrede opplysningene før du bekrefter på nytt.')
        if (after && !roleChanged && actual?.driverAfter?.editable && hasDriverDayIssues(actual)) showMissing()
        else if (after && !roleChanged && !actual?.driverAfter?.evaluationOffered) {
          setRequestedFocus({ target: 'continue' })
        }
      }
    } else {
      verifiedAbort.current = Boolean(failure && stored && !assessmentOf(stored.selected, options.phase).confirmation)
      setUnresolvedConfirmation(verifiedAbort.current ? undefined : snapshot)
      setConfirmationError(verifiedAbort.current
        ? `${phaseName}en kunne ikke bekreftes. ${explain(failure)}`
        : `Status for ${after ? 'etterbekreftelsen' : 'førbekreftelsen'} kunne ikke leses. Prøv igjen. ${explain(readError)}`)
    }
    confirmingRef.current = false
    setConfirming(false)
  }

  const modalTitle = dialog?.kind === 'help' ? `Hjelp om ${dialog.criterion.title}`
    : dialog?.kind === 'reason' ? 'Begrunn Ikke relevant'
      : after ? 'Bekreft din del' : 'Bekreft førvurderingen'
  const status = draft.problem && !draft.writing ? 'Ulagrede endringer'
    : editor.dirty || draft.writing ? 'Lagrer …' : 'Lagret på denne enheten'

  return (
    <section aria-label={`Sjåførens ${phaseName.toLowerCase()}`}>
      <p className="context">Sjåfør · {assessment.fields.driverName || 'Sjåførnavn mangler'} · Dag {dayNumber} · <CalendarDate value={assessment.fields.date} /></p>
      {after && <p className="context">Planlagt siste dag · Dag {saved.plannedLastDay}</p>}
      <p ref={lockedStatus} tabIndex={-1} className="baseline-state">
        {confirmation
          ? <>Låst. Bekreftet av {confirmation.actor.name}, sjåfør.</>
          : 'Ikke bekreftet'}
      </p>
      {confirmation && (
        <p className="hint">
          Bekreftelsestid <ConfirmationTime value={confirmation.confirmedAt} />
        </p>
      )}
      <p className="save-status" role={dialog ? undefined : 'status'} aria-atomic={dialog ? undefined : true}>{status}</p>
      {!dialog && hasUnresolvedConfirmation && confirmationError && (
        <div className="day-problem">
          <p className="error-panel" role="alert">{confirmationError}</p>
          <div className="actions">
            <button type="button" className="button secondary" aria-disabled={checking || navigating}
              onClick={() => void verifyUnresolved()}>Kontroller lagret tilstand</button>
            {after && <button type="button" className="button primary" aria-disabled={checking || navigating}
              onClick={event => {
                if (unresolved.current && !confirmingRef.current && !navigating) {
                  setDialog({ kind: 'confirm', snapshot: unresolved.current, trigger: event.currentTarget })
                }
              }}>Prøv bekreftelsen igjen</button>}
          </div>
        </div>
      )}
      {draft.problem && (
        <div className="day-problem">
          <p className="error-panel" role="alert">
            Endringene er ikke lagret. Prøv igjen.
            {conflict ? ' Løpet eller den aktive rollen ble endret. Kontroller de lagrede svarene.'
              : ` ${explain(draft.problem.error)}`}
          </p>
          {!conflict && <button className="button secondary" type="button" onClick={() => void editor.retry()}>Prøv igjen</button>}
        </div>
      )}
      {conflict && (
        <section className="saved-snapshot" aria-label={after ? 'Lagrede ettersvar' : 'Lagrede før-svar'}>
          <h2 ref={conflictHeading} tabIndex={-1}>{after ? 'Lagrede ettersvar' : 'Lagrede før-svar'}</h2>
          {conflict.stored ? (
            <>
              <p>Kontroller de lagrede svarene mot utkastet ditt i matrisen.</p>
              <ul>
                {assessmentOf(conflict.stored.selected, options.phase).answers.filter(answer => editor.changed.answers?.[answer.criterionId]).map(answer => {
                  const mine = rows[answer.criterionId]
                  const storedDraft = assessmentOf(conflict.stored!.selected, options.phase).reasonDrafts[answer.criterionId]
                  return (
                    <li key={answer.id}>
                      <strong>{assessment.criteria.find(criterion => criterion.id === answer.criterionId)?.title}</strong>
                      <p>Lagret svar · {answerText(answer)}{answer.reason && ` · ${answer.reason}`}</p>
                      {storedDraft && <p>Lagret begrunnelsesutkast · {storedDraft}</p>}
                      <p>Ditt svar · {answerText(mine)}{mine.reason && ` · ${mine.reason}`}</p>
                      {mine.reasonDraft && <p>Ditt begrunnelsesutkast · {mine.reasonDraft}</p>}
                    </li>
                  )
                })}
                {evaluationFields.filter(field => editor.changed.evaluation?.texts?.[field] !== undefined).map(field => (
                  <li key={field}>
                    <strong>{evaluationLabels[field]}</strong>
                    <p>Lagret tekst · {conflict.stored?.selected.driverAfter?.evaluation?.texts[field]
                      ?? conflict.stored?.selected.driverAfter?.evaluationDraft?.texts[field] ?? 'Tomt'}</p>
                    <p>Din tekst · {draft.texts[field] || 'Tomt'}</p>
                  </li>
                ))}
                {editor.changed.evaluation?.decision && (
                  <li>
                    <strong>Valg for egenevalueringen</strong>
                    <p>Lagret valg · {conflictDecision ? evaluationChoice[conflictDecision] : 'Ingen valgt'}</p>
                    <p>Ditt valg · {evaluationChoice[editor.changed.evaluation.decision]}</p>
                  </li>
                )}
              </ul>
              {after && <p>Gjeldende planlagt siste dag · Dag {conflict.stored.selected.plannedLastDay}</p>}
              <div className="actions">
                {staleRole && <button type="button" className="button secondary" disabled={reviewing}
                  onClick={() => void editor.reloadConflict(true).then(() => recoverFocus())}>Gjenoppta som sjåfør</button>}
                {!staleRole && assessmentOf(conflict.stored.selected, options.phase).editable && (
                  <button type="button" className="button primary" disabled={reviewing}
                    onClick={() => void editor.retry().then(() => recoverFocus(editor.cleanSnapshot()))}>Lagre mine endringer</button>
                )}
                <button type="button" className="button secondary" disabled={reviewing}
                  onClick={() => {
                    const stored = conflict.stored!
                    editor.adopt(stored)
                    recoverFocus(stored.selected)
                  }}>Bruk lagrede svar</button>
              </div>
            </>
          ) : (
            <>
              <p className="field-error">{explain(conflict.readError)}</p>
              <button type="button" className="button secondary" disabled={reviewing}
                onClick={() => void editor.reloadConflict().then(() => recoverFocus())}>Hent lagrede svar</button>
            </>
          )}
        </section>
      )}
      {canEdit && showProblems && issues > 0 && (
        <section className="error-panel baseline-missing" aria-labelledby="baseline-missing-heading">
          <h2 id="baseline-missing-heading" ref={missingHeading} tabIndex={-1}>Mangler før bekreftelse</h2>
          <ul>
            {(Object.entries(dayIssues) as [DayField, string][]).map(([field, message]) => (
              <li key={field}><button type="button" className="issue-link" onClick={() => onDayField(field)}>Dag {dayNumber} · {message}</button></li>
            ))}
            {assessment.criteria.filter(({ id }) => answerIssues[id]).map(({ id, title }) => (
              <li key={id}><button type="button" className="issue-link" onClick={() => focusMatrixField('answer-' + id + '-ok')}>
                {title} · {answerIssues[id]}
              </button></li>
            ))}
          </ul>
        </section>
      )}
      {!showEvaluation && <AssessmentMatrix criteria={assessment.criteria} answers={assessment.answers}
        rows={rows} issues={showProblems ? answerIssues : {}} editable={canEdit} blocked={blockEdits}
        helpDisabled={checking} context={'Sjåfør · ' + phaseName + (after ? ' · Dag ' + dayNumber : '')}
        onHelp={(criterion, trigger) => {
          if (!confirmingRef.current) setDialog({ kind: 'help', criterion, trigger })
        }}
        onChoice={(criterion, value, trigger) => {
          if (blockEdits || confirmingRef.current) return
          if (value === 'not_relevant') {
            setReasonError(false)
            setDialog({ kind: 'reason', criterion, trigger })
          } else editor.update(criterion.id, { value, reason: null })
        }} />}
      {after && (showEvaluation || (!assessment.editable && evaluation && evaluation.state !== 'not_offered')
        || (!assessment.editable && savedDecision) || (!showEvaluation && hasTexts && (!evaluationOffered || issues > 0 || !assessment.editable))) && (
        <section className="evaluation" aria-labelledby="evaluation-heading">
          <h2 id="evaluation-heading" ref={evaluationHeading} tabIndex={-1}>Egenevaluering – frivillig</h2>
          <p>Dag {dayNumber} · <CalendarDate value={evaluation?.date ?? assessment.fields.date} /></p>
          {showEvaluation && <>
            <p className="baseline-state">Alle 22 vurderingspunkter er besvart. {dayNumber === 1 && dayNumber === saved.plannedLastDay
              ? 'Dette er første og planlagt siste dag.' : dayNumber === 1 ? 'Dette er første dag.' : 'Dette er planlagt siste dag.'}</p>
            <p>Du kan skrive litt om dagen eller hoppe over.</p>
          </>}
          {evaluation?.state === 'skipped' && <p>Hoppet over</p>}
          {evaluation?.state === 'submitted' && <p>Innsendt og låst</p>}
          {savedDecision && !evaluation && <p>Valg lagret i utkast · {evaluationChoice[savedDecision]}</p>}
          {!showEvaluation && !evaluationOffered && hasTexts && (!evaluation || evaluation.state === 'not_offered') && (
            <p>Tekst beholdt fra et tidligere tilbud.</p>
          )}
          {(showEvaluation || hasTexts || evaluation?.state === 'submitted') && (
            <EvaluationFields texts={draft.texts} update={showEvaluation && canEdit && !blockEdits
              ? (field, text) => { if (!confirmingRef.current) editor.updateEvaluation({ texts: { [field]: text } }) } : undefined} />
          )}
          {showEvaluation && canEdit && (
            <>
              <p className="hint">Egenevalueringen låses sammen med din bekreftelse av dagens ettervurdering. Alle feltene kan stå tomme.</p>
              <div className="actions">
                <button type="button" className="button secondary" aria-disabled={blockEdits}
                  onClick={() => {
                    if (confirmingRef.current || blockEdits) return
                    setEvaluationStep(false)
                    setRequestedFocus({ target: 'continue' })
                  }}>Tilbake til svarene</button>
                <button type="button" className="button secondary" aria-disabled={blockEdits || Boolean(draft.problem)}
                  onClick={event => { if (!draft.problem && !blockEdits) void continueAfter(event.currentTarget, 'skipped') }}>Hopp over egenevalueringen</button>
                <button type="button" className="button primary" aria-disabled={blockEdits || Boolean(draft.problem)}
                  onClick={event => { if (!draft.problem && !blockEdits) void continueAfter(event.currentTarget, 'submitted') }}>Gå til bekreftelse</button>
              </div>
            </>
          )}
        </section>
      )}
      {canEdit && !showEvaluation && (
        <div className="baseline-confirm">
          {(editor.dirty || draft.writing) && <p className="hint" id="baseline-confirm-hint">Vent til endringene er lagret.</p>}
          <button className="button primary" type="button" aria-disabled={editor.dirty || draft.writing || navigating || checking}
            id={after ? 'driver-after-continue' : undefined}
            aria-describedby={editor.dirty || draft.writing ? 'baseline-confirm-hint' : undefined}
            onClick={event => after ? void continueAfter(event.currentTarget) : checkCompletion(event.currentTarget)}>
            {after ? 'Kontroller og fullfør ettervurderingen' : 'Kontroller og bekreft førvurderingen'}
          </button>
        </div>
      )}
      {dialog && (
        <Modal title={modalTitle} trigger={dialog.trigger} fallbackFocus={conflictHeading}
          dismiss={dismiss} blocking={confirming} help={dialog.kind === 'help'}>
          {dialog.kind === 'help' && (
            <>
              <p>{dialog.criterion.help}</p>
              <button type="button" className="button secondary" onClick={dismiss}>Lukk hjelp</button>
            </>
          )}
          {dialog.kind === 'reason' && (
            <form onSubmit={event => saveReason(event, dialog.criterion.id)}>
              <p className="dialog-context">Sjåfør · {phaseName}{after && ` · Dag ${dayNumber}`}</p>
              <p className="dialog-criterion">{dialog.criterion.title}</p>
              <label htmlFor="baseline-reason">Begrunn hvorfor dette ikke er relevant</label>
              <p id="baseline-reason-hint" className="hint">{reasonRequirement}</p>
              <textarea id="baseline-reason" ref={reasonField} value={rows[dialog.criterion.id].reasonDraft
                ?? rows[dialog.criterion.id].reason ?? ''}
                readOnly={!canEdit}
                aria-describedby={reasonError ? 'baseline-reason-error' : 'baseline-reason-hint'}
                aria-invalid={reasonError || undefined}
                onChange={event => {
                  editor.update(dialog.criterion.id, { reasonDraft: event.currentTarget.value })
                  setReasonError(false)
                }} />
              {reasonError && <p className="field-error" id="baseline-reason-error" role="alert">{reasonRequirement}</p>}
              <p className="save-status" role="status" aria-atomic="true">{status}</p>
              {draft.problem && <p className="field-error" role="alert">{conflict
                ? 'Utkastet er ikke lagret. Lukk dialogen for å sammenligne med de lagrede svarene.'
                : 'Endringene er ikke lagret. Prøv igjen.'}</p>}
              {draft.problem && !conflict && <button className="button secondary" type="button"
                onClick={() => void editor.retry()}>Prøv igjen</button>}
              <div className="actions">
                <button className="button secondary" type="button" onClick={dismiss}>
                  {conflict ? 'Kontroller lagrede svar' : 'Avbryt'}
                </button>
                <button className="button primary" type="submit" disabled={!canEdit}>Lagre begrunnelse</button>
              </div>
            </form>
          )}
          {dialog.kind === 'confirm' && (
            <>
              <p>Sjåfør · {assessmentOf(dialog.snapshot, options.phase).fields.driverName}</p>
              <p>Dag {dayNumber} · <CalendarDate value={assessmentOf(dialog.snapshot, options.phase).fields.date} /></p>
              {after ? (
                <>
                  <p>Du bekrefter din ettervurdering for dag {dayNumber}.</p>
                  <p><strong>Dagens 22 ettersvar med begrunnelser låses permanent.</strong></p>
                  {(dialog.snapshot.driverAfter?.evaluationOffered || hasTexts) && <p>Egenevalueringen låses sammen med svarene.</p>}
                  {dialog.snapshot.driverAfter?.evaluationOffered && <p>Egenevaluering · {dialog.snapshot.driverAfter.evaluationDraft?.decision === 'skipped'
                    ? 'Hoppet over' : 'Innsending'}</p>}
                  {dayNumber > 1 && <p>Bekreftelsen låser også dagens identitet, dato og tilhørighet.</p>}
                </>
              ) : (
                <>
                  <p>Bekreftelsen låser førvurderingen og identitet, dato og tilhørighet for dag 1.</p>
                  <p><strong>Disse svarene låses og kan ikke endres senere</strong>.</p>
                </>
              )}
              {confirmationError && <p className="field-error" role="alert">{confirmationError}</p>}
              <p role="status" className="save-status">{confirming ? 'Bekrefter …' : ''}</p>
              <div className="actions">
                <button className="button secondary" type="button" aria-disabled={confirming}
                  onClick={() => { if (!confirmingRef.current) dismiss() }}>Avbryt</button>
                <button className="button primary" type="button" aria-disabled={confirming}
                  onClick={() => void confirm(dialog.snapshot)}>{after ? 'Bekreft min del' : 'Bekreft og lås'}</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </section>
  )
}
