import { useRef, useState } from 'react'
import type {
  TestDriveAssessmentAction, TestDriveCandidateAnswers, TestDriveCandidateChoice,
  TestDriveCandidatePart, TestDriveCandidateWrite, TestDriveDetail, TestDriveOpenDetail,
} from '../content/test-drive-api.ts'
import { PilotRequestError, assessmentStatus, pilotAssessmentWrite, pilotMessage, sameAssessmentFields } from './test-drive-client.ts'

const candidateAssessmentName: Record<TestDriveCandidatePart, string> = {
  before: 'Førvurdering',
  after: 'Ettervurdering',
}

type Draft = { revision: number; answers: TestDriveCandidateAnswers }

export function CandidateTestDriveAssessment({ detail, part, onUpdated, onRefresh, onAccessDenied }: {
  detail: Extract<TestDriveOpenDetail, { role: 'candidate' }>
  part: TestDriveCandidatePart
  onUpdated: (detail: TestDriveDetail) => void
  onRefresh: (focusResult?: true) => void
  onAccessDenied: (error: unknown) => boolean
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [request, setRequest] = useState<{ action: TestDriveAssessmentAction; payload: TestDriveCandidateWrite } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const assessment = detail.candidateAssessments[part]
  const { criteria, candidateChoices } = detail.template
  const name = candidateAssessmentName[part]
  const actionName = name.toLowerCase()
  const labelId = `candidate-assessment-${part}`
  const locked = assessment.submittedAt !== null
  const editable = !locked && detail.phase === part
  const hasChanges = draft !== null && !sameAssessmentFields(draft.answers, assessment.answers)
  const newerRevision = hasChanges && draft.revision !== assessment.revision
  const answers = draft?.answers ?? assessment.answers
  const remaining = criteria.filter(({ id }) => answers[id] === undefined).length
  const saveStatus = (
    <p className="save-status" role="status">
      {editable || locked ? assessmentStatus(assessment) :
        part === 'after' ? 'Åpnes når instruktøren bekrefter at kjøringen er gjennomført.' :
          'Stengt for registrering.'}
      {hasChanges && ' · Ulagrede svar'}
    </p>
  )

  const confirmed = request && assessment.revision > request.payload.revision &&
    sameAssessmentFields(request.payload.answers, assessment.answers) && (request.action === 'save' || locked)
  if (!busy && draft && assessment.revision > draft.revision && !hasChanges && (!request || confirmed)) {
    setDraft(null)
    setRequest(null)
    if (confirmed) setProblem('')
  }

  function choose(id: string, value: TestDriveCandidateChoice) {
    setDraft({ revision: draft?.revision ?? assessment.revision, answers: { ...answers, [id]: value } })
    setProblem('')
    setRequest(null)
  }

  function resetToSaved() {
    setDraft(null)
    setProblem('')
    setRequest(null)
  }

  async function write(action: TestDriveAssessmentAction) {
    if (busy || !editable || (request && request.action !== action)) return
    if (action === 'submit' && remaining > 0) {
      setProblem('Svar på alle kriteriene før du leverer.')
      return
    }
    const payload = request?.payload ??
      { requestId: crypto.randomUUID(), revision: draft?.revision ?? assessment.revision, answers }
    setRequest({ action, payload })
    setDraft({ revision: payload.revision, answers: payload.answers })
    setBusy(true)
    setProblem('')
    try {
      const result = await pilotAssessmentWrite<TestDriveDetail>(`/runs/${detail.id}/candidate/${part}/${action}`, payload)
      onUpdated(result)
      setRequest(null)
      if (action === 'submit') heading.current?.focus()
    } catch (error) {
      if (onAccessDenied(error)) return
      setProblem(`Kunne ikke ${action === 'save' ? 'lagre' : 'levere'} ${actionName}en. ${pilotMessage(error)}`)
      if (error instanceof PilotRequestError && error.status < 500) {
        setRequest(null)
        if (error.status === 409) onRefresh()
      }
    } finally { setBusy(false) }
  }

  function answerList(values: TestDriveCandidateAnswers, onlyChanged = false) {
    return (
      <dl className="test-drive-answer-list">
        {criteria.filter(({ id }) => !onlyChanged || values[id] !== assessment.answers[id]).map(({ id, label }) => (
          <div key={id}><dt>{label}</dt><dd>{candidateChoices.find(choice => choice.id === values[id])?.label ?? 'Ubesvart'}</dd></div>
        ))}
      </dl>
    )
  }

  const feedback = (
    <>
      {problem && <p role="alert" className="error-panel">{problem}
        {editable && request?.action === 'save' && ' Prøv å lagre igjen før du leverer.'}
      </p>}
      {newerRevision && !problem && <p>Revisjon {assessment.revision} er lagret på en annen klient. Dine valg vises som ulagrede svar.</p>}
    </>
  )

  return (
    <section className="test-drive-assessment" aria-labelledby={labelId}>
      <h3 id={labelId} ref={heading} tabIndex={-1}>{name}</h3>
      {!editable && saveStatus}
      {editable && (
        <>
          <p>{criteria.length - remaining} av {criteria.length} kriterier besvart. Svarene låses når du leverer.</p>
          <div className="test-drive-questions">
            {criteria.map(({ id, label }) => (
              <fieldset className="test-drive-question" key={id} disabled={busy}>
                <legend>{label}</legend>
                <div className="test-drive-choices">
                  {candidateChoices.map(({ id: value, label: choiceLabel }) => (
                    <label key={value}>
                      <input type="radio" name={`${part}-${id}`} value={value} checked={answers[id] === value}
                        onChange={() => choose(id, value)} />
                      {choiceLabel}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="test-drive-assessment-actions">
            {saveStatus}
            {feedback}
            <div className="actions">
              <button className="button secondary" type="button"
                disabled={busy || request?.action === 'submit' || (!hasChanges && request?.action !== 'save')}
                onClick={() => void write('save')}>Lagre {actionName}</button>
              <button className="button primary" type="button" disabled={busy || request?.action === 'save'}
                onClick={() => void write('submit')}>Lever {actionName}</button>
            </div>
          </div>
        </>
      )}
      {!editable && feedback}
      {part === 'after' && !editable && !locked && (
        <button className="button secondary" type="button" onClick={() => onRefresh()}>Oppdater status</button>
      )}
      {locked && (
        <details className="field-check">
          <summary>Se svar i {actionName}en</summary>
          {answerList(assessment.answers)}
        </details>
      )}
      {part === 'after' && locked && (
        <>
          <p>Resultatet blir tilgjengelig når instruktøren har avsluttet testkjøringen.</p>
          <button className="button secondary" type="button" onClick={() => onRefresh(true)}>Oppdater status</button>
        </>
      )}
      {!editable && hasChanges && (
        <>
          <h4>Ulagrede svar</h4>
          {answerList(draft.answers, true)}
        </>
      )}
      {newerRevision && (
        <button className="button secondary" type="button" disabled={busy} onClick={resetToSaved}>Bruk lagrede svar</button>
      )}
    </section>
  )
}
