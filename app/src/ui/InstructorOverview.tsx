import { useEffect, useRef, useState } from 'react'
import type { WorkspaceView } from '../application/run-application.ts'
import { professionalTerms } from '../domain/run.ts'
import type { DriverFields, DriverReference, FieldErrors } from '../domain/run.ts'
import { CalendarDate } from './CalendarDate.tsx'

function DriverButton({ driver, runs, selected, busy, onSelect }: {
  driver: DriverReference
  runs: WorkspaceView['runs']
  selected?: boolean
  busy: boolean
  onSelect: (driverId: string) => void
}) {
  const latest = runs.filter(run => run.driverId === driver.id).sort((a, b) => b.firstDate.localeCompare(a.firstDate))[0]
  return (
    <button className="run-button" type="button" aria-pressed={selected} aria-disabled={busy}
      onClick={() => onSelect(driver.id)}>
      <span className="run-name">{driver.name}</span>
      <span>Ansattnummer {driver.employeeNumber} · Registrering {driver.id}</span>
      <span>{latest ? <>Siste vurdering · <CalendarDate value={latest.firstDate} /></> : 'Ingen vurderinger'}</span>
      {selected && <span className="run-status">Valgt sjåfør</span>}
    </button>
  )
}

export function InstructorOverview({ view, busy, selectingDriver, onNewDriver, onSelect, onNewRun, onOpenRun }: {
  view: WorkspaceView
  busy: boolean
  selectingDriver: boolean
  onNewDriver: () => void
  onSelect: (driverId: string) => void
  onNewRun: (driver: DriverReference) => void
  onOpenRun: (runId: string) => void
}) {
  const [query, setQuery] = useState('')
  const search = query.trim().toLocaleLowerCase('nb-NO')
  const matching = view.drivers.filter(driver =>
    [driver.name, driver.employeeNumber].some(value => value.toLocaleLowerCase('nb-NO').includes(search)),
  )
  const selected = view.drivers.find(driver => driver.id === view.selectedDriverId)
  const documents = view.runs.filter(run => run.driverId === selected?.id).sort((a, b) => b.firstDate.localeCompare(a.firstDate))
  return (
    <>
      <button type="button" className="button primary" aria-disabled={busy} onClick={onNewDriver}>Opprett sjåfør</button>
      <section className="baseline-entry" aria-labelledby="driver-selection">
        <h2 id="driver-selection">Velg sjåfør</h2>
        {view.drivers.length ? (
          <>
            <div className="field">
              <label htmlFor="driver-search">Søk etter navn eller ansattnummer</label>
              <input id="driver-search" type="search" value={query} autoComplete="off"
                onChange={event => setQuery(event.currentTarget.value)} />
            </div>
            {matching.length ? <ul className="run-list">
              {matching.map(driver => (
                <li key={driver.id}><DriverButton driver={driver} runs={view.runs} busy={busy}
                  selected={driver.id === selected?.id} onSelect={onSelect} /></li>
              ))}
            </ul> : <p role="status">Ingen sjåfører passer søket.</p>}
          </>
        ) : <p>Det er ingen sjåfører registrert på denne enheten.</p>}
      </section>
      {selectingDriver && <p className="save-status" role="status">Laster dokumentasjon for valgt sjåfør …</p>}
      {selected && !selectingDriver && (
        <section className="baseline-entry" aria-labelledby="driver-documents">
          <h2 id="driver-documents">Dokumentasjon for {selected.name}</h2>
          <p>Ansattnummer {selected.employeeNumber} · Registrering {selected.id}</p>
          <button type="button" className="button primary" aria-disabled={busy}
            onClick={() => onNewRun(selected)}>Ny instruktørvurdering</button>
          {documents.length ? <ul className="run-list">
            {documents.map(run => (
              <li key={run.id}>
                <button type="button" className="run-button" aria-disabled={busy} onClick={() => onOpenRun(run.id)}>
                  <span className="run-name">Vurderingsskjema · {professionalTerms(run.context).role}</span>
                  <span>{run.driverName} · Ansattnummer {run.employeeNumber}</span>
                  <span><CalendarDate value={run.firstDate} /> · {run.status}</span>
                </button>
              </li>
            ))}
          </ul> : <p>Det er ingen vurderinger for denne registreringen.</p>}
        </section>
      )}
    </>
  )
}

const driverFields = [
  { name: 'driverName', label: 'Sjåførnavn' },
  { name: 'employeeNumber', label: 'Ansattnummer' },
] as const

export function CreateDriverForm({ view, fields, errors, busy, problem, saved, restoreRole, onChange, onSubmit, onSelect, onCancel }: {
  view: WorkspaceView
  fields: DriverFields
  errors: FieldErrors<DriverFields>
  busy: boolean
  problem?: string
  saved: boolean
  restoreRole?: () => void
  onChange: (field: keyof DriverFields, value: string) => void
  onSubmit: () => void
  onSelect: (driverId: string) => void
  onCancel: () => void
}) {
  const name = fields.driverName.trim().toLocaleLowerCase('nb-NO')
  const number = fields.employeeNumber.trim().toLocaleLowerCase('nb-NO')
  const matches = view.drivers.filter(driver =>
    driver.name.toLocaleLowerCase('nb-NO') === name && driver.employeeNumber.toLocaleLowerCase('nb-NO') === number,
  )
  const firstError = driverFields.find(({ name }) => errors[name])?.name
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (firstError) form.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus()
  }, [firstError])
  return (
    <form ref={form} className="create-form" noValidate onSubmit={event => {
      event.preventDefault()
      if (!busy && !restoreRole) onSubmit()
    }}>
      <p className="context">Bruk fiktivt navn og ansattnummer. Registreringen brukes til å knytte dokumentasjon til sjåføren.</p>
      {problem && <p className="error-panel" role="alert">{problem}</p>}
      <div className="form-fields">
        {driverFields.map(({ name, label }) => {
          const id = `driver-reference-${name}`
          return (
            <div className="field" key={name}>
              <label htmlFor={id}>{label}</label>
              <input id={id} name={name} value={fields[name]} required autoComplete="off" readOnly={busy || saved}
                aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `${id}-error` : undefined}
                onChange={event => onChange(name, event.currentTarget.value)} />
              {errors[name] && <p className="field-error" id={`${id}-error`}>{errors[name]}</p>}
            </div>
          )
        })}
      </div>
      {!saved && matches.length > 0 && (
        <section className="baseline-entry" aria-labelledby="duplicate-driver">
          <h2 id="duplicate-driver">Samme navn og ansattnummer finnes</h2>
          <p>Velg en eksisterende registrering nedenfor, eller opprett en ny registrering.</p>
          <ul className="run-list">
            {matches.map(driver => (
              <li key={driver.id}><DriverButton busy={busy} driver={driver} runs={view.runs} onSelect={onSelect} /></li>
            ))}
          </ul>
        </section>
      )}
      <div className="actions">
        {restoreRole ? <button className="button primary" type="button" aria-disabled={busy} onClick={restoreRole}>
          Gjenoppta som instruktør
        </button> : <button className="button primary" type="submit" aria-disabled={busy}>
          {saved ? 'Åpne lagret sjåfør' : problem ? 'Prøv igjen' : 'Opprett ny registrering'}
        </button>}
        <button className="button secondary" type="button" aria-disabled={busy} onClick={onCancel}>
          {saved ? 'Til instruktøroversikten' : 'Avbryt'}
        </button>
      </div>
    </form>
  )
}
