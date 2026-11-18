import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, Ref, RefObject } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { confirmationView } from '../application/run-application.ts'
import { answerValues, checkBaselineAnswers } from '../domain/baseline.ts'
import type { BaselineDraftRow, ConfirmBaselineCommand } from '../domain/baseline.ts'
import { checkDayFields } from '../domain/day-draft.ts'
import type { DayField } from '../domain/day-draft.ts'
import { reasonRequirement, validateReason } from '../domain/reason.ts'
import { criterionIds } from '../domain/run.ts'
import type { Actor, Criterion, RunReceipt } from '../domain/run.ts'
import { CalendarDate } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'
import { useBaselineDraft } from './use-baseline-draft.ts'

type Props = {
  ref: Ref<{ flush: () => Promise<boolean> }>
  initial: DayView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
  onDayField: (field: DayField) => void
  onConfirmIssue: (message: string) => void
  navigating: boolean
}

const answerLabels = {
  ok: 'OK', needs_improvement: 'Kan bli bedre', not_relevant: 'Ikke relevant',
} as const
const confirmationDate = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Oslo',
})

const groups = [
  ['Sjåfør', 0, 4],
  ['Buss', 4, 11],
  ['Trafikk / kjøreteknikk · Sjåfør', 11, 14],
  ['Trafikk / kjøreteknikk · Samhandling', 14, 18],
  ['Trafikk / kjøreteknikk · Optimal kjøreteknikk', 18, 22],
] as const

function groupedCriteria(criteria: readonly Criterion[]) {
  const sections: { name: string; rows: { criterion: Criterion; number: number }[] }[] = []
  for (const criterion of criteria) {
    const index = criterionIds.indexOf(criterion.id)
    const [name] = groups.find(([, from, to]) => index >= from && index < to)!
    if (sections.at(-1)?.name !== name) sections.push({ name, rows: [] })
    sections.at(-1)!.rows.push({ criterion, number: index + 1 })
  }
  return sections
}

type Dialog =
  | { kind: 'help' | 'reason'; criterion: Criterion; trigger: HTMLElement }
  | { kind: 'confirm'; snapshot: DayView; trigger: HTMLElement }

function answerText(row: Pick<BaselineDraftRow, 'value'>) {
  return row.value === null ? 'Ubesvart' : `Valgt · ${answerLabels[row.value]}`
}

function keepFocusVisible(target: HTMLElement, header: HTMLElement | null) {
  if (!target.isConnected || document.activeElement !== target) return
  const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0)
  const bounds = target.getBoundingClientRect()
  if (bounds.top < top + 8 || bounds.bottom > window.innerHeight - 8) {
    window.scrollBy(0, bounds.top - (header?.offsetHeight ?? 0) - 10)
  }
}

function Modal({ title, trigger, fallbackFocus, dismiss, blocking, help, children }: {
  title: string
  trigger: HTMLElement
  fallbackFocus: RefObject<HTMLHeadingElement | null>
  dismiss: () => void
  blocking?: boolean
  help?: boolean
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current
    const viewport = window.visualViewport
    const fitViewport = () => {
      if (!element || !viewport) return
      element.style.setProperty('--dialog-center', `${viewport.offsetTop + viewport.height / 2}px`)
      element.style.setProperty('--dialog-view-height', `${viewport.height}px`)
    }
    fitViewport()
    viewport?.addEventListener('resize', fitViewport)
    viewport?.addEventListener('scroll', fitViewport)
    element?.showModal()
    heading.current?.focus()
    return () => {
      viewport?.removeEventListener('resize', fitViewport)
      viewport?.removeEventListener('scroll', fitViewport)
      element?.close()
      // Konfliktoverskriften kan monteres mens dialogen står åpen.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const target = trigger.isConnected ? trigger : fallbackFocus.current
      target?.focus()
    }
  }, [trigger, fallbackFocus])

  return (
    <dialog ref={dialog} className={`assessment-dialog${help ? ' help-dialog' : ''}`}
      aria-labelledby="assessment-dialog-title" onCancel={event => {
        event.preventDefault()
        if (!blocking) dismiss()
      }}>
      <h2 id="assessment-dialog-title" ref={heading} tabIndex={-1}>{title}</h2>
      {children}
    </dialog>
  )
}

