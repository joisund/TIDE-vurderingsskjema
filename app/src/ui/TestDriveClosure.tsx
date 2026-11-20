import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { PdfRenderingError } from '../application/run-pdf.ts'
import { testDriveReceiptTime } from '../content/test-drive-api.ts'
import type { TestDriveClosedDetail, TestDriveClosedDocument, TestDriveOpenDetail } from '../content/test-drive-api.ts'
import { PdfDownload } from './RunPdfDownload.tsx'
import { pilotAssessmentWrite, pilotMessage, pilotRequest } from './test-drive-client.ts'

type AccessHandler = (error: unknown) => boolean
class PdfModuleError extends Error {}
const exportTimeout = 30_000
const recoveryParameter = 'pdf-oppdatering'

function reloadPdfPage() {
  const url = new URL(window.location.href)
  url.searchParams.set(recoveryParameter, crypto.randomUUID())
  window.location.replace(url)
}

async function renderAuthorizedPdf(runId: string, signal: AbortSignal) {
  const path = `/runs/${runId}/export-source`
  function authorize() {
    signal.throwIfAborted()
    return pilotRequest<TestDriveClosedDocument>(path, undefined, signal)
  }
  const authorized = await authorize()
  signal.throwIfAborted()
  const recovery = new URLSearchParams(window.location.search).has(recoveryParameter)
  // WebKit kan beholde et mislykket moduloppslag også etter ny dokumentinnlasting.
  const renderer = recovery ? import('../adapters/pdf/renderer.tsx?pdf-recovery') : import('../adapters/pdf/renderer.tsx')
  const { preparePdfResources, renderTestDrivePdf } = await renderer.catch(() => {
    signal.throwIfAborted()
    throw new PdfModuleError('PDF-koden kunne ikke lastes.')
  })
  signal.throwIfAborted()
  try {
    await preparePdfResources(signal)
  } catch {
    signal.throwIfAborted()
    throw new PdfRenderingError('PDF-ressursene kunne ikke lastes. Prøv igjen.')
  }
  signal.throwIfAborted()
  const blob = await renderTestDrivePdf(authorized, signal)
  // Tilgangen kan endres mens PDF-en genereres lokalt.
  await authorize()
  signal.throwIfAborted()
  return { blob, filename: `testkjoring-${authorized.runId}.pdf` }
}

async function downloadWithinDeadline(runId: string, cancellation: AbortSignal) {
  cancellation.throwIfAborted()
  const expiry = new AbortController()
  const signal = AbortSignal.any([cancellation, expiry.signal])
  const timer = setTimeout(() => expiry.abort(new DOMException('Ventetiden utløp.', 'TimeoutError')), exportTimeout)
  // Importen kan fullføre sent og kan ikke avbrytes direkte.
  let onAbort = () => {}
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
  })
  try {
    return await Promise.race([renderAuthorizedPdf(runId, signal), aborted])
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', onAbort)
  }
}

export function CloseTestDrive({ detail, onClosed, onRefresh, onAccessDenied }: {
  detail: Extract<TestDriveOpenDetail, { role: 'instructor' }>
  onClosed: (detail: TestDriveClosedDetail) => void
  onRefresh: () => void
  onAccessDenied: AccessHandler
}) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const action = useRef<HTMLButtonElement>(null)
  const prompt = useRef<HTMLParagraphElement>(null)
  const missing = [
    !detail.candidateAssessments.before.submittedAt && 'Førvurdering',
    !detail.candidateAssessments.after.submittedAt && 'Ettervurdering',
    !detail.instructorAssessment.submittedAt && 'Instruktørvurdering',
  ].filter(part => part !== false)

  async function close() {
    if (busy || missing.length) return
    setBusy(true)
    setProblem('')
    try {
      onClosed(await pilotAssessmentWrite<TestDriveClosedDetail>(`/runs/${detail.id}/close`, {}))
    } catch (error) {
      if (!onAccessDenied(error)) setProblem(`Kunne ikke avslutte testkjøringen. ${pilotMessage(error)}`)
    } finally { setBusy(false) }
  }

  return (
    <section className="test-drive-assessment" aria-labelledby="test-drive-close">
      <h3 id="test-drive-close">Avslutning</h3>
      {missing.length ? (
        <>
          <p>Mangler før avslutning</p>
          <ul className="test-drive-missing-parts">
            {missing.map(part => <li key={part}>{part}</li>)}
          </ul>
          {detail.phase !== 'before' && <button type="button" className="button secondary" onClick={onRefresh}>Oppdater leveringsstatus</button>}
        </>
      ) : confirm ? (
        <>
          <p ref={prompt} tabIndex={-1}>Vurderingene låses som ett dokument. Kandidaten og instruktøren får tilgang til resultatet.</p>
          <div className="actions">
            <button type="button" className="button primary" disabled={busy} onClick={() => void close()}>Bekreft avslutning</button>
            <button type="button" className="button secondary" disabled={busy} onClick={() => {
              flushSync(() => { setConfirm(false); setProblem('') })
              action.current?.focus()
            }}>Avbryt</button>
          </div>
          {busy && <p role="status">Avslutter testkjøringen …</p>}
          {problem && <p className="error-panel" role="alert">{problem}</p>}
        </>
      ) : (
        <button ref={action} type="button" className="button primary" onClick={() => {
          flushSync(() => setConfirm(true))
          prompt.current?.focus()
        }}>Avslutt testkjøringen</button>
      )}
    </section>
  )
}

