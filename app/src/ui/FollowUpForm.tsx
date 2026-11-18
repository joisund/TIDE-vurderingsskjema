import { availableExtraDays } from '../domain/follow-up.ts'
import type { FollowUpChoice, FollowUpInput, PlanEvent, previewFollowUp } from '../domain/follow-up.ts'
import { followUpText, training } from '../content/assessment-labels.ts'
import { professionalTerms } from '../domain/run.ts'
import type { AssessmentContext } from '../domain/run.ts'
import type { DayView } from '../application/run-application.ts'
import { focusMatrixField } from './assessment-fields.ts'
import { CalendarDate } from './CalendarDate.tsx'
import type { MentorView } from './use-mentor-draft.ts'

export function FollowUpText({ choice, context }: { choice?: FollowUpChoice; context: AssessmentContext }) {
  return <>{followUpText(choice, context)}</>
}

export function PlanHistory({ history }: { history: readonly PlanEvent[] }) {
  if (!history.length) return null
  return (
    <details className="field-check">
      <summary>Planhistorikk</summary>
      <ol className="follow-up-history">
        {history.map(event => (
          <li key={event.commandId}>
            <p><strong>Dag {event.dayNumber} · <CalendarDate value={event.date} /></strong> · {event.actor.name}, {event.actor.role}</p>
            <p>{event.source === 'extension' && 'Senere utvidelse · '}{followUpText(event.choice, event.actor.role)}</p>
            <p>Planlagt siste dag · {event.oldLastDay === event.newLastDay
              ? `Dag ${event.newLastDay} (uendret)` : `Dag ${event.oldLastDay} → dag ${event.newLastDay}`}</p>
          </li>
        ))}
      </ol>
    </details>
  )
}

function followUpDraftText(input: FollowUpInput, context: AssessmentContext) {
  if (input.need === 'no') return 'Nei'
  if (input.need !== 'yes') return 'Ubesvart'
  if (input.type === 'training') return `Ja · ${training(context)}`
  if (input.type === 'days') return `Ja · Flere ${professionalTerms(context).days} · ${input.extraDays || 'Antall mangler'}`
  return 'Ja · Oppfølgingstype mangler'
}

export function FollowUpConflict({ saved, value, proposal }: {
  saved: DayView; value: FollowUpInput; proposal?: ReturnType<typeof previewFollowUp>
}) {
  return (
    <>
      <p>Lagret plan · Dag {saved.plannedLastDay}</p>
      {saved.mentorDay && <p>Lagret oppfølgingsvalg · {followUpText(saved.mentorDay.followUp.decision?.choice, saved.context)}</p>}
      <p>Ditt ulagrede oppfølgingsvalg · {followUpDraftText(value, saved.context)}</p>
      {proposal && ('choice' in proposal ? <p>Foreslått siste dag med lagret plan · Dag {proposal.proposedLastDay}</p>
        : <p className="field-error">{proposal.message}</p>)}
    </>
  )
}

type Props = {
  view: MentorView
  value: FollowUpInput
  result: ReturnType<typeof previewFollowUp>
  dirty: boolean
  showIssues: boolean
  blocked: boolean
  saving: boolean
  pending: boolean
  failed: boolean
  currentLastDay: number
  onChange: (value: FollowUpInput) => void
  onDiscard: () => void
  onSave: () => void
}

