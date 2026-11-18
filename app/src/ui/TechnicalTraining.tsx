import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { RunApplication, TechnicalView, WorkspaceView } from '../application/run-application.ts'
import { AppError } from '../domain/run.ts'
import type { Actor, DriverReference, FieldErrors } from '../domain/run.ts'
import {
  technicalCreateFields, technicalFieldLabels, technicalHeaderFields, technicalStatusText, validateTechnicalCreate,
} from '../domain/technical-training.ts'
import type {
  ConfirmTechnicalTraining, CreateTechnicalTraining, TechnicalCreateFields, TechnicalHeader, TechnicalPoint, TechnicalSelection,
} from '../domain/technical-training.ts'
import type { DownloadTechnicalPdf } from '../application/run-pdf.ts'
import { Modal } from './AssessmentMatrix.tsx'
import { CalendarDate, ConfirmationTime } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'
import { PdfDownload } from './RunPdfDownload.tsx'
import { matchesTechnicalView, useTechnicalDraft } from './use-technical-draft.ts'

function HeaderField({ field, value, error, busy, onChange }: {
  field: keyof TechnicalHeader
  value: string
  error?: string
  busy: boolean
  onChange: (value: string) => void
}) {
  const id = `technical-field-${field}`
  return (
    <div className="field">
      <label htmlFor={id}>{technicalFieldLabels[field]}</label>
      <input id={id} name={field} type={field === 'trainingDate' ? 'date' : 'text'} autoComplete="off"
        value={value} required readOnly={busy} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(event.currentTarget.value)} />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}

export function CreateTechnicalForm({ driver, actor, application, navigating, suspended, report, onCreated, onCancel }: {
  driver: DriverReference
  actor: Actor
  application: RunApplication
  navigating: boolean
  suspended: boolean
  report: (error: unknown) => void
  onCreated: (selection: TechnicalSelection) => Promise<void>
  onCancel: () => void
}) {
  const [fields, setFields] = useState<TechnicalCreateFields>({ instructorName: '', busType: '', trainingDate: '' })
  const [errors, setErrors] = useState<FieldErrors<TechnicalCreateFields>>({})
  const [problem, setProblem] = useState('')
  const [writing, setWriting] = useState(false)
  const [committed, setCommitted] = useState<TechnicalSelection>()
  const attempt = useRef<{ fields: TechnicalCreateFields; command: CreateTechnicalTraining }>(undefined)
  const inFlight = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  useLayoutEffect(() => {
    const first = technicalCreateFields.find(field => errors[field])
    if (first) form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
  }, [errors])

  async function submit() {
    if (navigating || inFlight.current) return
    const issues = validateTechnicalCreate(fields)
    setErrors(issues)
    if (Object.keys(issues).length > 0) return
    if (attempt.current?.fields !== fields) {
      attempt.current = { fields, command: application.newCreateTechnicalCommand(actor, driver.id, fields) }
    }
    inFlight.current = true
    setWriting(true)
    setProblem('')
    try {
      const receipt = committed ?? await application.withOpenStorage(() => application.executeTechnical(attempt.current!.command))
      setCommitted(receipt)
      await onCreated(receipt)
    } catch (error) {
      report(error)
      setProblem(technicalProblem(error))
    } finally {
      inFlight.current = false
      setWriting(false)
    }
  }
  if (suspended) return null
  return (
    <form className="create-form" ref={form} noValidate onSubmit={event => {
      event.preventDefault()
      void submit()
    }}>
      <p>{driver.name} · Fiktivt ansattnummer {driver.employeeNumber}</p>
      <div className="form-fields">
        {technicalCreateFields.map(field => <HeaderField key={field} field={field} value={fields[field]}
          error={errors[field]} busy={writing || Boolean(committed)} onChange={value => {
            setFields(previous => ({ ...previous, [field]: value }))
            setErrors(previous => ({ ...previous, [field]: undefined }))
            setProblem('')
          }} />)}
      </div>
      <p className="save-status" role="status">{committed ? 'Lagret på denne enheten' : writing ? 'Lagrer …' : ''}</p>
      {problem && <p className="error-panel" role="alert">{problem}</p>}
      <div className="actions">
        <button className="button primary" type="submit" aria-disabled={writing || navigating}>
          {committed ? 'Åpne lagret dokument' : 'Opprett teknisk opplæring'}
        </button>
        <button className="button secondary" type="button" aria-disabled={writing || navigating}
          onClick={() => { if (!inFlight.current && !navigating) onCancel() }}>Avbryt</button>
      </div>
    </form>
  )
}

