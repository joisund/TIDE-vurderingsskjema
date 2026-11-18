import { useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { checkDayFields, dayFields } from '../domain/day-draft.ts'
import type { DayField } from '../domain/day-draft.ts'
import type { Actor } from '../domain/run.ts'
import { CalendarDate } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'
import { AppError } from '../domain/run.ts'
import { useDayDraft } from './use-day-draft.ts'

export type DayDraftHandle = { flush: () => Promise<boolean> }

type Props = {
  ref: Ref<DayDraftHandle>
  initial: DayView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onSaved: (day: DayView) => void
  onAdopt: (view: WorkspaceView) => void
  navigating: boolean
  fieldToFix?: DayField
}

const labels: Record<DayField, string> = {
  driverName: 'Sjåførnavn', employeeNumber: 'Ansattnummer', mentorName: 'Faddernavn',
  date: 'Dato', bus1: 'Buss 1', bus2: 'Buss 2', routes: 'Linjer', startTime: 'Inn-tid', endTime: 'Ut-tid',
}

const accessText = {
  editable: 'Redigerbar',
  'read-only': 'Fadder redigerer',
  locked: 'Låst',
} as const

function fieldHint(field: DayField) {
  if (field === 'bus1') return 'Minst én buss kreves ved dagslåsing.'
  if (field === 'bus2') return 'Valgfri når Buss 1 er fylt ut. Minst én buss kreves ved dagslåsing.'
  if (field === 'routes') return 'Kreves ved dagslåsing.'
  if (field === 'startTime' || field === 'endTime') return 'HH:mm. Kreves ved dagslåsing.'
  if (field === 'date') return 'ÅÅÅÅ-MM-DD. Kreves ved sjåførbekreftelse og dagslåsing.'
  return 'Kreves ved sjåførbekreftelse og dagslåsing.'
}

export function DayDraftForm({ ref, navigating, fieldToFix, ...options }: Props) {
  const editor = useDayDraft(options)
  const { draft, access, conflict, staleRole, conflictingLocks, editableConflictChanges, reviewing } = editor
  const [checking, setChecking] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const snapshotHeading = useRef<HTMLHeadingElement>(null)
  const currentLocks = conflict?.stored?.selected ?? draft.saved
  const driverIssues = { ...checkDayFields(draft.fields, 'driver'), ...editor.validation }
  const lockIssues = checkDayFields(draft.fields, 'day-lock')
  const issues = { ...lockIssues, ...editor.validation }
  const stopped = Boolean(draft.problem && !draft.writing)
  const status = stopped ? 'Ulagrede endringer' : editor.dirty || draft.writing ? 'Lagrer …' : 'Lagret på denne enheten'
  const disabled = draft.writing || navigating || reviewing
  const recoveryError = conflict?.readError ?? draft.problem?.error
  const schemaError = recoveryError instanceof AppError
    && (recoveryError.code === 'schema_changed' || recoveryError.code === 'unsupported_schema')
  useImperativeHandle(ref, () => ({ flush: editor.flush }))

  return (
    <section aria-labelledby="day-heading">
      <h2 className="category" id="day-heading" ref={heading} tabIndex={-1}>Dag {options.initial.day} · Øktopplysninger</h2>
      <div className="day-state">
        <dl className="details day-details">
          <div>
            <dt>Identitet, dato og tilhørighet</dt>
            <dd>{currentLocks.identityLocked ? 'Låst' : 'Ikke bekreftet'}</dd>
          </div>
          <div>
            <dt>Økt</dt>
            <dd>{currentLocks.dayLocked ? 'Dagslåst' : 'Åpen for registrering'}</dd>
          </div>
        </dl>
        <p className="save-status" role="status" aria-atomic="true">{status}</p>
      </div>
      {draft.problem && (
        <div className="day-problem">
          <p className="error-panel" role="alert">
            Endringene er ikke lagret. Prøv igjen.
            {conflict && (draft.problem.error.code === 'command_conflict'
              ? ' Lagringsforsøket kolliderte med et tidligere forsøk.'
              : ' Løpet eller den aktive rollen ble endret i en annen fane.')}
            {schemaError && ` ${explain(recoveryError)} Kopier ulagret tekst før du åpner appen på nytt.`}
            {!schemaError && conflict?.readError !== undefined && ` ${explain(conflict.readError)}`}
          </p>
          {!conflict && (
            <button type="button" className="button secondary" disabled={disabled} onClick={editor.retry}>Prøv igjen</button>
          )}
        </div>
      )}
      {conflict && (
        <section className="saved-snapshot" aria-labelledby="saved-snapshot-heading">
          <h3 id="saved-snapshot-heading" ref={snapshotHeading} tabIndex={-1}>Lagrede opplysninger for dag {options.initial.day}</h3>
          {conflict.stored ? (
            <>
              <p>Utkastet ditt står i feltene nedenfor. Kontroller det mot de lagrede verdiene før du går videre.</p>
              <dl className="details">
                {dayFields.map(field => (
                  <div key={field}>
                    <dt>{labels[field]}</dt>
                    <dd>{conflict.stored!.selected.fields[field] || 'Tomt felt'}</dd>
                  </div>
                ))}
              </dl>
              {conflictingLocks && <p>Et endret felt kan ikke redigeres med gjeldende rolle eller lås.</p>}
              <div className="actions">
                {staleRole
                  ? <button type="button" className="button secondary" disabled={disabled} onClick={() => {
                      snapshotHeading.current?.focus()
                      void editor.reloadConflict(true)
                    }}>
                      {options.actor.role === 'fadder' ? 'Gjenoppta som fadder' : 'Gjenoppta som sjåfør'}
                    </button>
                  : <button type="button" className="button primary" disabled={disabled || conflictingLocks} onClick={() => {
                      heading.current?.focus()
                      editor.retry()
                    }}>
                      Lagre mine endringer
                    </button>}
                {!staleRole && conflictingLocks && editableConflictChanges && (
                  <button type="button" className="button secondary" disabled={disabled} onClick={() => {
                    snapshotHeading.current?.focus()
                    editor.adoptLocked()
                  }}>Bruk lagrede verdier i låste felt</button>
                )}
                <button type="button" className="button secondary" disabled={disabled} onClick={() => {
                  heading.current?.focus()
                  editor.adoptStored()
                }}>Bruk lagrede opplysninger</button>
              </div>
            </>
          ) : (
            <button type="button" className="button secondary" disabled={disabled} onClick={() => {
              snapshotHeading.current?.focus()
              void editor.reloadConflict()
            }}>
              Hent lagrede opplysninger
            </button>
          )}
        </section>
      )}
      <div className="form-fields day-fields">
        {dayFields.map(field => {
          const id = `day-field-${field}`
          const value = draft.fields[field]
          const editable = access[field] === 'editable'
          const issue = editor.validation[field]
            ?? (field === fieldToFix ? issues[field] : undefined)
            ?? (checking || (value && (field === 'startTime' || field === 'endTime')) ? issues[field] : undefined)
          const hint = fieldHint(field)
          const description = `${id}-hint${issue ? ` ${id}-error` : ''}`
          return (
            <div className="field" key={field}>
              {editable
                ? <>
                    <label htmlFor={id}>{labels[field]}</label>
                    <input id={id} value={value} readOnly={navigating} autoComplete="off"
                      aria-describedby={description} aria-invalid={issue ? true : undefined}
                      onChange={event => editor.update(field, event.currentTarget.value)} />
                  </>
                : <div id={id} tabIndex={-1} role="group" aria-labelledby={`${id}-label`} aria-describedby={description}>
                    <p className="field-label" id={`${id}-label`}>{labels[field]}</p>
                    <p className="read-value">{field === 'date' && value === draft.saved.fields.date
                      ? <CalendarDate value={value} />
                      : value || 'Tomt felt'}</p>
                  </div>}
              <p className="hint" id={`${id}-hint`}>{accessText[access[field]]} · {hint}</p>
              {issue && <p className="field-error" id={`${id}-error`}>{issue}</p>}
            </div>
          )
        })}
      </div>
      <details className="field-check" onToggle={event => setChecking(event.currentTarget.open)}>
        <summary>Kontroller øktfeltene</summary>
        <h3>Sjåførens etterbekreftelse</h3>
        {Object.keys(driverIssues).length
          ? <ul>{dayFields.filter(field => driverIssues[field]).map(field => (
              <li key={field}><a href={`#day-field-${field}`}>{driverIssues[field]}</a></li>
            ))}</ul>
          : <p>Øktfeltene som kreves ved sjåførens etterbekreftelse er utfylt.</p>}
        <h3>Dagslåsing</h3>
        {Object.keys(issues).length
          ? <ul>{dayFields.filter(field => issues[field]).map(field => (
              <li key={field}><a href={`#day-field-${field}`}>{issues[field]}</a></li>
            ))}</ul>
          : <p>Øktfeltene som kreves ved dagslåsing er utfylt.</p>}
      </details>
    </section>
  )
}