export function FollowUpForm({ view, value, result, dirty, showIssues, blocked, saving, pending, failed, currentLastDay, onChange, onDiscard, onSave }: Props) {
  const { mentorDay } = view
  const { decision, window, history } = mentorDay.followUp
  const options = availableExtraDays(window)
  const issue = (dirty || showIssues) && 'field' in result ? result : undefined
  const cannotExtend = !options.length
  const needsError = issue?.field === 'need' ? 'follow-up-need-error' : undefined
  const typeError = issue?.field === 'type' ? 'follow-up-type-error' : undefined
  const countError = issue?.field === 'extraDays' ? 'follow-up-count-error' : undefined

  return (
    <section className="follow-up" aria-labelledby="follow-up-heading">
      <h2 id="follow-up-heading">Behov for videre oppfølging</h2>
      <div aria-live="polite" aria-atomic="true">
        <p><strong>Gjeldende planlagt siste dag</strong> · Dag {currentLastDay}</p>
        {dirty && !failed && 'proposedLastDay' in result && (
          <p><strong>Foreslått siste dag</strong> · Dag {result.proposedLastDay}</p>
        )}
      </div>
      <p>{decision ? <>Registrert for dag {view.day} · {followUpText(decision.choice, view.context)}</> : 'Dagens oppfølging er ubesvart.'}</p>
      {mentorDay.editable && (
        <div className="follow-up-fields">
          <fieldset disabled={blocked} aria-disabled={pending || undefined} aria-describedby={needsError}>
            <legend>Trenger sjåføren videre oppfølging?</legend>
            <label className="follow-up-option">
              <input id="follow-up-yes" type="radio" name="follow-up-needed" value="yes" checked={value.need === 'yes'}
                aria-invalid={Boolean(needsError)}
                onChange={() => onChange({ need: 'yes', type: '', extraDays: '' })} />
              Ja
            </label>
            <label className="follow-up-option">
              <input id="follow-up-no" type="radio" name="follow-up-needed" value="no" checked={value.need === 'no'}
                aria-invalid={Boolean(needsError)}
                onChange={() => onChange({ need: 'no', type: '', extraDays: '' })} />
              Nei
            </label>
            {needsError && <p id={needsError} className="field-error">{issue?.message}</p>}
          </fieldset>
          {value.need === 'yes' && (
            <fieldset disabled={blocked} aria-disabled={pending || undefined} aria-describedby={typeError}>
              <legend>Oppfølgingstype</legend>
              <label className="follow-up-option">
                <input id="follow-up-type" type="radio" name="follow-up-type" value="days" checked={value.type === 'days'}
                  aria-describedby={cannotExtend ? 'follow-up-day-limit' : undefined} aria-invalid={Boolean(typeError)}
                  disabled={cannotExtend && value.type !== 'days'}
                  onChange={() => onChange({ need: 'yes', type: 'days', extraDays: '' })} />
                Flere {professionalTerms(view.context).days}
              </label>
              {cannotExtend && <p id="follow-up-day-limit" className="hint">Det er ingen ekstra dager tilgjengelig innen femdagersgrensen.</p>}
              {value.type === 'days' && (
                <div className="field">
                  <label htmlFor="follow-up-count">Antall ekstra dager</label>
                  <select id="follow-up-count" value={value.extraDays} aria-invalid={Boolean(countError)}
                    aria-describedby={countError} onChange={event => onChange({ ...value, extraDays: event.target.value })}>
                    <option value="">Velg antall</option>
                    {value.extraDays && !options.includes(Number(value.extraDays)) && (
                      <option value={value.extraDays} disabled>{value.extraDays} · Ikke tilgjengelig</option>
                    )}
                    {options.map(count => <option key={count} value={count}>{count}</option>)}
                  </select>
                  {countError && <p id={countError} className="field-error">{issue?.message}</p>}
                </div>
              )}
              <label className="follow-up-option">
                <input id="follow-up-training" type="radio" name="follow-up-type" value="training" checked={value.type === 'training'}
                  aria-invalid={Boolean(typeError)}
                  onChange={() => onChange({ need: 'yes', type: 'training', extraDays: '' })} />
                {training(view.context)}
              </label>
              {typeError && <p id={typeError} className="field-error">{issue?.message}</p>}
            </fieldset>
          )}
          {dirty && !failed && (
            <div className="actions">
              <button type="button" className="button primary" disabled={blocked || Boolean(issue) || saving} onClick={() => {
                focusMatrixField(value.need === 'no' ? 'follow-up-no' : value.type === 'days' ? 'follow-up-count' : 'follow-up-training')
                onSave()
              }}>
                Lagre oppfølging
              </button>
              <button type="button" className="button secondary" disabled={blocked || saving} onClick={() => {
                focusMatrixField(decision?.choice.kind === 'none' ? 'follow-up-no' : 'follow-up-yes')
                onDiscard()
              }}>
                Forkast planutkast
              </button>
            </div>
          )}
        </div>
      )}
      <PlanHistory history={history} />
    </section>
  )
}