export function TestDriveResult({ detail, busy, onAccessDenied }: {
  detail: TestDriveClosedDetail
  busy: boolean
  onAccessDenied: AccessHandler
}) {
  const { document: source } = detail
  const { candidateAssessments: { before, after }, instructorAssessment, template } = source

  return (
    <section className="test-drive-assessment" aria-labelledby="test-drive-result">
      <h3 id="test-drive-result" tabIndex={-1}>Resultat av testkjøringen</h3>
      <dl className="details">
        <div><dt>Samlet resultat</dt><dd>{template.resultChoices.find(choice => choice.id === instructorAssessment.result)?.label}</dd></div>
        <div><dt>Avsluttet</dt><dd>{source.instructor.name} · <time dateTime={source.closedAt}>{testDriveReceiptTime(source.closedAt)}</time></dd></div>
        <div><dt>Førvurdering</dt><dd>{source.candidate.name} · <time dateTime={before.submittedAt}>{testDriveReceiptTime(before.submittedAt)}</time></dd></div>
        <div><dt>Ettervurdering</dt><dd>{source.candidate.name} · <time dateTime={after.submittedAt}>{testDriveReceiptTime(after.submittedAt)}</time></dd></div>
        <div><dt>Instruktørvurdering</dt><dd>{source.instructor.name} · <time dateTime={instructorAssessment.submittedAt}>{testDriveReceiptTime(instructorAssessment.submittedAt)}</time></dd></div>
      </dl>
      <PdfDownload busy={busy} download={signal => downloadWithinDeadline(detail.id, signal)}
        label="Last ned testkjørings-PDF" cancelWhenHidden report={onAccessDenied}
        describeError={error => error instanceof PdfModuleError
          ? { message: error.message, reload: reloadPdfPage }
          : `PDF-en kunne ikke opprettes. ${error instanceof PdfRenderingError ? error.message : pilotMessage(error)}`} />
      <h4>Vurderinger</h4>
      <ol className="test-drive-final-criteria">
        {template.criteria.map(({ id, label }) => (
          <li key={id}>
            <h5>{label}</h5>
            <dl className="details">
              <div><dt>Kandidat før</dt><dd>{template.candidateChoices.find(choice => choice.id === before.answers[id])?.label}</dd></div>
              <div><dt>Kandidat etter</dt><dd>{template.candidateChoices.find(choice => choice.id === after.answers[id])?.label}</dd></div>
              <div><dt>Instruktør</dt><dd>{template.instructorChoices.find(choice => choice.id === instructorAssessment.answers[id])?.label}</dd></div>
            </dl>
            {instructorAssessment.comments[id] && <p className="test-drive-comment">{instructorAssessment.comments[id]}</p>}
          </li>
        ))}
      </ol>
      {instructorAssessment.overallComment && (
        <>
          <h4>Samlet kommentar</h4>
          <p className="test-drive-comment">{instructorAssessment.overallComment}</p>
        </>
      )}
    </section>
  )
}