export type TechnicalEditorHandle = {
  flush: () => Promise<boolean>
  restore: (latest: TechnicalView) => void
  hasLocalChanges: () => boolean
  clearDialogs: () => void
}

type Props = {
  ref: Ref<TechnicalEditorHandle>
  initial: TechnicalView
  actor: Actor
  application: RunApplication
  navigating: boolean
  suspended: boolean
  download: DownloadTechnicalPdf
  report: (error: unknown) => void
  onStored: (view: WorkspaceView) => void
}

function technicalProblem(error: unknown) {
  if (error instanceof AppError && error.code === 'stale') return 'Dokumentet eller sjåførkonteksten er endret. Kontroller den lagrede versjonen på nytt.'
  if (error instanceof AppError && error.code === 'wrong_role') return 'Den aktive rollen eller sjåførkonteksten har endret seg. Kontroller valgt rolle og sjåfør.'
  return explain(error)
}

type ReasonDialog = { id: string; trigger: HTMLElement; text: string; invalid?: boolean }
type ReviewDialog = { document: TechnicalView; trigger: HTMLElement; name: string; error?: string }

function PointStatus({ point }: { point: TechnicalPoint }) {
  return (
    <>
      <p id={`technical-status-${point.id}`} className="technical-point-status">{technicalStatusText[point.status] ?? 'Ukjent status'}</p>
      {point.status === 'not_applicable' && point.reason &&
        <p id={`technical-active-reason-${point.id}`} className="technical-free-text">{point.reason}</p>}
    </>
  )
}

