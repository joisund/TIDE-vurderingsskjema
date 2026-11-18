import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { CloseRunCommand, ClosureIssue, ConclusionDraft, ConclusionStatus, SaveConclusionCommand } from '../domain/closure.ts'
import { AppError, hasText, professionalTerms } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { explain } from './app-errors.ts'
import { CalendarDate } from './CalendarDate.tsx'
import { useAutosaveDeadline } from './use-autosave-deadline.ts'
import { Modal } from './AssessmentMatrix.tsx'
import { conclusionLabels } from './assessment-fields.ts'

type OpenDay = DayView & { conclusion: NonNullable<DayView['conclusion']> }
type Reviewed = { day: DayView; draft: ConclusionDraft & { status: ConclusionStatus }; date: string }
type Props = {
  ref: Ref<{ flush: () => Promise<boolean> }>
  initial: OpenDay
  actor: Actor
  application: RunApplication
  navigating: boolean
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onStored: (workspace: WorkspaceView) => void
  onIssue: (issue: ClosureIssue) => void
}

type DraftState = {
  saved: OpenDay
  fields: ConclusionDraft
  writing: boolean
  problem?: string
  conflict?: { latest?: WorkspaceView }
}

const localDate = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'short', timeZone: 'Europe/Oslo' })

function differs(a: ConclusionDraft, b: ConclusionDraft) {
  return a.text !== b.text || a.status !== b.status || a.mentorName !== b.mentorName
}

function requiresReload(error: unknown) {
  return error instanceof AppError && ['stale', 'locked', 'wrong_role', 'command_conflict'].includes(error.code)
}

