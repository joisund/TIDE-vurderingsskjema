import { useLayoutEffect, useRef, useState } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { CreateDayCommand, CreateDayFields, CreateDayReceipt } from '../domain/create-day.ts'
import { AppError, professionalTerms } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { CalendarDate } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'

type Props = {
  day: DayView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onWorkspace: (view: WorkspaceView) => void
  onComplete: (view: WorkspaceView, created: boolean) => void
  onCancel: () => void
}

const fieldsOrder = ['date', 'mentorName'] as const

export function CreateDayForm({ day, actor, application, report, onWorkspace, onComplete, onCancel }: Props) {
  const [fields, setFields] = useState<CreateDayFields>({ date: '', mentorName: '' })
  const [error, setError] = useState<AppError<CreateDayFields>>()
  const [pending, setPending] = useState(false)
  const [receipt, setReceipt] = useState<CreateDayReceipt>()
  const inFlight = useRef(false)
  const attempt = useRef<CreateDayCommand>(undefined)
  const professional = professionalTerms(day.context)
  const last = day.days.at(-1)!
  const existingDate = day.status !== 'Avsluttet' && day.days.some(item => item.date === fields.date)
  const blocked = !day.canCreateDay && !existingDate
  useLayoutEffect(() => {
    const invalid = fieldsOrder.find(field => error?.fields[field])
    if (invalid) document.getElementById(`next-day-${invalid}`)?.focus()
  }, [error])

  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(undefined)
    try {
      await action()
    } catch (failure) {
      report(failure)
      setError(failure instanceof AppError ? failure as AppError<CreateDayFields> : new AppError('storage_write'))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  function refresh(asMentor = false) {
    const selection = { runId: day.id, dayId: day.dayId }
    return application.withOpenStorage(() => asMentor
      ? application.changeRole(day.context, selection)
      : application.read(selection))
  }

  function submit() {
    void perform(async () => {
      let saved = receipt
      if (!saved) {
        if (actor.role !== day.context || blocked) return
        const previous = attempt.current
        const command = previous && previous.expectedRevision === day.revision && previous.actor.id === actor.id
          ? previous : application.newCreateDayCommand(actor, day, fields)
        attempt.current = command
        try {
          saved = await application.withOpenStorage(() => application.executeCreateDay(command))
          setReceipt(saved)
        } catch (failure) {
          if (failure instanceof AppError && ['stale', 'wrong_role', 'command_conflict', 'locked', 'plan_required', 'day_limit'].includes(failure.code)) {
            const latest = await refresh()
            if (!latest.blocked) attempt.current = undefined
            onWorkspace(latest)
          }
          throw failure
        }
      }
      const current = await application.withOpenStorage(() => application.read({ runId: saved.runId, dayId: saved.dayId }))
      onComplete(current, saved.created)
    })
  }

  return (
    <>
      <p className="context">Sjåfør · {day.driverName} · Ansattnummer {day.employeeNumber}</p>
      <p className="context">Sist registrert · Dag {last.number} · <CalendarDate value={last.date} />.
        {' '}Planlagt siste dag · Dag {day.plannedLastDay}.</p>
      <p role="status" className="save-status">{receipt
        ? receipt.created ? 'Lagret på denne enheten' : 'Datoen finnes allerede'
        : pending ? 'Lagrer …' : ''}</p>
      {error && (
        <p role="alert" className="error-panel">{receipt ? 'Dagen kunne ikke åpnes. ' : 'Endringene er ikke lagret. '}
          {error.code === 'stale' ? 'Løpet eller rollen ble endret i en annen fane. Kontroller gjeldende opplysninger før du prøver igjen.' : explain(error)}</p>
      )}
      {!receipt && actor.role === day.context && blocked && (
        <p className="context">{day.status === 'Avsluttet' ? 'Løpet er avsluttet. Gå tilbake til dagsoversikten.'
          : day.days.length === 5 ? 'Fem dager er registrert. Velg en registrert dato eller gå tilbake til dagsoversikten.'
            : 'Alle dager i planen er registrert. Velg en registrert dato, eller gå tilbake til dagsoversikten for å utvide planen.'}</p>
      )}
      <form className="create-form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
        {!receipt && actor.role === day.context && (
          <div className="form-fields">
            {fieldsOrder.map(field => {
              const id = `next-day-${field}`
              return (
                <div key={field} className="field">
                  <label htmlFor={id}>{field === 'date' ? 'Dato' : `${professional.role}navn`}</label>
                  {field === 'date' && <p id="next-day-date-hint" className="hint">Bruk formatet ÅÅÅÅ-MM-DD.</p>}
                  <input id={id} type="text" autoComplete="off" spellCheck={false} required
                    readOnly={pending || actor.role !== day.context} value={fields[field]}
                    aria-invalid={Boolean(error?.fields[field])}
                    aria-describedby={[field === 'date' && 'next-day-date-hint', error?.fields[field] && `${id}-issue`].filter(Boolean).join(' ') || undefined}
                    onChange={event => {
                      const value = event.currentTarget.value
                      attempt.current = undefined
                      setFields(current => ({ ...current, [field]: value }))
                      setError(undefined)
                    }} />
                  {error?.fields[field] && <p id={`${id}-issue`} className="field-error">{error.fields[field]}</p>}
                </div>
              )
            })}
          </div>
        )}
        <div className="actions">
          {actor.role === day.context || receipt
            ? <button type="submit" className="button primary" disabled={pending || (!receipt && blocked)}>
                {receipt || (existingDate && !day.canCreateDay) ? 'Åpne registrert dag' : error ? 'Prøv igjen' : 'Opprett dag'}
              </button>
            : <button type="button" className="button primary" disabled={pending}
                onClick={() => void perform(async () => onWorkspace(await refresh(true)))}>Gjenoppta som {professional.roleLower}</button>}
          <button type="button" className="button secondary" disabled={pending} onClick={onCancel}>
            {receipt || (actor.role === day.context && blocked) ? 'Til dagsoversikten' : 'Avbryt'}
          </button>
        </div>
      </form>
    </>
  )
}