export function TechnicalTrainingForm({ ref, initial, actor, application, navigating, suspended, download, report, onStored }: Props) {
  const draft = useTechnicalDraft(initial, actor, application, report, suspended)
  const { saved, header, points, conflict, dirty } = draft
  const [reason, setReason] = useState<ReasonDialog>()
  const [review, setReview] = useState<ReviewDialog>()
  const [checked, setChecked] = useState(false)
  const [problem, setProblem] = useState('')
  const [checking, setChecking] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const checkingNow = useRef(false)
  const confirmingNow = useRef(false)
  const confirmAttempt = useRef<ConfirmTechnicalTraining>(undefined)
  const detailsHeading = useRef<HTMLHeadingElement>(null)
  const issueHeading = useRef<HTMLHeadingElement>(null)
  const focusIssues = useRef(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const reasonInput = useRef<HTMLTextAreaElement>(null)
  const locked = saved.status === 'confirmed'
  const editable = !locked && !conflict
  const canFill = editable && actor.role === 'sjåfør'
  const canReview = editable && actor.role === 'instruktør'
  const ready = !locked && !dirty && saved.issues.length === 0
  const status = locked ? '' : draft.error ? 'Endringene er ikke lagret. Prøv igjen.'
    : draft.writing ? 'Lagrer …' : dirty ? 'Endringer er ikke lagret' : 'Lagret på denne enheten'
  const blocked = checking || confirming || navigating

  function clearDialogs() {
    setReason(undefined)
    setReview(undefined)
    confirmAttempt.current = undefined
  }

  useImperativeHandle(ref, () => ({
    flush: () => confirmingNow.current || checkingNow.current ? Promise.resolve(false) : draft.flush(),
    hasLocalChanges: draft.hasLocalChanges,
    clearDialogs,
    restore: latest => {
      if (confirmingNow.current || checkingNow.current) return
      draft.restore(latest)
      if (latest.status === 'confirmed' || (review && latest.revision !== review.document.revision)) clearDialogs()
    },
  }))
  useLayoutEffect(() => {
    if (focusIssues.current && issueHeading.current) {
      focusIssues.current = false
      issueHeading.current.focus()
    }
  })
  useLayoutEffect(() => {
    if (conflict) clearDialogs()
  }, [conflict])

  async function discardConflict() {
    clearDialogs()
    const latest = await draft.discardConflict()
    if (latest) onStored(latest)
    else detailsHeading.current?.focus()
  }

  async function check(trigger: HTMLElement) {
    if (navigating || !canReview || checkingNow.current || confirmingNow.current) return
    checkingNow.current = true
    setChecking(true)
    setProblem('')
    try {
      if (!await draft.flush()) return
      const document = await draft.readLatest()
      draft.restore(document)
      if (document.status === 'confirmed') return
      if (document.issues.length > 0) {
        if (issueHeading.current) issueHeading.current.focus()
        else focusIssues.current = true
        setChecked(true)
        return
      }
      setChecked(false)
      confirmAttempt.current = undefined
      setReview({ document, trigger, name: '' })
    } catch (error) {
      report(error)
      setProblem(technicalProblem(error))
    } finally {
      checkingNow.current = false
      setChecking(false)
    }
  }

  async function confirm() {
    if (!review || navigating || confirmingNow.current || actor.role !== 'instruktør') return
    const { document, name } = review
    if (!name.trim() || name.trim() !== document.header.instructorName.trim()) {
      setReview({ ...review, error: explain(new AppError('technical_instructor')) })
      nameInput.current?.focus()
      return
    }
    if (saved.revision !== document.revision || dirty) {
      setReview(undefined)
      setProblem(technicalProblem(new AppError('stale')))
      return
    }
    confirmAttempt.current ??= application.newConfirmTechnicalCommand(actor, document, name.trim())
    confirmingNow.current = true
    setConfirming(true)
    try {
      await application.withOpenStorage(() => application.executeTechnical(confirmAttempt.current!))
      const latest = await application.withOpenStorage(() => application.read())
      if (!matchesTechnicalView(latest, actor, initial) || latest.technical.status !== 'confirmed') throw new AppError('stale')
      setReview(undefined)
      onStored(latest)
    } catch (error) {
      report(error)
      if (error instanceof AppError && ['stale', 'locked', 'wrong_role', 'command_conflict', 'technical_incomplete'].includes(error.code)) {
        setReview(undefined)
        setProblem(technicalProblem(error))
        try {
          const latest = await application.withOpenStorage(() => application.read())
          if (matchesTechnicalView(latest, actor, initial)) draft.restore(latest.technical)
          else onStored(latest)
        } catch (readError) {
          report(readError)
        }
      } else setReview({ ...review, error: technicalProblem(error) })
    } finally {
      confirmingNow.current = false
      setConfirming(false)
    }
  }

  if (suspended) return null
  const source = saved.snapshot
  const rows = new Map(points.map(row => [row.id, row]))
  const reasonPoint = saved.template.groups.flatMap(group => group.points).find(point => point.id === reason?.id)
  return (
    <div className="technical-training">
      <p className="run-status">{locked ? 'Bekreftet' : 'Utkast'}</p>
      <p>{saved.template.title} · {saved.template.vehicleContext}</p>
      {canFill && <p>Kryss av etter hvert som du går gjennom punktene med instruktøren.</p>}
      {canReview && <p>Sjåføren fyller ut sjekklisten. Kontroller den lagrede utfyllingen før du bekrefter.</p>}
      <p className="save-status" role="status" aria-atomic="true">{status}</p>
      {ready && <p role="status">Klar for instruktørbekreftelse</p>}
      {Boolean(draft.error) && (
        <section className="error-panel" aria-label="Lagringsfeil">
          <p role="alert">{technicalProblem(draft.error)}</p>
          {conflict ? (
            <>
              <h2>Ulagrede endringer</h2>
              <dl className="technical-free-text">
                {technicalHeaderFields.filter(field => draft.changes.header[field] !== undefined).map(field =>
                  <div key={field}><dt>{technicalFieldLabels[field]}</dt><dd>{draft.changes.header[field]}</dd></div>)}
                {Object.entries(draft.changes.points).map(([id, change]) => <div key={id}>
                  <dt>{id}</dt>
                  {change.status && <dd>{technicalStatusText[change.status]}</dd>}
                  {change.status === 'not_applicable' && <dd>{change.reason}</dd>}
                  {change.reasonDraft !== undefined && change.reasonDraft !== (change.status === 'not_applicable' ? change.reason : undefined)
                    && <dd>{change.reasonDraft}</dd>}
                </div>)}
              </dl>
              <button type="button" className="button secondary" onClick={() => { void discardConflict() }}>
                Forkast ulagrede endringer og last inn dokumentet
              </button>
            </>
          ) : <button type="button" className="button secondary" onClick={draft.retrySave}>Prøv lagring igjen</button>}
        </section>
      )}
      {problem && <p className="error-panel" role="alert">{problem}</p>}
      {canReview && (
        <button type="button" className="button primary" aria-disabled={blocked}
          onClick={event => { void check(event.currentTarget) }}>
          {checking ? 'Kontrollerer …' : 'Kontroller teknisk opplæring'}
        </button>
      )}
      {checked && editable && !dirty && saved.issues.length > 0 && (
        <section className="error-panel" aria-labelledby="technical-issues">
          <h2 id="technical-issues" ref={issueHeading} tabIndex={-1}>Mangler før bekreftelse</h2>
          <ul>{saved.issues.map(issue => {
            const target = issue.pointId ? `technical-point-${issue.pointId}` : issue.field && `technical-field-${issue.field}`
            return <li key={target ?? 'reviewed-point'}>{target ? <a href={`#${target}`}
              onClick={event => {
                event.preventDefault()
                document.getElementById(target)?.focus()
              }}>{issue.text}</a> : issue.text}</li>
          })}</ul>
        </section>
      )}
      <section className="technical-details" aria-labelledby="technical-details">
        <h2 id="technical-details" ref={detailsHeading} tabIndex={-1}>Dokumentopplysninger</h2>
        {editable ? (
          <div className="form-fields">{technicalHeaderFields.map(field =>
            <HeaderField key={field} field={field} value={header[field]} busy={blocked}
              error={checked && !dirty ? saved.issues.find(issue => issue.field === field)?.text : undefined}
              onChange={value => draft.updateHeader(field, value)} />)}</div>
        ) : <dl className="details">{technicalHeaderFields.map(field =>
          <div key={field}><dt>{technicalFieldLabels[field]}</dt>
            <dd>{field === 'trainingDate' && header[field] ? <CalendarDate value={header[field]} /> : header[field]}</dd>
          </div>)}</dl>}
      </section>
      {locked && source && (
        <section className="baseline-entry" aria-labelledby="technical-confirmed">
          <h2 id="technical-confirmed">Instruktørbekreftelse</h2>
          {source.filledBy?.name && <p>Utfylt av {source.filledBy.name} · Sjåfør</p>}
          {source.confirmation?.actor?.name && <p>Teknisk opplæring bekreftet av {source.confirmation.actor.name}</p>}
          {source.confirmation?.confirmedAt && Number.isFinite(Date.parse(source.confirmation.confirmedAt))
            && <p>Instruktør · <ConfirmationTime value={source.confirmation.confirmedAt} /></p>}
          <PdfDownload busy={navigating} download={signal => download(initial, signal)} report={report} />
        </section>
      )}
      {saved.template.groups.map(group => (
        <section key={group.order} className="technical-group" aria-labelledby={`technical-group-${group.order}`}>
          <h2 id={`technical-group-${group.order}`}>{group.order}. {group.title}</h2>
          <ol>{group.points.map(point => {
            const row = rows.get(point.id)!
            const label = `${point.id} ${point.text}`
            const reasonAction = row.status === 'not_applicable' ? 'Rediger begrunnelse' : 'Gjelder ikke busstypen'
            const description = `technical-status-${point.id}${row.status === 'not_applicable' && row.reason
              ? ` technical-active-reason-${point.id}` : ''}`
            return (
              <li key={point.id} id={`technical-point-${point.id}`} tabIndex={-1}>
                <h3>{label}</h3>
                {point.note && <p className="technical-note">{point.note}</p>}
                <PointStatus point={row} />
                {canFill && <div className="actions technical-point-actions">
                  <label className="technical-check">
                    <input type="checkbox" aria-label={`Gjennomgått · ${label} · Teknisk opplæring for ${header.driverName}, ${header.busType}, ${header.trainingDate}`}
                      aria-describedby={description}
                      checked={row.status === 'reviewed'} disabled={blocked} onChange={event => {
                        draft.updatePoint(point.id, { status: event.currentTarget.checked ? 'reviewed' : 'pending' })
                      }} />
                    Gjennomgått
                  </label>
                  <button type="button" className="button secondary" aria-label={`${reasonAction} · ${label}`}
                    aria-disabled={blocked} onClick={event => {
                      if (!blocked) setReason({ id: point.id, trigger: event.currentTarget, text: row.reasonDraft ?? row.reason ?? '' })
                    }}>{reasonAction}</button>
                  {row.status === 'not_applicable' && <button type="button" className="button secondary" aria-disabled={blocked}
                    aria-label={`Til Ikke gjennomgått · ${label}`}
                    onClick={() => { if (!blocked) draft.updatePoint(point.id, { status: 'pending' }) }}>Til Ikke gjennomgått</button>}
                </div>}
              </li>
            )
          })}</ol>
        </section>
      ))}
      {reason && reasonPoint && canFill && <Modal title="Gjelder ikke busstypen" trigger={reason.trigger}
        fallbackFocus={detailsHeading} dismiss={() => setReason(undefined)}>
        <p className="dialog-criterion">{reasonPoint.id} {reasonPoint.text}</p>
        <form onSubmit={event => {
          event.preventDefault()
          if (!reason.text.trim()) {
            setReason({ ...reason, invalid: true })
            reasonInput.current?.focus()
            return
          }
          draft.updatePoint(reason.id, { status: 'not_applicable', reason: reason.text, reasonDraft: reason.text })
          setReason(undefined)
        }} noValidate>
          <label htmlFor="technical-reason">Begrunnelse</label>
          <textarea id="technical-reason" ref={reasonInput} value={reason.text} required aria-invalid={reason.invalid || undefined}
            aria-describedby={reason.invalid ? 'technical-reason-error' : undefined} onChange={event => {
              const text = event.currentTarget.value
              setReason({ ...reason, text, invalid: false })
              draft.updatePoint(reason.id, { reasonDraft: text })
            }} />
          {reason.invalid && <p className="field-error" id="technical-reason-error">Forklar hvorfor punktet ikke gjelder busstypen.</p>}
          <div className="actions">
            <button className="button primary" type="submit">Lagre begrunnelse</button>
            <button className="button secondary" type="button" onClick={() => setReason(undefined)}>Avbryt</button>
          </div>
        </form>
      </Modal>}
      {review && canReview && <Modal title="Bekreft teknisk opplæring" trigger={review.trigger} fallbackFocus={detailsHeading}
        blocking={confirming} dismiss={() => setReview(undefined)}>
        <p>{review.document.header.driverName} · Fiktivt ansattnummer {review.document.header.employeeNumber}</p>
        <p>{review.document.header.busType} · <CalendarDate value={review.document.header.trainingDate} /></p>
        <p>Instruktør i dokumentet · {review.document.header.instructorName}</p>
        <p>Du bekrefter gjennomgangen og sjåførens utfylling. Hele dokumentet låses permanent.</p>
        <form onSubmit={event => {
          event.preventDefault()
          void confirm()
        }} noValidate>
          <div className="field">
            <label htmlFor="technical-confirming-instructor">Bekreftende instruktør</label>
            <input id="technical-confirming-instructor" ref={nameInput} value={review.name} required readOnly={confirming}
              autoComplete="off" aria-invalid={review.error ? true : undefined}
              aria-describedby={review.error ? 'technical-confirm-error' : undefined} onChange={event => {
                confirmAttempt.current = undefined
                setReview({ ...review, name: event.currentTarget.value, error: undefined })
              }} />
            {review.error && <p className="field-error" id="technical-confirm-error" role="alert">{review.error}</p>}
          </div>
          <div className="actions">
            <button className="button primary" type="submit" aria-disabled={confirming}>
              {confirming ? 'Bekrefter …' : 'Bekreft teknisk opplæring'}
            </button>
            <button className="button secondary" type="button" aria-disabled={confirming} onClick={() => {
              if (!confirmingNow.current) setReview(undefined)
            }}>Avbryt</button>
          </div>
        </form>
      </Modal>}
    </div>
  )
}
