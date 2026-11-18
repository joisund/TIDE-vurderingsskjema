import type { DayView } from '../application/run-application.ts'
import type { Answer } from '../domain/baseline.ts'
import { evaluationFields } from '../domain/driver-day.ts'
import type { Confirmation } from '../domain/run.ts'
import { CalendarDate, ConfirmationTime } from './CalendarDate.tsx'
import { FollowUpText, PlanHistory } from './FollowUpForm.tsx'
import { answerLabels, evaluationLabels } from './assessment-fields.ts'

export function DayTimeline({ day, busy, onSelect }: { day: DayView; busy: boolean; onSelect: (id: string) => void }) {
  return (
    <section className="baseline-entry" aria-labelledby="day-history-heading">
      <h2 id="day-history-heading">Registrerte dager</h2>
      <ol className="day-history">
        {day.days.map(item => (
          <li key={item.id} aria-current={item.id === day.dayId ? 'true' : undefined}>
            <p><strong>Dag {item.number} · <CalendarDate value={item.date} /></strong>
              {item.id === day.dayId && ' · Valgt dag'}</p>
            <p>{item.dayLocked ? 'Dagen er låst' : 'Dagen er åpen'}</p>
            {item.driverConfirmation
              ? <p>Ettervurdering bekreftet av {item.driverConfirmation.actor.name}, sjåfør.</p>
              : <p>Ettervurdering ikke bekreftet.</p>}
            {day.mentorDay && (item.mentorConfirmation
              ? <p>Faddervurdering bekreftet av {item.mentorConfirmation.actor.name}, fadder.</p>
              : <p>Faddervurdering ikke bekreftet.</p>)}
            {item.id !== day.dayId && (
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => onSelect(item.id)}>Åpne dag {item.number}</button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function PartState({ confirmation }: { confirmation?: Confirmation }) {
  if (!confirmation) return <p>Ikke bekreftet.</p>
  const { actor, confirmedAt } = confirmation
  return <p>Låst. Bekreftet av {actor.name}, {actor.role}. <ConfirmationTime value={confirmedAt} /></p>
}

function AnswerSummary({ answer }: { answer: Answer }) {
  return (
    <>
      {answer.value === null ? 'Ubesvart' : answerLabels[answer.value]}
      {answer.reason && <p className="assessment-text">Begrunnelse · {answer.reason}</p>}
    </>
  )
}

export function DayHistory({ day }: { day: DayView }) {
  const { baseline, driverAfter, mentorDay, fields } = day
  const evaluation = driverAfter?.evaluation
  const evaluationDraft = driverAfter?.evaluationDraft
  const evaluationTexts = evaluation?.texts ?? evaluationDraft?.texts
  const hasEvaluationText = Object.values(evaluationTexts ?? {}).some(Boolean)
  const retainedEvaluationText = hasEvaluationText && !driverAfter?.evaluationOffered
    && (!evaluation || evaluation.state === 'not_offered')
  const criteria = baseline.criteria
  const beforeAnswers = new Map(baseline.answers.map(answer => [answer.criterionId, answer]))
  const afterAnswers = new Map(driverAfter?.answers.map(answer => [answer.criterionId, answer]))
  const mentorAnswers = new Map(mentorDay?.answers.map(answer => [answer.criterionId, answer]))

  return (
    <section className="history-reading" aria-labelledby="history-day-heading">
      <h2 className="category" id="history-day-heading">Dag {day.day} · <CalendarDate value={fields.date} /></h2>
      <dl className="details">
        <div><dt>Sjåfør</dt><dd>{fields.driverName || 'Ubesvart'}</dd></div>
        <div><dt>Ansattnummer</dt><dd>{fields.employeeNumber || 'Ubesvart'}</dd></div>
        <div><dt>Fadder</dt><dd>{fields.mentorName || 'Ubesvart'}</dd></div>
        <div><dt>Buss</dt><dd>{[fields.bus1, fields.bus2].filter(Boolean).join(', ') || 'Ubesvart'}</dd></div>
        <div><dt>Linjer</dt><dd>{fields.routes || 'Ubesvart'}</dd></div>
        <div><dt>Inn-tid</dt><dd>{fields.startTime || 'Ubesvart'}</dd></div>
        <div><dt>Ut-tid</dt><dd>{fields.endTime || 'Ubesvart'}</dd></div>
      </dl>
      <h3>Førvurdering for løpet</h3>
      <p>Samme førvurdering fra dag 1 · <CalendarDate value={baseline.fields.date} /></p>
      <PartState confirmation={baseline.confirmation} />
      <h3>Ettervurdering · Dag {day.day}</h3>
      {driverAfter ? <PartState confirmation={driverAfter.confirmation} />
        : <p>Ettervurderingen åpner når førvurderingen er bekreftet.</p>}
      {mentorDay && (
        <>
          <h3>Faddervurdering · Dag {day.day}</h3>
          <PartState confirmation={mentorDay.confirmation} />
          <p>Dagens oppfølging · <FollowUpText choice={mentorDay.followUp.decision?.choice} /></p>
          <PlanHistory history={mentorDay.followUp.history} />
        </>
      )}
      {(hasEvaluationText || evaluationDraft?.decision || (evaluation && evaluation.state !== 'not_offered')) && (
        <>
          <h3>Egenevaluering · Dag {day.day}</h3>
          {evaluation?.state === 'skipped' && <p>Hoppet over</p>}
          {evaluation?.state === 'submitted' && <p>Innsendt og låst</p>}
          {evaluationDraft?.decision && !evaluation &&
            <p>Valg lagret i utkast · {evaluationDraft.decision === 'skipped' ? 'Hoppet over' : 'Innsending'}</p>}
          {retainedEvaluationText && <p>Tekst beholdt fra et tidligere tilbud.</p>}
          {hasEvaluationText && !evaluation && !evaluationDraft?.decision && !retainedEvaluationText && <p>Utkast</p>}
          <dl className="history-texts">
            {evaluationFields.map(field => evaluationTexts?.[field] && (
              <div key={field}><dt>{evaluationLabels[field]}</dt><dd className="assessment-text">{evaluationTexts[field]}</dd></div>
            ))}
          </dl>
        </>
      )}
      <details className="field-check">
        <summary>Vurderingspunkter · Dag {day.day}</summary>
        <ol className="history-criteria">
          {criteria.map(({ id, title }) => {
            const before = beforeAnswers.get(id)!
            const after = afterAnswers.get(id)
            const mentor = mentorAnswers.get(id)
            const comment = mentorDay?.comments[id]
            const relevance = mentorDay?.relevance[id]
            return (
              <li key={id}>
                <h4>{title}</h4>
                <dl className="history-texts">
                  <div><dt>Sjåfør før · Dag 1</dt><dd><AnswerSummary answer={before} /></dd></div>
                  {after && <div><dt>Sjåfør etter · Dag {day.day}</dt><dd><AnswerSummary answer={after} />
                    {after.locked && <p>Videreført fra førvurderingen.</p>}</dd></div>}
                  {mentor && <div><dt>Fadder · Dag {day.day}</dt><dd><AnswerSummary answer={mentor} />
                    {mentor.actor && <p>Fadders svar · {mentor.actor.name}</p>}
                    {mentorDay?.reasonDrafts[id]?.trim() && <p className="assessment-text">Lagret begrunnelsesutkast · {mentorDay.reasonDrafts[id]}</p>}
                    {mentorDay?.rejectionDrafts[id]?.trim() && <p className="assessment-text">Lagret avslagsutkast · {mentorDay.rejectionDrafts[id]}</p>}
                  </dd></div>}
                  {comment && <div><dt>Kommentar · {comment.actor.name}, fadder</dt>
                    <dd className="assessment-text">{comment.text}</dd></div>}
                  {relevance && relevance.state !== 'not_applicable' && (
                    <div>
                      <dt>Behandling av sjåførens relevans</dt>
                      <dd>{'review' in relevance ? (
                        <>
                          {relevance.state === 'accepted' ? 'Bekreftet' : 'Avslått'} av {relevance.review.actor.name}, fadder.
                          {relevance.review.rejectionComment && <p className="assessment-text">Fadders avslagskommentar · {relevance.review.rejectionComment}</p>}
                        </>
                      ) : relevance.state === 'pending' ? 'Ubehandlet' : 'Må behandles på nytt'}</dd>
                    </div>
                  )}
                </dl>
              </li>
            )
          })}
        </ol>
      </details>
    </section>
  )
}
