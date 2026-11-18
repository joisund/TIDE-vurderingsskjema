import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { professionalTerms } from '../domain/run.ts'
import type { AssessmentContext, CreateRunFields, DriverReference, FieldErrors } from '../domain/run.ts'

const textFields = [
  { name: 'driverName', label: 'Sjåførnavn' },
  { name: 'employeeNumber', label: 'Ansattnummer' },
  { name: 'mentorName', label: '' },
  { name: 'firstDate', label: 'Første dato' },
] as const

type Props = {
  fields: CreateRunFields
  errors: FieldErrors
  pending: boolean
  problem?: string
  canRetry: boolean
  recoveryLabel: string
  context: AssessmentContext
  driver?: DriverReference
  onChange: (field: keyof CreateRunFields, value: string) => void
  onSubmit: () => void
  onCancel: () => void
  onRefresh: () => void
}

export function CreateRunForm({ fields, errors, pending, problem, canRetry, recoveryLabel, context, driver,
  onChange, onSubmit, onCancel, onRefresh }: Props) {
  const summary = useRef<HTMLDivElement>(null)
  const hasErrors = Object.keys(errors).length > 0
  useEffect(() => {
    if (hasErrors) summary.current?.focus()
  }, [hasErrors])

  const fieldError = (name: keyof CreateRunFields) => errors[name] && (
    <p className="field-error" id={`${name}-error`}>{errors[name]}</p>
  )
  const errorId = (name: keyof CreateRunFields) => errors[name] ? `${name}-error` : undefined

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pending && canRetry) {
      onSubmit()
      summary.current?.focus()
    }
  }

  return (
    <form className="create-form" noValidate onSubmit={submit}>
      {hasErrors && (
        <div className="error-panel" ref={summary} tabIndex={-1} aria-labelledby="missing-heading">
          <h2 id="missing-heading">Opplysninger som må rettes</h2>
          <ul>
            {[...textFields, { name: 'initialLastDay', label: 'Startplan' } as const].map(({ name }) => errors[name] && (
              <li key={name}>
                <a href={`#${name}`} tabIndex={0} onClick={event => {
                  event.preventDefault()
                  document.getElementById(name)?.focus()
                }}>{errors[name]}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {problem && <p className="error-panel" role="alert">{problem}</p>}
      <div className="form-fields">
        {textFields.map(({ name, label }) => {
          const isDate = name === 'firstDate'
          const describedBy = [isDate && 'date-hint', errorId(name)].filter(Boolean).join(' ') || undefined
          return (
            <div className="field" key={name}>
              <label htmlFor={name}>{name === 'mentorName' ? `${professionalTerms(context).role}navn` : label}</label>
              {isDate && <p className="hint" id="date-hint">Bruk formatet ÅÅÅÅ-MM-DD.</p>}
              <input
                id={name}
                name={name}
                type="text"
                required
                autoComplete="off"
                spellCheck={false}
                readOnly={pending || Boolean(driver && (name === 'driverName' || name === 'employeeNumber'))}
                value={fields[name]}
                aria-invalid={errors[name] ? true : undefined}
                aria-describedby={describedBy}
                onChange={event => onChange(name, event.currentTarget.value)}
              />
              {fieldError(name)}
            </div>
          )
        })}
        <div className="field">
          <label htmlFor="initialLastDay">Startplan</label>
          <select
            id="initialLastDay"
            name="initialLastDay"
            required
            disabled={pending}
            value={fields.initialLastDay}
            aria-invalid={errors.initialLastDay ? true : undefined}
            aria-describedby={errorId('initialLastDay')}
            onChange={event => onChange('initialLastDay', event.currentTarget.value)}
          >
            <option value="3">3 dager</option>
            <option value="2">2 dager</option>
            <option value="1">1 dag</option>
          </select>
          {fieldError('initialLastDay')}
        </div>
      </div>
      <div className="actions">
        {canRetry
          ? <button className="button primary" type="submit" aria-disabled={pending}>
              {problem ? 'Prøv igjen' : context === 'instruktør' ? 'Opprett instruktørvurdering' : 'Opprett løp'}
            </button>
          : <button className="button primary" type="button" aria-disabled={pending} onClick={onRefresh}>
              {recoveryLabel}
            </button>}
        <button className="button secondary" type="button" aria-disabled={pending} onClick={onCancel}>Avbryt</button>
      </div>
    </form>
  )
}
