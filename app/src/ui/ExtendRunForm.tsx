import { useRef, useState } from 'react'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import { availableExtraDays, previewFollowUp } from '../domain/follow-up.ts'
import type { FollowUpReceipt, SaveFollowUpCommand } from '../domain/follow-up.ts'
import { AppError } from '../domain/run.ts'
import type { Actor } from '../domain/run.ts'
import { CalendarDate } from './CalendarDate.tsx'
import { explain } from './app-errors.ts'

type Props = {
  day: DayView
  actor: Actor
  application: RunApplication
  report: (error: unknown) => void
  onWorkspace: (view: WorkspaceView) => void
  onComplete: (view: WorkspaceView) => void
  onCancel: () => void
}

export function ExtendRunForm({ day, actor, application, report, onWorkspace, onComplete, onCancel }: Props) {
  const [count, setCount] = useState('')
  const [pending, setPending] = useState(false)
  const [receipt, setReceipt] = useState<FollowUpReceipt>()
  const [error, setError] = useState('')
  const attempt = useRef<SaveFollowUpCommand>(undefined)
  const inFlight = useRef(false)
  const options = day.extensionWindow ? availableExtraDays(day.extensionWindow) : []
  const preview = day.extensionWindow && previewFollowUp(day.extensionWindow, { need: 'yes', type: 'days', extraDays: count })
  const proposal = preview && 'choice' in preview ? preview : undefined

  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError('')
    try {
      await action()
    } catch (failure) {
      report(failure)
      setError(explain(failure))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  function read(asMentor = false) {
    const selection = { runId: day.id, dayId: day.dayId }
    return application.withOpenStorage(() => asMentor
      ? application.changeRole(day.context, selection)
      : application.read(selection))
  }

  function submit() {
    void perform(async () => {
      if (!receipt) {
        if (actor.role !== day.context || !proposal) return
        const previous = attempt.current
        const command = previous && previous.expectedRevision === day.revision && previous.actor.id === actor.id
          ? previous : application.newFollowUpCommand(actor, day, proposal.choice, 'extension')
        attempt.current = command
        try {
          setReceipt(await application.withOpenStorage(() => application.executeFollowUp(command)))
        } catch (failure) {
          if (failure instanceof AppError && ['stale', 'wrong_role', 'command_conflict', 'locked', 'validation'].includes(failure.code)) {
            const latest = await read()
            if (!latest.blocked) attempt.current = undefined
            onWorkspace(latest)
          }
          throw failure
        }
      }
      onComplete(await read())
    })
  }

  return (
    <form className="create-form" onSubmit={event => { event.preventDefault(); submit() }}>
      <p>Planlagt siste dag · Dag {receipt?.plan.lastDay ?? day.plannedLastDay}</p>
      <p role="status" className="save-status">{receipt ? 'Lagret på denne enheten' : pending ? 'Lagrer …' : ''}</p>
      {error && <p role="alert" className="error-panel">{receipt ? 'Den lagrede planen kunne ikke åpnes. ' : 'Endringene er ikke lagret. '}{error}</p>}
      {actor.role === day.context && !receipt && (
        <>
          {options.length > 0 ? (
            <div className="field">
              <label htmlFor="extension-count">Antall ekstra dager</label>
              <select id="extension-count" disabled={pending} value={count} onChange={event => {
                attempt.current = undefined
                setCount(event.currentTarget.value)
                setError('')
              }}>
                <option value="">Velg antall</option>
                {count && !proposal && <option value={count} disabled>{count} · Ikke tilgjengelig</option>}
                {options.map(number => <option key={number} value={number}>{number}</option>)}
              </select>
              <p className="hint">Utvidelse etter låst dag {day.day} · <CalendarDate value={day.fields.date} />.</p>
              {proposal && <p>Foreslått siste dag · Dag {proposal.proposedLastDay}</p>}
            </div>
          ) : <p>Planen kan ikke utvides fra denne dagen.</p>}
        </>
      )}
      <div className="actions">
        {actor.role === day.context || receipt
          ? <button type="submit" className="button primary" disabled={pending || (!receipt && !proposal)}>
              {receipt ? 'Åpne lagret plan' : error ? 'Prøv igjen' : 'Lagre utvidelse'}
            </button>
          : <button type="button" className="button primary" disabled={pending}
              onClick={() => void perform(async () => onWorkspace(await read(true)))}>Gjenoppta som {day.context}</button>}
        <button type="button" className="button secondary" disabled={pending} onClick={onCancel}>
          {receipt ? 'Til dagsoversikten' : 'Avbryt'}
        </button>
      </div>
    </form>
  )
}
