import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { LineTrainingView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { DownloadLinePdf } from '../application/run-pdf.ts'
import type { LineTemplateRow } from '../content/line-training.v1.ts'
import { extraLines, lineCatalog } from '../content/line-training.v2.ts'
import { checkLineSelection, lineEntryErrors, previouslyRecordedLines } from '../domain/line-training.ts'
import type { AssignLineTraining, ConfirmedLineEntry, ConfirmLineTrainingEntries, LineDraftEntry, LineEntryFields, LineHeader, LineIssue, LineReceipt } from '../domain/line-training.ts'
import { AppError } from '../domain/run.ts'
import type { Actor, DriverReference } from '../domain/run.ts'
import { Modal } from './AssessmentMatrix.tsx'
import { CalendarDate, ConfirmationTime } from './CalendarDate.tsx'
import { PdfDownload } from './RunPdfDownload.tsx'
import { explain } from './app-errors.ts'
import { matchesLineView, useLineDraft } from './use-line-draft.ts'

export type LineEditorHandle = {
  flush: () => Promise<boolean>
  restore: (latest: LineTrainingView) => void
  restoreReadError: (error: AppError) => void
  hasLocalChanges: () => boolean
  clearDialogs: () => void
}
export type LineWorkspaceNotice = { tone: 'status' | 'error'; text: string }

type Props = {
  ref: Ref<LineEditorHandle>
  initial: LineTrainingView
  actor: Actor
  driver?: DriverReference
  application: RunApplication
  navigating: boolean
  suspended: boolean
  download: DownloadLinePdf
  report: (error: unknown) => void
  onStored: (view: WorkspaceView, notice?: LineWorkspaceNotice) => void
  onUnverifiedContext: () => void
  onDriverRole: (target: string) => void
}

type Review = {
  document: LineTrainingView; entries: LineDraftEntry[]; trigger: HTMLElement; instructorName: string; error?: string
}
type Assignment = {
  command: AssignLineTraining; line: LineTemplateRow; driver: DriverReference; trigger: HTMLElement
  receipt?: LineReceipt; error?: string
}

const headerLabels = { driverName: 'Kandidatnavn', employeeNumber: 'Fiktivt ansattnummer' } satisfies Record<keyof LineHeader, string>
const headerFields = Object.keys(headerLabels) as (keyof LineHeader)[]
const catalogById = new Map(lineCatalog.map(line => [line.id, line]))
const previouslyRecordedLabel = 'Tidligere registrert utenfor grunnkurset'
const assignedLabel = 'Individuelt tildelt'

function lineProblem(error: unknown) {
  if (error instanceof AppError && (error.code === 'stale' || error.code === 'locked')) {
    return 'Linjeoversikten er endret. Kontroller den lagrede versjonen og velg registreringene på nytt.'
  }
  if (error instanceof AppError && error.code === 'wrong_role') return 'Kontroller aktiv rolle og valgt sjåfør.'
  return explain(error)
}

function DownloadHistory({ saved, draftCount, busy, download, report }: {
  saved: LineTrainingView; draftCount: number; busy: boolean; download: DownloadLinePdf; report: Props['report']
}) {
  const [version, setVersion] = useState<number>()
  const latest = saved.snapshots.at(-1)
  const source = saved.snapshots.find(source => source.sourceVersion === version) ?? latest
  if (!source) return <p>PDF blir tilgjengelig etter første instruktørbekreftelse.</p>
  return <section className="baseline-entry" aria-labelledby="line-history-download">
    <h2 id="line-history-download" tabIndex={-1}>Bekreftet linjehistorikk</h2>
    <div className="field">
      <label htmlFor="line-history-version">Bekreftet historikkversjon</label>
      <select id="line-history-version" value={source.sourceVersion} disabled={busy} onChange={event => setVersion(Number(event.currentTarget.value))}>
        {saved.snapshots.toReversed().map(snapshot => <option key={snapshot.sourceVersion} value={snapshot.sourceVersion}>
          Versjon {snapshot.sourceVersion}{snapshot === latest ? ' (nyeste)' : ''} · {snapshot.entries.length} bekreftede
        </option>)}
      </select>
    </div>
    <p>Bekreftet frem til <ConfirmationTime value={source.confirmedThrough} />.</p>
    {draftCount > 0 && <p>{draftCount} utkast venter på bekreftelse og inngår ikke i PDF-filen.</p>}
    {source !== latest && <p>Bekreftelser etter versjon {source.sourceVersion} inngår ikke i PDF-filen.</p>}
    <PdfDownload key={source.sourceVersion} busy={busy} label="Last ned bekreftet linjeopplæring"
      download={signal => download({ documentType: saved.documentType, documentId: saved.documentId, sourceVersion: source.sourceVersion }, signal)} report={report} />
  </section>
}

function LineOverviewRows({ lines, confirmed, drafts = [] }: {
  lines: LineTemplateRow[]
  confirmed: ConfirmedLineEntry[]
  drafts?: LineEntryFields[]
}) {
  return <ul className="line-rows">{lines.map(line => {
    const dated = confirmed.filter(entry => entry.lineId === line.id).toSorted((a, b) => a.drivenDate.localeCompare(b.drivenDate))
    const draftCount = drafts.filter(entry => entry.lineId === line.id).length
    return <li key={line.id} className="line-row" data-line-id={line.id}>
      <h3>Linje {line.label}</h3>
      {line.note && <p className="technical-note">{line.note}</p>}
      {draftCount > 0 && <p>{draftCount} utkast</p>}
      {dated.length ? <ul className="line-dates">{dated.map(entry => <li key={entry.entryId} data-entry-id={entry.entryId}>
        <p><CalendarDate value={entry.drivenDate} /> · <strong>Bekreftet</strong></p>
        <p>Utfylt av {entry.author.name} · Sjåfør</p>
        <p>Bekreftet av {entry.confirmation.actor.name} · Instruktør · <ConfirmationTime value={entry.confirmation.confirmedAt} /></p>
      </li>)}</ul> : <p>Ingen bekreftet kjøredato</p>}
    </li>
  })}</ul>
}

export function LineTrainingForm({ ref, initial, actor, driver, application, navigating, suspended, download, report,
  onStored, onUnverifiedContext, onDriverRole }: Props) {
  const draft = useLineDraft(initial, actor, application, report, suspended)
  const { saved, header, entries, dirty } = draft
  const [selection, setSelection] = useState<string[]>([])
  const [issues, setIssues] = useState<LineIssue[]>([])
  const [review, setReview] = useState<Review>()
  const [lineToAssign, setLineToAssign] = useState('')
  const [assignment, setAssignment] = useState<Assignment>()
  const [assignmentStatus, setAssignmentStatus] = useState('')
  const [assignmentProblem, setAssignmentProblem] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const working = useRef(false)
  const confirmation = useRef<ConfirmLineTrainingEntries>(undefined)
  const focusField = useRef<string>(undefined)
  const add = useRef<HTMLButtonElement>(null)
  const candidateHeading = useRef<HTMLHeadingElement>(null)
  const assignedHeading = useRef<HTMLHeadingElement>(null)
  const instructorInput = useRef<HTMLInputElement>(null)
  const canFill = !draft.conflict && !saved.assignmentProblem && actor.role === 'sjåfør'
  const canReview = !draft.conflict && !saved.assignmentProblem && actor.role === 'instruktør'
  const canAssign = canReview && driver?.id === saved.driverRef
  const canEditHeader = canReview && !saved.snapshots.length
  const blocked = busy || navigating
  const drafts = entries.filter(entry => entry.status === 'draft')
  const confirmed = saved.entries.filter(entry => entry.status === 'confirmed')
  const assignedIds = new Set(saved.assignedLines.map(line => line.id))
  const assignable = extraLines.filter(line => !assignedIds.has(line.id))
  const chosenLine = assignable.find(line => line.id === lineToAssign)
  const recordedExtraLines = previouslyRecordedLines(saved.entries).filter(line => !assignedIds.has(line.id))
  const savedEntries = new Map(saved.entries.map(entry => [entry.entryId, entry]))
  const standardIds = new Set(saved.template.lines.map(line => line.id))
  const firstDriverIssue = issues.find(issue => issue.entryId)
  const now = new Date().toISOString()

  function clearDialogs() {
    setReview(undefined)
    setAssignment(undefined)
    confirmation.current = undefined
  }

  function dismissAssignment() {
    if (working.current) return
    if (assignment?.receipt) setAssignmentStatus('Linjetildelingen er lagret. Visningen kunne ikke oppdateres.')
    clearDialogs()
  }

  useImperativeHandle(ref, () => ({
    flush: () => working.current ? Promise.resolve(false) : draft.flush(),
    hasLocalChanges: draft.hasLocalChanges,
    clearDialogs,
    restoreReadError: error => {
      clearDialogs()
      draft.restoreReadError(error)
    },
    restore: latest => {
      if (working.current) return
      draft.restore(latest)
      if (latest.revision !== saved.revision) {
        setSelection([])
        setIssues([])
        if (review || (assignment && !assignment.receipt)) {
          clearDialogs()
          if (review) setProblem(lineProblem(new AppError('stale')))
          if (assignment) setAssignmentProblem('Linjeoversikten er endret. Velg linjen på nytt.')
        }
      }
    },
  }))

  useLayoutEffect(() => {
    if (suspended || !focusField.current) return
    document.getElementById(focusField.current)?.focus()
    focusField.current = undefined
  })

  function addEntry() {
    if (blocked || !canFill) return
    const id = application.newLineEntryId()
    focusField.current = `line-code-${id}`
    draft.changeEntry(id, { lineId: '', drivenDate: '' })
  }

  function setEntryField(entry: LineEntryFields & { entryId: string }, field: keyof LineEntryFields, value: string) {
    if (blocked || !canFill) return
    draft.changeEntry(entry.entryId, { lineId: entry.lineId, drivenDate: entry.drivenDate, [field]: value })
  }

  async function check(trigger: HTMLElement) {
    if (blocked || !canReview || working.current) return
    working.current = true
    setBusy(true)
    setProblem('')
    try {
      if (!await draft.flush()) return
      const latest = await draft.readLatest()
      draft.restore(latest)
      const issues = checkLineSelection(latest, selection, latest.driverActorId, new Date().toISOString())
      setIssues(issues)
      if (issues.length) {
        focusField.current = 'line-issues'
        return
      }
      const entries = latest.entries.filter((entry): entry is LineDraftEntry => entry.status === 'draft' && selection.includes(entry.entryId))
      setReview({ document: latest, entries, trigger, instructorName: '' })
      confirmation.current = undefined
    } catch (error) {
      report(error)
      setProblem(lineProblem(error))
    } finally {
      working.current = false
      setBusy(false)
    }
  }

  async function confirm() {
    if (!review || navigating || working.current || !canReview) return
    if (!review.instructorName.trim()) {
      setReview({ ...review, error: explain(new AppError('line_instructor')) })
      instructorInput.current?.focus()
      return
    }
    confirmation.current ??= application.newConfirmLineCommand(actor, review.document,
      review.entries.map(entry => entry.entryId), review.instructorName)
    working.current = true
    setBusy(true)
    try {
      const receipt = await application.withOpenStorage(() => application.executeLineTraining(confirmation.current!))
      const latest = await application.withOpenStorage(() => application.read())
      clearDialogs()
      if (!matchesLineView(latest, actor, initial)) {
        onStored(latest)
        return
      }
      if (!latest.lineTraining.snapshots.some(snapshot => snapshot.sourceVersion === receipt.sourceVersion)) throw new AppError('line_history')
      draft.restore(latest.lineTraining)
      setSelection([])
      setIssues([])
      focusField.current = 'line-history-download'
    } catch (error) {
      report(error)
      if (error instanceof AppError && ['stale', 'locked', 'wrong_role', 'line_incomplete', 'command_conflict'].includes(error.code)) {
        clearDialogs()
        setProblem(lineProblem(error))
        try {
          const latest = await application.withOpenStorage(() => application.read())
          if (matchesLineView(latest, actor, initial)) {
            draft.restore(latest.lineTraining)
            setSelection([])
          } else onStored(latest)
        } catch (readError) { report(readError) }
      } else {
        if (error instanceof AppError && error.code === 'line_clock') confirmation.current = undefined
        setReview({ ...review, error: lineProblem(error) })
      }
    } finally {
      working.current = false
      setBusy(false)
    }
  }

  async function reviewAssignment(trigger: HTMLElement) {
    if (blocked || working.current || !canAssign || !chosenLine) return
    working.current = true
    setBusy(true)
    setAssignmentStatus('')
    setAssignmentProblem('')
    try {
      if (!await draft.flush()) return
      const latest = await application.withOpenStorage(() => application.read())
      if (!matchesLineView(latest, actor, initial)) {
        onStored(latest, { tone: 'error', text: 'Linjetildelingen ble ikke startet. Det aktive valget er endret.' })
        return
      }
      draft.restore(latest.lineTraining)
      if (latest.lineTraining.assignmentProblem) return
      if (latest.lineTraining.assignedLines.some(line => line.id === chosenLine.id)) {
        setAssignmentStatus(`Linje ${chosenLine.label} er allerede tildelt.`)
        return
      }
      const command = application.newAssignLineCommand(actor, latest.lineTraining, chosenLine.id)
      setAssignment({ command, line: chosenLine, driver, trigger })
    } catch (error) {
      report(error)
      setAssignmentProblem(`Tildelingen kunne ikke klargjøres. ${explain(error)}`)
    } finally {
      working.current = false
      setBusy(false)
    }
  }

  async function confirmAssignment() {
    if (!assignment || navigating || working.current || (!assignment.receipt && !canAssign)) return
    working.current = true
    setBusy(true)
    let receipt = assignment.receipt
    try {
      receipt ??= await application.withOpenStorage(() => application.executeLineTraining(assignment.command))
      const latest = await application.withOpenStorage(() => application.read())
      if (!matchesLineView(latest, actor, initial)) {
        clearDialogs()
        onStored(latest, { tone: 'status', text: 'Linjetildelingen er lagret.' })
        return
      }
      if (!latest.lineTraining.assignedLines.some(line => line.id === assignment.line.id)) throw new AppError('line_assignment_read')
      draft.restore(latest.lineTraining)
      clearDialogs()
      setLineToAssign('')
      setAssignmentStatus(`Linje ${assignment.line.label} er tildelt og lagret på denne enheten.`)
      focusField.current = 'line-assigned'
    } catch (error) {
      report(error)
      if (receipt) {
        setAssignment({ ...assignment, receipt, error: 'Linjetildelingen er lagret. Visningen kunne ikke oppdateres.' })
      } else if (error instanceof AppError && ['stale', 'wrong_role', 'command_conflict', 'line_document_missing', 'line_assignment_read'].includes(error.code)) {
        clearDialogs()
        try {
          const latest = await application.withOpenStorage(() => application.read())
          if (matchesLineView(latest, actor, initial)) {
            draft.restore(latest.lineTraining)
            setAssignmentProblem('Linjetildelingen ble ikke lagret. Kontroller linjeoversikten og prøv igjen.')
          } else onStored(latest, { tone: 'error', text: 'Linjetildelingen ble ikke lagret. Det aktive valget er endret.' })
        } catch (readError) {
          report(readError)
          onUnverifiedContext()
        }
      } else setAssignment({ ...assignment, error: `Tildelingen kunne ikke lagres. ${explain(error)}` })
    } finally {
      working.current = false
      setBusy(false)
    }
  }

  async function discardChanges() {
    if (blocked || working.current) return
    working.current = true
    setBusy(true)
    try {
      const latest = await draft.discardChanges()
      if (latest) onStored(latest)
    } finally {
      working.current = false
      setBusy(false)
    }
  }

  if (suspended) return null
  const status = draft.error ? 'Endringene er ikke lagret. Prøv igjen.' : draft.writing ? 'Lagrer …'
    : dirty ? 'Endringer er ikke lagret' : 'Lagret på denne enheten'

  const saveRecovery = Boolean(draft.error) && <section className="error-panel" aria-label="Lagringsfeil">
      <p role="alert">{draft.readRestriction === 'unverified'
        ? 'Den aktive linjeoversikten kunne ikke verifiseres. Ulagrede endringer er midlertidig skjult.'
        : lineProblem(draft.error)}</p>
      {draft.conflict && draft.readRestriction !== 'unverified' && <>
        <h2>Ulagrede endringer</h2>
        <ul className="line-conflict">
          {headerFields.filter(field => draft.changes.header[field] !== undefined).map(field =>
            <li key={field}>{headerLabels[field]} · {draft.changes.header[field]}</li>)}
          {[...draft.changes.entries].map(([id, fields]) => <li key={id}>
            {fields ? `Linje ${catalogById.get(fields.lineId)?.label ?? 'ikke valgt'} · Kjøredato ${fields.drivenDate || 'mangler'}` : 'Fjern utkast'}
            {' · Registrering '}{id}
          </li>)}
        </ul>
      </>}
      <div className="actions">
        {!draft.conflict && <button type="button" className="button secondary" disabled={blocked}
          onClick={draft.retrySave}>Prøv lagring igjen</button>}
        <button type="button" className="button secondary" disabled={blocked} onClick={() => { void discardChanges() }}>
          Forkast ulagrede endringer og last inn linjeoversikten
        </button>
      </div>
    </section>

  if (draft.readRestriction) return <div className="line-training">{saveRecovery}</div>
  return <div className="line-training">
    <p className="line-reference">Dokumentreferanse {saved.documentId}</p>
    <p>{confirmed.length} bekreftede registreringer · {drafts.length} utkast</p>
    <p className="save-status" role="status" aria-atomic="true">{status}</p>
    {problem && <p className="error-panel" role="alert">{problem}</p>}
    {saveRecovery}
    <section className="baseline-entry" aria-labelledby="line-candidate">
      <h2 id="line-candidate" ref={candidateHeading} tabIndex={-1}>Dokumentopplysninger</h2>
      {canEditHeader ? <div className="form-fields">{headerFields.map(field => {
        const error = issues.find(issue => issue.field === field && !issue.entryId)?.text
        return <div className="field" key={field}>
          <label htmlFor={`line-header-${field}`}>{headerLabels[field]}</label>
          <input id={`line-header-${field}`} value={header[field]} autoComplete="off" readOnly={blocked}
            aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `line-header-${field}-error` : undefined}
            onChange={event => {
              draft.updateHeader(field, event.currentTarget.value)
              setIssues(previous => previous.filter(issue => issue.entryId || issue.field !== field))
            }} />
          {error && <p className="field-error" id={`line-header-${field}-error`}>{error}</p>}
        </div>
      })}</div> : <dl className="details">{headerFields.map(field => <div key={field}>
        <dt>{headerLabels[field]}</dt><dd>{header[field] || 'Mangler'}</dd>
      </div>)}</dl>}
    </section>
    <section className="baseline-entry" aria-labelledby="line-drafts">
      <h2 id="line-drafts">Registreringer til bekreftelse</h2>
      {canFill && <button type="button" ref={add} className="button primary" id="line-add" aria-disabled={blocked}
        onClick={addEntry}>Legg til registrering</button>}
      {canReview && <div className="actions">
        <button type="button" className="button primary" aria-disabled={blocked}
          onClick={event => { void check(event.currentTarget) }}>Bekreft registreringer</button>
        <span>{selection.length} valgt</span>
      </div>}
      {issues.length > 0 && <section className="error-panel" aria-labelledby="line-issues">
        <h3 id="line-issues" tabIndex={-1}>Mangler før bekreftelse</h3>
        <ul>{issues.map((issue, index) => {
          const entry = drafts.find(entry => entry.entryId === issue.entryId)
          const row = catalogById.get(entry?.lineId ?? '')
          const target = issue.entryId ? `line-entry-${issue.entryId}` : issue.field && `line-header-${issue.field}`
          const text = entry ? `${row ? `Linje ${row.label}` : 'Uten valgt linje'} · ${entry.drivenDate || 'Kjøredato mangler'}. ${issue.text}` : issue.text
          return <li key={index}>{target ? <a href={`#${target}`} onClick={event => {
            event.preventDefault()
            document.getElementById(target)?.focus()
          }}>{text}</a> : text}</li>
        })}</ul>
        {firstDriverIssue && <button type="button" className="button secondary" aria-disabled={blocked} onClick={() => {
          if (blocked) return
          const target = firstDriverIssue.field === 'drivenDate' ? 'date' : firstDriverIssue.field === 'lineId' ? 'code' : 'entry'
          onDriverRole(`line-${target}-${firstDriverIssue.entryId}`)
        }}>Bytt til sjåfør for å rette registreringene</button>}
      </section>}
      {!drafts.length && <p>Ingen utkast.</p>}
      <ul className="line-rows">
        {drafts.map((entry, index) => {
          const { entryId, lineId, drivenDate } = entry
          const line = catalogById.get(lineId)
          const savedLineId = savedEntries.get(entryId)?.lineId
          const extraId = savedLineId && !standardIds.has(savedLineId) && !assignedIds.has(savedLineId) ? savedLineId : undefined
          const pendingChange = draft.pendingEntryChanges?.get(entryId)
          const availableExtraId = pendingChange === undefined || pendingChange?.lineId === extraId ? extraId : undefined
          const selectable = lineCatalog.filter(row => standardIds.has(row.id) || assignedIds.has(row.id) || row.id === availableExtraId)
          const errors = lineEntryErrors(entry, lineCatalog, now)
          const description = `Registrering ${index + 1} · ${line ? `Linje ${line.label}` : 'Linje mangler'} · ${drivenDate || 'Kjøredato mangler'}`
          return <li key={entryId} className="line-row" id={`line-entry-${entryId}`} data-entry-id={entryId} tabIndex={-1}>
            <h3>{description}</h3>
            <p className="run-status">Utkast</p>
            {lineId === extraId && <p>{previouslyRecordedLabel}</p>}
            {assignedIds.has(lineId) && <p>{assignedLabel}</p>}
            {line?.note && <p className="technical-note">{line.note}</p>}
            {canFill && <div className="form-fields">
              <div className="field">
                <label htmlFor={`line-code-${entryId}`}>Linje</label>
                <select id={`line-code-${entryId}`} value={lineId} required disabled={blocked} aria-label={`Linje · ${description}`}
                  aria-invalid={Boolean(errors.lineId) || undefined} aria-describedby={errors.lineId ? `line-code-error-${entryId}` : undefined}
                  onChange={event => setEntryField(entry, 'lineId', event.currentTarget.value)}>
                  <option value="">Velg linje</option>
                  {selectable.map(row => <option key={row.id} value={row.id}>
                    {row.label}{row.id === extraId && ' · Tidligere registrert'}{assignedIds.has(row.id) && ' · Individuelt tildelt'}
                  </option>)}
                </select>
                {errors.lineId && <p className="field-error" id={`line-code-error-${entryId}`}>{errors.lineId}</p>}
              </div>
              <div className="field">
                <label htmlFor={`line-date-${entryId}`}>Kjøredato</label>
                <input id={`line-date-${entryId}`} value={drivenDate} required autoComplete="off" placeholder="ÅÅÅÅ-MM-DD"
                  aria-label={`Kjøredato · ${description}`}
                  aria-invalid={Boolean(errors.drivenDate) || undefined} aria-describedby={errors.drivenDate ? `line-date-error-${entryId}` : undefined}
                  readOnly={blocked} onChange={event => setEntryField(entry, 'drivenDate', event.currentTarget.value)} />
                {errors.drivenDate && <p className="field-error" id={`line-date-error-${entryId}`}>{errors.drivenDate}</p>}
              </div>
              <button type="button" className="button secondary" aria-disabled={blocked} aria-label={`Fjern utkast · ${description}`}
                onClick={() => {
                  if (blocked) return
                  draft.changeEntry(entryId, null)
                  add.current?.focus()
                }}>Fjern utkast</button>
            </div>}
            {!canFill && 'author' in entry && <p>Utfylt av {entry.author.name} · Sjåfør</p>}
            {canReview && <label className="technical-check">
              <input type="checkbox" aria-label={`Velg ${description}`} checked={selection.includes(entryId)} disabled={blocked}
                onChange={event => {
                  const checked = event.currentTarget.checked
                  setSelection(previous => checked ? [...previous, entryId] : previous.filter(id => id !== entryId))
                  setIssues([])
                }} /> Velg registrering
            </label>}
          </li>
        })}
      </ul>
    </section>
    <DownloadHistory saved={saved} draftCount={drafts.length} busy={blocked} download={download} report={report} />
    {(canAssign || saved.assignmentProblem || saved.assignedLines.length > 0) && <section className="baseline-entry" aria-labelledby="line-assigned">
      <h2 id="line-assigned" ref={assignedHeading} tabIndex={-1}>Individuelt tildelte linjer</h2>
      {assignmentStatus && <p className="save-status" role="status">{assignmentStatus}</p>}
      {assignmentProblem && <p className="error-panel" role="alert">{assignmentProblem}</p>}
      {saved.assignmentProblem && <p className="error-panel" role="alert">{explain(new AppError(saved.assignmentProblem))}</p>}
      {saved.assignedLines.length > 0 && <LineOverviewRows lines={saved.assignedLines} confirmed={confirmed} drafts={drafts} />}
      {canAssign && assignable.length > 0 && <>
        <div className="field">
          <label htmlFor="line-assign-choice">Ekstralinje</label>
          <select id="line-assign-choice" value={chosenLine?.id ?? ''} disabled={blocked}
            onChange={event => setLineToAssign(event.currentTarget.value)}>
            <option value="">Velg linje</option>
            {assignable.map(line => <option key={line.id} value={line.id}>{line.label}</option>)}
          </select>
        </div>
        {chosenLine?.note && <p className="technical-note">{chosenLine.note}</p>}
        <div className="actions">
          <button type="button" className="button secondary" aria-disabled={blocked || !chosenLine}
            onClick={event => { void reviewAssignment(event.currentTarget) }}>Tildel ekstralinje</button>
        </div>
      </>}
    </section>}
    <section className="baseline-entry" aria-labelledby="line-catalog">
      <h2 id="line-catalog">Linjer og bekreftede kjøredatoer{saved.snapshots.length > 0 && ` · Nyeste historikkversjon ${saved.snapshots.length}`}</h2>
      <p>Standardlinjer i grunnkurset</p>
      <LineOverviewRows lines={saved.template.lines} confirmed={confirmed} />
    </section>
    {recordedExtraLines.length > 0 && <section className="baseline-entry" aria-labelledby="line-previously-recorded">
      <h2 id="line-previously-recorded">{previouslyRecordedLabel}</h2>
      <LineOverviewRows lines={recordedExtraLines} confirmed={confirmed} drafts={saved.entries.filter(entry => entry.status === 'draft')} />
    </section>}
    {review && canReview && <Modal title="Bekreft registreringer" trigger={review.trigger} fallbackFocus={candidateHeading}
      blocking={busy} dismiss={clearDialogs}>
      <p>{review.document.header.driverName} · Fiktivt ansattnummer {review.document.header.employeeNumber}</p>
      <p>Bare registreringene i dette utvalget låses permanent.</p>
      <ul className="line-rows">
        {review.entries.map(entry => {
          const line = catalogById.get(entry.lineId)!
          return <li key={entry.entryId} className="line-row">
            <strong>Linje {line.label} · <CalendarDate value={entry.drivenDate} /></strong>
            {!standardIds.has(line.id) && <p>{assignedIds.has(line.id) ? assignedLabel : previouslyRecordedLabel}</p>}
            {line.note && <p>{line.note}</p>}
            <p>Utfylt av {entry.author.name} · Sjåfør</p>
          </li>
        })}
      </ul>
      <form noValidate onSubmit={event => { event.preventDefault(); void confirm() }}>
        <div className="field">
          <label htmlFor="line-confirming-instructor">Instruktørnavn</label>
          <input id="line-confirming-instructor" ref={instructorInput} value={review.instructorName} required autoComplete="off" readOnly={busy}
            aria-invalid={Boolean(review.error && !review.instructorName.trim()) || undefined}
            aria-describedby={review.error ? 'line-confirm-error' : undefined} onChange={event => {
              confirmation.current = undefined
              setReview({ ...review, instructorName: event.currentTarget.value, error: undefined })
            }} />
          {review.error && <p className="field-error" role="alert" id="line-confirm-error">{review.error}</p>}
        </div>
        <div className="actions">
          <button className="button primary" type="submit" aria-disabled={busy}>{busy ? 'Bekrefter …' : 'Lås valgte registreringer'}</button>
          <button className="button secondary" type="button" aria-disabled={busy}
            onClick={() => { if (!working.current) clearDialogs() }}>Avbryt</button>
        </div>
      </form>
    </Modal>}
    {assignment && (canAssign || assignment.receipt) && <Modal title="Bekreft linjetildeling" trigger={assignment.trigger} fallbackFocus={assignedHeading}
      blocking={busy} dismiss={dismissAssignment}>
      <p>{assignment.driver.name} · Fiktivt ansattnummer {assignment.driver.employeeNumber}</p>
      <p className="line-reference">Sjåførreferanse {assignment.driver.id}</p>
      <p><strong>Linje {assignment.line.label}</strong></p>
      {assignment.line.note && <p>{assignment.line.note}</p>}
      <p>Tildelingen åpner for registrering av kjøredato i sjåførens linjedokumenter.</p>
      {assignment.error && <p className="field-error" role="alert">{assignment.error}</p>}
      <div className="actions">
        <button type="button" className="button primary" aria-disabled={busy}
          onClick={() => { void confirmAssignment() }}>{assignment.receipt
            ? busy ? 'Kontrollerer …' : 'Kontroller lagringen igjen'
            : busy ? 'Lagrer …' : 'Bekreft tildeling'}</button>
        <button type="button" className="button secondary" aria-disabled={busy}
          onClick={dismissAssignment}>{assignment.receipt ? 'Lukk' : 'Avbryt'}</button>
      </div>
    </Modal>}
  </div>
}