export function ClosureForm({ ref, initial, actor, application, navigating, report, onSaved, onStored, onIssue }: Props) {
  const [state, setState] = useState<DraftState>({ saved: initial, fields: initial.conclusion.draft, writing: false })
  const current = useRef(state)
  const [checking, setChecking] = useState(false)
  const checkingRef = useRef(false)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const [confirmation, setConfirmation] = useState<Reviewed>()
  const closeAttempt = useRef<CloseRunCommand>(undefined)
  const [closureProblem, setClosureProblem] = useState('')
  const [checked, setChecked] = useState(false)
  const [invalidFocus, setInvalidFocus] = useState<'name' | 'status' | 'issues'>()
  const mentorName = useRef<HTMLInputElement>(null)
  const firstStatus = useRef<HTMLInputElement>(null)
  const issuesHeading = useRef<HTMLHeadingElement>(null)
  const reviewButton = useRef<HTMLButtonElement>(null)
  const deadline = useAutosaveDeadline()
  const pending = useRef<Promise<boolean>>(undefined)
  const attempt = useRef<SaveConclusionCommand>(undefined)
  const selection = { runId: initial.id, dayId: initial.dayId }

  function publish(next: DraftState) {
    current.current = next
    setState(next)
  }

  async function readStored() {
    return application.withOpenStorage(() => application.read(selection))
  }

  async function noteConflict(error: unknown) {
    let latest: WorkspaceView | undefined
    try {
      latest = await readStored()
    } catch (readError) {
      report(readError)
    }
    publish({ ...current.current, writing: false, problem: explain(error), conflict: { latest } })
  }

  async function openStored() {
    if (checkingRef.current || !current.current.conflict) return
    checkingRef.current = true
    setChecking(true)
    try {
      if (current.current.conflict.latest) onStored(await readStored())
      else await noteConflict(new AppError('stale'))
    } catch (error) {
      report(error)
      publish({ ...current.current, problem: explain(error) })
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
  }

  async function resumeDraftRole() {
    if (checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    try {
      const latest = await application.withOpenStorage(() => application.changeRole(actor.role, selection))
      const day = latest.selected
      const state = current.current
      if (day?.conclusion && day.revision === state.saved.revision && latest.actor.id === actor.id) {
        publish({ ...state, saved: { ...day, conclusion: day.conclusion }, problem: undefined, conflict: undefined })
        await flush()
      } else publish({ ...state, conflict: { latest } })
    } catch (error) {
      report(error)
      publish({ ...current.current, problem: explain(error) })
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
  }

  function schedule() {
    deadline.schedule(() => { void flush(false) })
  }

  function update<Field extends keyof ConclusionDraft>(field: Field, value: ConclusionDraft[Field]) {
    const previous = current.current
    if (previous.conflict || navigating || checkingRef.current || confirmation) return
    publish({ ...previous, fields: { ...previous.fields, [field]: value }, problem: undefined })
    schedule()
  }

  async function write(saved: OpenDay, fields: ConclusionDraft) {
    let command = attempt.current
    if (!command || command.expectedRevision !== saved.revision || differs(command.payload, fields)) {
      command = application.newSaveConclusionCommand(actor, saved, fields)
      attempt.current = command
    }
    deadline.reset()
    publish({ ...current.current, writing: true })
    try {
      const receipt = await application.withOpenStorage(() => application.executeSaveConclusion(command))
      const day = { ...saved, revision: receipt.revision, conclusion: { ...saved.conclusion, draft: fields } }
      publish({ saved: day, fields: current.current.fields, writing: false })
      onSaved(day)
      if (differs(current.current.fields, fields)) schedule()
      return true
    } catch (error) {
      report(error)
      if (requiresReload(error)) await noteConflict(error)
      else publish({ ...current.current, writing: false, problem: 'Endringene er ikke lagret. Prøv igjen.' })
      return false
    }
  }

  async function flush(drain = true, retry = false): Promise<boolean> {
    deadline.cancel()
    if (!drain && pending.current) return true
    while (true) {
      if (pending.current) {
        if (!await pending.current) return false
        continue
      }
      const { saved, fields, problem, conflict } = current.current
      if (conflict || (problem && !retry)) return false
      if (!differs(fields, saved.conclusion.draft)) {
        deadline.reset()
        if (problem) publish({ ...current.current, problem: undefined })
        return true
      }
      const writing = write(saved, fields)
      pending.current = writing
      const success = await writing
      if (pending.current === writing) pending.current = undefined
      if (!success || !drain) return success
    }
  }

  useImperativeHandle(ref, () => ({ flush: () => flush() }))

  useLayoutEffect(() => {
    if (!checking && invalidFocus) {
      const targets = { name: mentorName, status: firstStatus, issues: issuesHeading }
      targets[invalidFocus].current?.focus()
    }
  }, [checking, invalidFocus])

  async function review() {
    if (confirmation || navigating || checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    setChecked(true)
    setInvalidFocus(undefined)
    setClosureProblem('')
    try {
      if (!await flush()) return
      const latest = await readStored()
      const day = latest.selected
      if (latest.blocked) {
        onStored(latest)
        return
      }
      if (!day) throw new AppError('storage_read')
      if (latest.actor.id !== actor.id || day.revision !== current.current.saved.revision || !day.conclusion) {
        onStored(latest)
        return
      }
      closeAttempt.current = undefined
      const { draft, issues } = day.conclusion
      if (!hasText(draft.mentorName)) setInvalidFocus('name')
      else if (!draft.status) setInvalidFocus('status')
      else if (issues.length) setInvalidFocus('issues')
      else setConfirmation({ day, draft: { ...draft, status: draft.status }, date: localDate.format(new Date()) })
    } catch (error) {
      report(error)
      setClosureProblem(explain(error))
    } finally {
      setChecking(false)
      checkingRef.current = false
    }
  }

  function cancel() {
    if (closingRef.current) return
    setConfirmation(undefined)
    setClosureProblem('')
  }

  async function close() {
    if (!confirmation || closingRef.current) return
    const command = closeAttempt.current ?? application.newCloseRunCommand(actor, confirmation.day, confirmation.draft)
    if (!closeAttempt.current && localDate.format(new Date(command.payload.confirmedAt)) !== confirmation.date) {
      setConfirmation(undefined)
      setClosureProblem('Datoen har endret seg. Kontroller avslutningen på nytt.')
      return
    }
    closeAttempt.current = command
    closingRef.current = true
    setClosing(true)
    setClosureProblem('')
    let failure: unknown
    try {
      await application.withOpenStorage(() => application.executeCloseRun(command))
    } catch (error) {
      report(error)
      failure = error
    }
    try {
      // En mistet kvittering kan bety at samme kommando allerede har avsluttet løpet.
      const latest = await readStored()
      closeAttempt.current = undefined
      if (latest.selected?.closed || requiresReload(failure)
        || latest.selected?.revision !== command.expectedRevision || latest.actor.id !== actor.id) {
        setConfirmation(undefined)
        onStored(latest)
        return
      }
      setClosureProblem('Perioden er fortsatt åpen. Avslutningen kunne ikke lagres. Prøv igjen.')
    } catch (error) {
      report(error)
      setClosureProblem('Avslutningen kunne ikke kontrolleres. Prøv igjen for å sjekke det lokale lageret.')
    } finally {
      closingRef.current = false
      setClosing(false)
    }
  }

  const { saved, fields, problem, conflict, writing } = state
  const dirty = differs(fields, saved.conclusion.draft)
  const disabled = navigating || checking || Boolean(conflict)
  const professional = professionalTerms(saved.context)
  const nameMissing = checked && !hasText(fields.mentorName)
  const statusMissing = checked && !fields.status
  const stored = conflict?.latest?.selected

  return (
    <>
      <section className="baseline-entry" aria-labelledby="closure-days-heading">
        <h2 id="closure-days-heading">Dager i perioden</h2>
        <ol className="day-history">
          {saved.days.map(day => <li key={day.id}>Dag {day.number} · <CalendarDate value={day.date} />
            {' · '}{day.dayLocked ? 'Bekreftet og låst' : 'Åpen'}</li>)}
        </ol>
        {saved.conclusion.issues.length ? (
          <div className="field-check">
            <h3 ref={issuesHeading} tabIndex={-1}>Gjenstår før avslutning</h3>
            <ul>
              {saved.conclusion.issues.map(issue => {
                const { section, dayId, dayNumber, message } = issue
                return <li key={`${dayId}/${section}/${section === 'session' ? issue.field : message}`}>
                  <p>{dayNumber && `Dag ${dayNumber} · `}{message}</p>
                  <button type="button" className="button secondary" aria-disabled={disabled}
                    aria-label={section === 'session' ? `Gå til feltet for dag ${dayNumber} · ${message}` : undefined}
                    onClick={() => { if (!disabled) onIssue(issue) }}>
                    {section === 'baseline' ? 'Åpne førvurderingen'
                      : section === 'after' ? `Åpne ettervurdering for dag ${dayNumber}`
                        : section === 'mentor' ? `Åpne ${professional.assessment} for dag ${dayNumber}`
                          : section === 'history' ? `Les låst historikk for dag ${dayNumber}`
                            : section === 'session' ? `Gå til feltet for dag ${dayNumber}` : 'Til dagsoversikten'}
                  </button>
                </li>
              })}
            </ul>
          </div>
        ) : <p>Alle opprettede dager er bekreftet og låst.</p>}
      </section>
      <div className="baseline-entry">
        <label className="field" htmlFor="closing-mentor">
          Avsluttende {professional.roleLower}navn
          <input id="closing-mentor" ref={mentorName} value={fields.mentorName} required readOnly={disabled}
            aria-invalid={nameMissing || undefined} aria-describedby={nameMissing ? 'closing-name-error' : undefined}
            onChange={event => update('mentorName', event.currentTarget.value)} />
        </label>
        {nameMissing && <p id="closing-name-error" className="field-error">Oppgi navnet på {professional.definite} som avslutter perioden.</p>}
      </div>
      <section className="baseline-entry" aria-labelledby="conclusion-heading">
        <h2 id="conclusion-heading">Konklusjon</h2>
        <label className="field conclusion-text" htmlFor="conclusion-text">
          {professional.authorPrefix} oppsummering (valgfritt)
          <textarea id="conclusion-text" value={fields.text} readOnly={disabled} aria-describedby="conclusion-text-hint"
            onChange={event => update('text', event.currentTarget.value)} />
        </label>
        <p className="context" id="conclusion-text-hint">Teksten blir synlig for sjåføren når perioden er avsluttet.</p>
        <fieldset className="conclusion-options" disabled={disabled} aria-describedby={statusMissing ? 'conclusion-status-error' : undefined}>
          <legend>Velg én (obligatorisk)</legend>
          {Object.entries(conclusionLabels).map(([value, label]) => (
            <label className="follow-up-option" key={value}>
              <input type="radio" ref={value === 'approved' ? firstStatus : undefined}
                name="conclusion-status" value={value} required checked={fields.status === value}
                aria-invalid={statusMissing || undefined} aria-describedby={statusMissing ? 'conclusion-status-error' : undefined}
                onChange={() => update('status', value === 'approved' ? 'approved' : 'follow_up_needed')} />
              {label}
            </label>
          ))}
        </fieldset>
        {statusMissing && <p id="conclusion-status-error" className="field-error">Velg Godkjent eller Oppfølgingsbehov.</p>}
        <p className="save-status" role="status" aria-atomic="true">{writing ? 'Lagrer …' : problem ? ''
          : dirty ? 'Endringer venter på lagring' : 'Lagret på denne enheten'}</p>
        {problem && <p className="error-panel" role="alert">{problem}</p>}
        {problem && !conflict && (
          <button type="button" className="button secondary" aria-disabled={writing} onClick={() => void flush(true, true)}>Prøv å lagre igjen</button>
        )}
        {conflict && (
          <div className="field-check">
            <p>Ulagret tekst står i oppsummeringsfeltet. Du kan kopiere den før du åpner lagret tilstand.</p>
            {stored?.conclusion && <><p>Lagret oppsummering</p><p className="assessment-text">{stored.conclusion.draft.text || 'Tom'}</p></>}
            {conflict.latest?.blocked && <button type="button" className="button secondary" aria-disabled={checking}
              onClick={() => void resumeDraftRole()}>Gjenoppta som {professional.roleLower}</button>}
            <button type="button" className="button secondary" aria-disabled={checking} onClick={() => void openStored()}>
              {conflict.latest ? 'Åpne lagret tilstand' : 'Last inn lagret tilstand'}
            </button>
          </div>
        )}
        {closureProblem && !confirmation && <p className="error-panel" role="alert">{closureProblem}</p>}
        <button type="button" className="button primary" ref={reviewButton} aria-disabled={disabled}
          onClick={() => void review()}>Kontroller avslutning</button>
      </section>
      {confirmation && reviewButton.current && (
        <Modal title="Avslutte perioden?" trigger={reviewButton.current} fallbackFocus={reviewButton}
          dismiss={cancel} blocking={closing}>
          <p>{professional.role} · {confirmation.draft.mentorName.trim()} · {confirmation.date}</p>
          <p>Konklusjon · <strong>{conclusionLabels[confirmation.draft.status]}</strong></p>
          <p>Perioden lukkes permanent, og konklusjonen låses.</p>
          <p>Ingen flere dager kan legges til. Sjåføren får tilgang til hele skjemaet.</p>
          <p>Videre oppfølging håndteres utenfor dette løpet.</p>
          {closing && <p className="save-status" role="status">Lagrer avslutning …</p>}
          {closureProblem && <p className="error-panel" role="alert">{closureProblem}</p>}
          <div className="actions">
            <button className="button secondary" type="button" aria-disabled={closing} onClick={cancel}>Avbryt</button>
            <button className="button primary" type="button" aria-disabled={closing} onClick={() => void close()}>Avslutt perioden</button>
          </div>
        </Modal>
      )}
    </>
  )
}