export function BaselineForm({ ref, onDayField, onConfirmIssue, navigating, ...options }: Props) {
  const editor = useBaselineDraft(options)
  const { draft, conflict, staleRole, reviewing } = editor
  const { saved, rows } = draft
  const { baseline } = saved
  const confirmation = conflict?.stored?.selected.baseline.confirmation ?? baseline.confirmation
  const [dialog, setDialog] = useState<Dialog>()
  const [showProblems, setShowProblems] = useState(false)
  const [reasonError, setReasonError] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState('')
  const confirmingRef = useRef(false)
  const confirmationAttempt = useRef<ConfirmBaselineCommand>(undefined)
  const verifiedAbort = useRef(false)
  const matrix = useRef<HTMLDivElement>(null)
  const columnHeadings = useRef<HTMLDivElement>(null)
  const missingHeading = useRef<HTMLHeadingElement>(null)
  const conflictHeading = useRef<HTMLHeadingElement>(null)
  const lockedStatus = useRef<HTMLParagraphElement>(null)
  const focusLockedStatus = useRef(false)
  const reasonField = useRef<HTMLTextAreaElement>(null)
  const pointerFocus = useRef(false)
  const canEdit = baseline.editable && !conflict
  const answerIssues = checkBaselineAnswers(baseline.answers.map(answer => ({ ...answer, ...rows[answer.criterionId] })))
  const dayIssues = checkDayFields(baseline.fields, 'driver')
  const issues = Object.keys(answerIssues).length + Object.keys(dayIssues).length

  useLayoutEffect(() => {
    if (!baseline.confirmation || !focusLockedStatus.current) return
    focusLockedStatus.current = false
    lockedStatus.current?.focus()
  }, [baseline.confirmation])

  useLayoutEffect(() => {
    const header = columnHeadings.current
    const container = matrix.current
    if (!header || !container) return
    const update = () => container.style.setProperty('--matrix-heading-height', `${header.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useImperativeHandle(ref, () => ({ flush: () => confirmingRef.current ? Promise.resolve(false) : editor.flush() }))

  function dismiss() {
    if (dialog?.kind === 'confirm' && verifiedAbort.current) {
      confirmationAttempt.current = undefined
      verifiedAbort.current = false
    }
    setDialog(undefined)
    setReasonError(false)
    setConfirmationError('')
  }

  function focusAnswer(criterionId: string) {
    const target = document.getElementById(`answer-${criterionId}-ok`)
    target?.focus({ preventScroll: true })
    if (target) keepFocusVisible(target, columnHeadings.current)
  }

  function checkCompletion(trigger: HTMLElement) {
    const snapshot = editor.cleanSnapshot()
    if (!snapshot?.baseline.editable || navigating) return
    if (issues) {
      setShowProblems(true)
      requestAnimationFrame(() => missingHeading.current?.focus())
      return
    }
    setShowProblems(false)
    setConfirmationError('')
    setDialog({ kind: 'confirm', snapshot, trigger })
  }

  function saveReason(event: FormEvent<HTMLFormElement>, criterionId: string) {
    event.preventDefault()
    if (!canEdit) return
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
    if (confirmingRef.current || editor.cleanSnapshot()?.revision !== snapshot.revision) return
    confirmingRef.current = true
    verifiedAbort.current = false
    setConfirming(true)
    setConfirmationError('')
    const { actor, application, report } = options
    if (confirmationAttempt.current?.expectedRevision !== snapshot.revision) {
      confirmationAttempt.current = application.newConfirmBaselineCommand(actor, snapshot.id, snapshot.revision)
    }

    const command = confirmationAttempt.current
    let failure: unknown
    let receipt: RunReceipt | undefined
    try {
      receipt = await application.withOpenStorage(() => application.executeConfirmBaseline(command))
    } catch (error) {
      failure = error
      report(error)
    }
    const { stored, readError } = await editor.readStored()
    // Ved lesefeil kan en kvittert, uendret dialogrevisjon fremdeles vises som låst.
    const acknowledged = receipt && confirmationView(snapshot, command, receipt)
    const roleChanged = stored && (stored.actor.id !== actor.id || stored.actor.role !== actor.role)
    const changed = stored && (stored.selected.revision !== snapshot.revision || roleChanged)
    if (acknowledged || changed) {
      const locked = Boolean((stored?.selected ?? acknowledged)?.baseline.confirmation)
      focusLockedStatus.current = locked
      dismiss()
      if (stored) editor.adopt(stored)
      else if (acknowledged) editor.accept(acknowledged)
      if (!locked) {
        onConfirmIssue(roleChanged
          ? 'Den aktive rollen ble endret i en annen fane. Velg sjåførrollen for å bekrefte førvurderingen.'
          : 'Løpet ble endret. Kontroller de lagrede opplysningene før du bekrefter på nytt.')
      }
    } else {
      verifiedAbort.current = Boolean(failure && stored && !stored.selected.baseline.confirmation)
      setConfirmationError(verifiedAbort.current
        ? `Førvurderingen kunne ikke bekreftes. ${explain(failure)}`
        : `Status for førbekreftelsen kunne ikke leses. Prøv igjen. ${explain(readError)}`)
    }
    confirmingRef.current = false
    setConfirming(false)
  }

  const modalTitle = dialog?.kind === 'help' ? `Hjelp om ${dialog.criterion.title}`
    : dialog?.kind === 'reason' ? 'Begrunn Ikke relevant'
      : 'Bekreft førvurderingen'
  const status = draft.problem && !draft.writing ? 'Ulagrede endringer'
    : editor.dirty || draft.writing ? 'Lagrer …' : 'Lagret på denne enheten'

  return (
    <section aria-label="Sjåførens førvurdering">
      <p className="context">Sjåfør · {baseline.fields.driverName || 'Sjåførnavn mangler'} · Dag 1 · <CalendarDate value={baseline.fields.date} /></p>
      <p ref={lockedStatus} tabIndex={-1} className="baseline-state">
        {confirmation
          ? <>Låst. Bekreftet av {confirmation.actor.name}, sjåfør.</>
          : 'Ikke bekreftet'}
      </p>
      {confirmation && (
        <p className="hint">
          Bekreftelsestid{' '}
          <time dateTime={confirmation.confirmedAt}>
            {confirmationDate.format(new Date(confirmation.confirmedAt))}
          </time>
        </p>
      )}
      <p className="save-status" role={dialog ? undefined : 'status'} aria-atomic={dialog ? undefined : true}>{status}</p>
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
        <section className="saved-snapshot" aria-label="Lagrede før-svar">
          <h2 ref={conflictHeading} tabIndex={-1}>Lagrede før-svar</h2>
          {conflict.stored ? (
            <>
              <p>Kontroller de lagrede svarene mot utkastet ditt i matrisen.</p>
              <ul>
                {conflict.stored.selected.baseline.answers.filter(answer => editor.changed[answer.criterionId]).map(answer => {
                  const mine = rows[answer.criterionId]
                  const storedDraft = conflict.stored?.selected.baseline.reasonDrafts[answer.criterionId]
                  return (
                    <li key={answer.id}>
                      <strong>{baseline.criteria.find(criterion => criterion.id === answer.criterionId)?.title}</strong>
                      <p>Lagret svar · {answerText(answer)}{answer.reason && ` · ${answer.reason}`}</p>
                      {storedDraft && <p>Lagret begrunnelsesutkast · {storedDraft}</p>}
                      <p>Ditt svar · {answerText(mine)}{mine.reason && ` · ${mine.reason}`}</p>
                      {mine.reasonDraft && <p>Ditt begrunnelsesutkast · {mine.reasonDraft}</p>}
                    </li>
                  )
                })}
              </ul>
              <div className="actions">
                {staleRole && <button type="button" className="button secondary" disabled={reviewing}
                  onClick={() => void editor.reloadConflict(true)}>Gjenoppta som sjåfør</button>}
                {!staleRole && conflict.stored.selected.baseline.editable && (
                  <button type="button" className="button primary" disabled={reviewing}
                    onClick={() => void editor.retry()}>Lagre mine endringer</button>
                )}
                <button type="button" className="button secondary" disabled={reviewing}
                  onClick={() => editor.adopt(conflict.stored!)}>Bruk lagrede svar</button>
              </div>
            </>
          ) : (
            <>
              <p className="field-error">{explain(conflict.readError)}</p>
              <button type="button" className="button secondary" disabled={reviewing}
                onClick={() => void editor.reloadConflict()}>Hent lagrede svar</button>
            </>
          )}
        </section>
      )}
      {canEdit && showProblems && issues > 0 && (
        <section className="error-panel baseline-missing" aria-labelledby="baseline-missing-heading">
          <h2 id="baseline-missing-heading" ref={missingHeading} tabIndex={-1}>Mangler før bekreftelse</h2>
          <ul>
            {(Object.entries(dayIssues) as [DayField, string][]).map(([field, message]) => (
              <li key={field}><button type="button" className="issue-link" onClick={() => onDayField(field)}>Dag 1 · {message}</button></li>
            ))}
            {baseline.criteria.filter(({ id }) => answerIssues[id]).map(({ id, title }) => (
              <li key={id}><button type="button" className="issue-link" onClick={() => focusAnswer(id)}>
                {title} · {answerIssues[id]}
              </button></li>
            ))}
          </ul>
        </section>
      )}
      <div className="assessment-matrix" ref={matrix}
        onPointerDownCapture={() => {
          pointerFocus.current = true
          requestAnimationFrame(() => { pointerFocus.current = false })
        }}
        onFocus={event => {
          const target = event.target
          if (!pointerFocus.current && target instanceof HTMLElement) {
            keepFocusVisible(target, columnHeadings.current)
            requestAnimationFrame(() => keepFocusVisible(target, columnHeadings.current))
          }
        }}>
        <div className="matrix-headings" ref={columnHeadings}>
          <span>Vurderingspunkt</span>
          <span>OK</span>
          <span>Kan bli bedre</span>
          <span>Ikke relevant</span>
        </div>
        {groupedCriteria(baseline.criteria).map(({ name, rows: sectionRows }) => {
          const headingId = `baseline-category-${sectionRows[0].criterion.id}`
          return <section key={headingId} aria-labelledby={headingId}>
            <h2 id={headingId} className="category">{name}</h2>
            {sectionRows.map(({ criterion, number }) => {
              const { id, title } = criterion
              const row = rows[id]
              const issue = canEdit && showProblems && answerIssues[id]
              return (
                <div className="matrix-row" key={id} role="group" aria-labelledby={`title-${id}`}>
                  <div className="matrix-criterion">
                    <div className="criterion-number">
                      <span aria-hidden="true">{number}</span>
                      <button type="button" className="help-trigger" aria-label={`Hjelp om ${title}`}
                        onClick={event => setDialog({ kind: 'help', criterion, trigger: event.currentTarget })}>?</button>
                    </div>
                    <p id={`title-${id}`}>{title}</p>
                    <p className="matrix-state">{answerText(row)}</p>
                    {issue && <p className="field-error" id={`baseline-issue-${id}`}>{issue}</p>}
                  </div>
                  {answerValues.map(value => canEdit ? (
                    <button key={value} id={`answer-${id}-${value}`} type="button" className="matrix-choice"
                      aria-label={`${answerLabels[value]} · ${title} · Sjåfør · Førvurdering`}
                      aria-pressed={row.value === value}
                      aria-describedby={issue ? `baseline-issue-${id}` : undefined}
                      aria-invalid={issue ? true : undefined} aria-disabled={navigating}
                      onClick={event => {
                        if (navigating) return
                        if (value === 'not_relevant') {
                          setReasonError(false)
                          setDialog({ kind: 'reason', criterion, trigger: event.currentTarget })
                        } else editor.update(id, { value, reason: null })
                      }}><span className="choice-dot" aria-hidden="true" /></button>
                  ) : (
                    <span key={value} className="matrix-choice choice-read-only" aria-hidden="true">
                      <span className={`choice-dot${row.value === value ? ' choice-selected' : ''}`} />
                    </span>
                  ))}
                  {row.reason && <p className="matrix-reason">Begrunnelse · {row.reason}</p>}
                </div>
              )
            })}
          </section>
        })}
      </div>
      {canEdit && (
        <div className="baseline-confirm">
          {(editor.dirty || draft.writing) && <p className="hint" id="baseline-confirm-hint">Vent til endringene er lagret.</p>}
          <button className="button primary" type="button" aria-disabled={editor.dirty || draft.writing || navigating}
            aria-describedby={editor.dirty || draft.writing ? 'baseline-confirm-hint' : undefined}
            onClick={event => checkCompletion(event.currentTarget)}>Kontroller og bekreft førvurderingen</button>
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
              <p className="dialog-context">Sjåfør · Førvurdering</p>
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
              <p>Sjåfør · {dialog.snapshot.baseline.fields.driverName}</p>
              <p>Dag 1 · <CalendarDate value={dialog.snapshot.baseline.fields.date} /></p>
              <p>Bekreftelsen låser førvurderingen og identitet, dato og tilhørighet for dag 1.</p>
              <p><strong>Disse svarene låses og kan ikke endres senere</strong>.</p>
              {confirmationError && <p className="field-error" role="alert">{confirmationError}</p>}
              <p role="status" className="save-status">{confirming ? 'Bekrefter …' : ''}</p>
              <div className="actions">
                <button className="button secondary" type="button" aria-disabled={confirming}
                  onClick={() => { if (!confirmingRef.current) dismiss() }}>Avbryt</button>
                <button className="button primary" type="button" aria-disabled={confirming}
                  onClick={() => void confirm(dialog.snapshot)}>Bekreft og lås</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </section>
  )
}
