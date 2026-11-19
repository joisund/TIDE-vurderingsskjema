import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { testDriveCommentLimits } from '../content/test-drive-api.ts'
import type {
  TestDriveAssessmentAction, TestDriveDetail, TestDriveInstructorFields, TestDriveInstructorWrite,
} from '../content/test-drive-api.ts'
import { PilotRequestError, assessmentStatus, pilotAssessmentWrite, pilotMessage, sameAssessmentFields } from './test-drive-client.ts'

type Draft = { revision: number; fields: TestDriveInstructorFields }

function sameAssessment(first: TestDriveInstructorFields, second: TestDriveInstructorFields) {
  return first.result === second.result && first.overallComment === second.overallComment &&
    sameAssessmentFields(first.answers, second.answers) && sameAssessmentFields(first.comments, second.comments)
}

export function InstructorTestDriveAssessment({ detail, onUpdated, onRefresh, onAccessDenied }: {
  detail: Extract<TestDriveDetail, { role: 'instructor' }>
  onUpdated: (detail: TestDriveDetail) => void
  onRefresh: () => void
  onAccessDenied: (error: unknown) => boolean
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [request, setRequest] = useState<{ action: TestDriveAssessmentAction; payload: TestDriveInstructorWrite } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const problemField = useRef<HTMLParagraphElement>(null)
  const assessment = detail.instructorAssessment
  const { criteria, instructorChoices, resultChoices } = detail.template
  const locked = assessment.submittedAt !== null
  const editable = !locked && (detail.phase === 'driving' || detail.phase === 'after')
  const hasChanges = draft !== null && !sameAssessment(draft.fields, assessment)
  const newerRevision = hasChanges && draft.revision !== assessment.revision
  const { answers, comments, overallComment, result } = draft?.fields ?? assessment
  const remaining = criteria.filter(({ id }) => answers[id] === undefined).length

  if (!busy && request && draft && assessment.revision > request.payload.revision) {
    const confirmed = assessment.revision === request.payload.revision + 1 &&
      sameAssessment(request.payload, assessment) && locked === (request.action === 'submit')
    if (confirmed) {
      setDraft(hasChanges ? { ...draft, revision: assessment.revision } : null)
      setProblem('')
    }
    setRequest(null)
  } else if (!busy && !request && draft && assessment.revision > draft.revision && !hasChanges) {
    setDraft(null)
  }

  function edit(fields: Partial<TestDriveInstructorFields>) {
    setDraft({ revision: draft?.revision ?? assessment.revision, fields: { answers, comments, overallComment, result, ...fields } })
    if (!request) setProblem('')
  }

  function editComment(id: string, comment: string) {
    const next = { ...comments }
    if (comment) next[id] = comment
    else delete next[id]
    edit({ comments: next })
  }

  function resetToSaved() {
    setDraft(null)
    setProblem('')
    setRequest(null)
  }

  async function write(action: TestDriveAssessmentAction) {
    if (busy || !editable || newerRevision || (request && request.action !== action)) return
    if (!request && action === 'submit' && (remaining > 0 || result === null)) {
      flushSync(() => setProblem(remaining > 0 ? 'Svar på alle kriteriene før du leverer.' : 'Velg et samlet resultat før du leverer.'))
      problemField.current?.focus()
      return
    }
    const fields = { answers, comments, overallComment, result }
    const payload = request?.payload ?? { ...fields, requestId: crypto.randomUUID(), revision: draft?.revision ?? assessment.revision }
    setRequest({ action, payload })
    setDraft({ revision: payload.revision, fields })
    setBusy(true)
    setProblem('')
    try {
      const updated = await pilotAssessmentWrite<TestDriveDetail>(`/runs/${detail.id}/instructor/${action}`, payload)
      onUpdated(updated)
      if (action === 'submit') heading.current?.focus()
    } catch (error) {
      if (onAccessDenied(error)) return
      setProblem(`Kunne ikke ${action === 'save' ? 'lagre' : 'levere'} instruktørvurderingen. ${pilotMessage(error)}`)
      if (error instanceof PilotRequestError && error.status < 500) {
        setRequest(null)
        if (error.status === 409) onRefresh()
      }
    } finally { setBusy(false) }
  }

  function assessmentList(fields: TestDriveInstructorFields, onlyChanged = false) {
    return (
      <dl className="test-drive-answer-list">
        {criteria.filter(({ id }) => !onlyChanged || fields.answers[id] !== assessment.answers[id] ||
          fields.comments[id] !== assessment.comments[id]).map(({ id, label }) => (
          <div key={id}>
            <dt>{label}</dt>
            <dd>{instructorChoices.find(choice => choice.id === fields.answers[id])?.label ?? 'Ubesvart'}</dd>
            {(fields.comments[id] || (onlyChanged && assessment.comments[id])) && (
              <dd className="test-drive-comment">{fields.comments[id] || 'Tom kommentar'}</dd>
            )}
          </div>
        ))}
        {(!onlyChanged || fields.result !== assessment.result) && (
          <div><dt>Samlet resultat</dt><dd>{resultChoices.find(choice => choice.id === fields.result)?.label ?? 'Ubesvart'}</dd></div>
        )}
        {((!onlyChanged && fields.overallComment) || (onlyChanged && fields.overallComment !== assessment.overallComment)) && (
          <div><dt>Samlet kommentar</dt><dd className="test-drive-comment">{fields.overallComment || 'Tomt'}</dd></div>
        )}
      </dl>
    )
  }

  const status = (
    <p className="save-status" role="status">
      {editable || locked ? assessmentStatus(assessment) :
        detail.phase === 'before' ? 'Åpnes når kandidaten har levert førvurderingen.' : 'Stengt for registrering.'}
      {hasChanges && ' · Ulagret vurdering'}
    </p>
  )
  const feedback = (
    <>
      {problem && <p role="alert" className="error-panel" ref={problemField} tabIndex={-1}>{problem}
        {editable && request?.action === 'save' && ' Prøv å lagre igjen før du leverer.'}
      </p>}
      {newerRevision && !problem && <p>Revisjon {assessment.revision} er lagret på en annen klient. Dine endringer vises som ulagret vurdering.</p>}
    </>
  )

  return (
    <section className="test-drive-assessment" aria-labelledby="instructor-assessment">
      <h3 id="instructor-assessment" ref={heading} tabIndex={-1}>Instruktørvurdering</h3>
      {!editable && status}
      {editable && (
        <>
          <p>{criteria.length - remaining} av {criteria.length} kriterier besvart. Vurderingen låses når du leverer.</p>
          <div className="test-drive-questions">
            {criteria.map(({ id, label }) => (
              <fieldset className="test-drive-question" key={id} disabled={busy}>
                <legend>{label}</legend>
                <div className="test-drive-choices">
                  {instructorChoices.map(({ id: value, label: choiceLabel }) => (
                    <label key={value}>
                      <input type="radio" name={`instructor-${id}`} value={value} checked={answers[id] === value}
                        onChange={() => edit({ answers: { ...answers, [id]: value } })} />
                      {choiceLabel}
                    </label>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor={`instructor-comment-${id}`}>Kommentar</label>
                  <textarea id={`instructor-comment-${id}`} aria-label={`Kommentar til ${label}`} rows={2}
                    aria-describedby={`instructor-comment-limit-${id}`}
                    maxLength={testDriveCommentLimits.criterion} value={comments[id] ?? ''}
                    onChange={event => editComment(id, event.currentTarget.value)} />
                  <span id={`instructor-comment-limit-${id}`} className="hint">Inntil {testDriveCommentLimits.criterion} tegn</span>
                </div>
              </fieldset>
            ))}
            <div className="field">
              <label htmlFor="instructor-overall-comment">Samlet kommentar</label>
              <textarea id="instructor-overall-comment" rows={5} maxLength={testDriveCommentLimits.overall}
                aria-describedby="instructor-overall-comment-limit"
                value={overallComment} disabled={busy} onChange={event => edit({ overallComment: event.currentTarget.value })} />
              <span id="instructor-overall-comment-limit" className="hint">Inntil {testDriveCommentLimits.overall} tegn</span>
            </div>
            <fieldset className="test-drive-question" disabled={busy}>
              <legend>Samlet resultat</legend>
              <div className="test-drive-choices">
                {resultChoices.map(({ id, label }) => (
                  <label key={id}>
                    <input type="radio" name="instructor-result" value={id} checked={result === id}
                      onChange={() => edit({ result: id })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="test-drive-assessment-actions">
            {status}
            {feedback}
            <div className="actions">
              <button type="button" className="button secondary"
                disabled={busy || newerRevision || request?.action === 'submit' || (!hasChanges && request?.action !== 'save')}
                onClick={() => void write('save')}>Lagre instruktørvurdering</button>
              <button type="button" className="button primary" disabled={busy || newerRevision || request?.action === 'save'}
                onClick={() => void write('submit')}>Lever instruktørvurdering</button>
            </div>
          </div>
        </>
      )}
      {!editable && feedback}
      {locked && (
        <details className="field-check">
          <summary>Se instruktørvurderingen</summary>
          {assessmentList(assessment)}
        </details>
      )}
      {!editable && hasChanges && (
        <>
          <h4>Ulagret vurdering</h4>
          {assessmentList(draft.fields, true)}
        </>
      )}
      {newerRevision && (
        <button type="button" className="button secondary" disabled={busy} onClick={resetToSaved}>Bruk lagret vurdering</button>
      )}
    </section>
  )
}
