import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { flushSync } from 'react-dom'
import logo from '../assets/tide-logo-rgb.png'
import { testDrivePath } from '../content/test-drive-api.ts'
import type { TestDriveAdministration, TestDriveDetail, TestDrivePhase, TestDriveWorkspace } from '../content/test-drive-api.ts'
import { CreateTestDriveForm } from './CreateTestDriveForm.tsx'
import { PilotRequestError, pilotMessage, pilotRequest } from './test-drive-client.ts'
import './app.css'
import './test-drive.css'

const phaseName: Record<TestDrivePhase, string> = {
  before: 'Førvurdering', driving: 'Kjøring', after: 'Ettervurdering', closed: 'Avsluttet',
}
const accessName = { active: 'Aktiv', expired: 'Utløpt', revoked: 'Trukket tilbake' }
const dateTime = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short' })
const unavailableRun = 'Testkjøringen er ikke tilgjengelig for denne innloggingen.'

function usePilotRefresh(load: (signal: AbortSignal) => void, shield: () => void) {
  const refresh = useEffectEvent(load)
  const hideStaleView = useEffectEvent(shield)
  useEffect(() => {
    let controller: AbortController | undefined
    function recheck() {
      controller?.abort()
      controller = new AbortController()
      refresh(controller.signal)
    }
    function onVisible() { if (document.visibilityState === 'visible') recheck() }
    function beforeCache(event: PageTransitionEvent) {
      if (!event.persisted) return
      controller?.abort()
      flushSync(() => hideStaleView())
    }
    function restore(event: PageTransitionEvent) {
      if (!event.persisted) return
      beforeCache(event)
      recheck()
    }
    recheck()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', recheck)
    window.addEventListener('pagehide', beforeCache)
    window.addEventListener('pageshow', restore)
    return () => {
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', recheck)
      window.removeEventListener('pagehide', beforeCache)
      window.removeEventListener('pageshow', restore)
    }
  }, [])
}

function Deadline({ value }: { value: string }) {
  return <time dateTime={value}>{dateTime.format(new Date(value))}</time>
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const codeField = useRef<HTMLInputElement>(null)
  useEffect(() => { if (challengeId) codeField.current?.focus() }, [challengeId])

  async function sendCode() {
    setBusy(true)
    setProblem('')
    try {
      const result = await pilotRequest<{ challengeId: string | null }>('/auth/code', { email })
      if (!result.challengeId) {
        setProblem(challengeId ? 'Vent før du ber om ny kode. Du kan fortsatt prøve den siste koden.' : 'Vent før du ber om en kode på nytt.')
        return
      }
      setChallengeId(result.challengeId)
      setCode('')
    } catch (error) { setProblem(pilotMessage(error)) }
    finally { setBusy(false) }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!challengeId) return sendCode()
    setBusy(true)
    setProblem('')
    try {
      await pilotRequest('/auth/verify', { email, challengeId, code })
      window.location.reload()
    } catch (error) {
      setProblem(pilotMessage(error))
      setBusy(false)
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <p>Logg inn med e-postadressen din for å åpne tildelte testkjøringer.</p>
      {problem && <p className="error-panel" role="alert">{problem}</p>}
      <div className="field">
        <label htmlFor="test-drive-email">E-postadresse</label>
        <input id="test-drive-email" type="email" value={email} autoComplete="email" maxLength={254} required
          readOnly={Boolean(challengeId)} onChange={event => setEmail(event.currentTarget.value)} />
      </div>
      {challengeId && (
        <div className="field">
          <label htmlFor="test-drive-otp">Engangskode</label>
          <input id="test-drive-otp" ref={codeField} value={code} onChange={event => setCode(event.currentTarget.value)}
            inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required />
          <p className="hint" role="status">Hvis adressen er registrert, er en kode sendt. Koden er gyldig i 10 minutter.</p>
        </div>
      )}
      <div className="actions">
        <button type="submit" className="button primary" disabled={busy}>{challengeId ? 'Logg inn' : 'Send engangskode'}</button>
        {challengeId && <>
          <button type="button" className="button secondary" disabled={busy} onClick={() => void sendCode()}>Be om ny kode</button>
          <button type="button" className="button secondary" disabled={busy} onClick={() => { setChallengeId(''); setProblem('') }}>
            Endre e-postadresse
          </button>
        </>}
      </div>
    </form>
  )
}

function ManagedRun({ run, onRevoked, onSessionEnd }: {
  run: TestDriveAdministration
  onRevoked: (run: TestDriveAdministration) => void
  onSessionEnd: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  async function revoke() {
    setProblem('')
    setBusy(true)
    try {
      const updated = await pilotRequest<TestDriveAdministration>(`/runs/${run.id}/revoke`, {})
      onRevoked(updated)
      setConfirm(false)
    } catch (error) {
      if (error instanceof PilotRequestError && error.status === 401) return onSessionEnd()
      setProblem(pilotMessage(error))
    } finally { setBusy(false) }
  }

  return (
    <li className="test-drive-card">
      <h3>{run.candidate.name}</h3>
      <p>{run.candidate.email}</p>
      <dl className="details">
        <div><dt>Avdeling</dt><dd>{run.department.name}</dd></div>
        <div><dt>Instruktør</dt><dd>{run.instructor.name}<br />{run.instructor.email}</dd></div>
        <div><dt>Kandidattilgang</dt><dd>{accessName[run.access]}</dd></div>
        <div><dt>Utløp</dt><dd><Deadline value={run.expiresAt} /></dd></div>
      </dl>
      {problem && <p className="error-panel" role="alert">{problem}</p>}
      {run.access === 'active' && (confirm ? (
        <>
          <p>Kandidaten mister tilgangen til dette løpet.</p>
          <div className="actions">
            <button type="button" className="button primary" disabled={busy} onClick={() => void revoke()}>Bekreft tilbakekall</button>
            <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>Avbryt</button>
          </div>
        </>
      ) : (
        <div className="actions">
          <a className="button secondary test-drive-link" href={run.invitationUrl}>Invitasjonslenke</a>
          <button type="button" className="button secondary" onClick={() => setConfirm(true)}>Trekk tilbake tilgang</button>
        </div>
      ))}
    </li>
  )
}

function Workspace({ workspace, onSessionEnd, onRunChange }: {
  workspace: TestDriveWorkspace
  onSessionEnd: () => void
  onRunChange: (run: TestDriveAdministration) => void
}) {
  const [receipt, setReceipt] = useState('')
  function updateRun(run: TestDriveAdministration, message: string) {
    onRunChange(run)
    setReceipt(message)
  }

  return (
    <>
      {workspace.departments.length > 0 && (
        <>
          <p role="status" className="save-status">{receipt}</p>
          <CreateTestDriveForm personId={workspace.person.id} departments={workspace.departments} onSessionEnd={onSessionEnd}
            onCreated={run => updateRun(run, `Testkjøringen er registrert. Invitasjonen er sendt til ${run.candidate.email}.`)} />
          <section className="test-drive-section" aria-labelledby="test-drive-managed">
            <h2 id="test-drive-managed" tabIndex={-1}>Tilgangsstyring</h2>
            {workspace.administration.length ? (
              <ul className="run-list">
                {workspace.administration.map(run => <ManagedRun key={run.id} run={run} onSessionEnd={onSessionEnd}
                  onRevoked={updated => updateRun(updated, updated.access === 'expired'
                    ? `Tilgangen er allerede utløpt for ${updated.candidate.email}.`
                    : `Tilgangen er trukket tilbake for ${updated.candidate.email}.`)} />)}
              </ul>
            ) : <p>Ingen registrerte testkjøringer i dine avdelinger.</p>}
          </section>
        </>
      )}
      {(workspace.assignments.length > 0 || workspace.departments.length === 0) && (
        <section className="test-drive-section" aria-labelledby="test-drive-assigned">
          <h2 id="test-drive-assigned">Mine testkjøringer</h2>
          {workspace.assignments.length ? (
            <ul className="run-list">
              {workspace.assignments.map(run => (
                <li key={run.id}>
                  <a className="run-button test-drive-link" href={`${testDrivePath}?lop=${run.id}`}>
                    <span className="run-name">{run.candidateName}</span>
                    <span>{run.department.name} · {phaseName[run.phase]}</span>
                    <span>{run.role === 'candidate' ? `Instruktør · ${run.instructorName}` : 'Du er tildelt som instruktør'}</span>
                    <span className="hint">Løpsreferanse {run.id}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p>Du har ingen tilgjengelige testkjøringer.</p>}
        </section>
      )}
    </>
  )
}

function RunDetail({ id, onSessionEnd }: { id: string; onSessionEnd: () => void }) {
  const [state, setState] = useState<{ detail?: TestDriveDetail; problem?: string }>({})
  usePilotRefresh(signal => {
    void pilotRequest<TestDriveDetail>(`/runs/${encodeURIComponent(id)}`, undefined, signal).then(detail => {
      if (!signal.aborted) setState({ detail })
    }, error => {
      if (signal.aborted) return
      if (error instanceof PilotRequestError && error.status === 401) return onSessionEnd()
      setState({ problem: pilotMessage(error) })
    })
  }, () => setState({}))

  const { detail, problem } = state
  const candidateExpiry = detail?.role === 'candidate' ? Date.parse(detail.expiresAt) : undefined
  useEffect(() => {
    if (candidateExpiry === undefined) return
    let timer: ReturnType<typeof setTimeout>
    function checkDeadline(expiry: number) {
      const remaining = expiry - Date.now()
      if (remaining <= 0) setState({ problem: unavailableRun })
      else timer = setTimeout(checkDeadline, Math.min(remaining, 2 ** 31 - 1), expiry)
    }
    timer = setTimeout(checkDeadline, Math.max(0, Math.min(candidateExpiry - Date.now(), 2 ** 31 - 1)), candidateExpiry)
    return () => clearTimeout(timer)
  }, [candidateExpiry])

  return (
    <section className="test-drive-section">
      <div className="actions"><a className="button secondary test-drive-link" href={testDrivePath}>Til testkjøringsoversikten</a></div>
      {problem ? <p className="error-panel" role="alert">{problem}</p> : detail ? (
        <>
          <h2>{detail.candidateName}</h2>
          <dl className="details">
            <div><dt>Avdeling</dt><dd>{detail.department.name}</dd></div>
            <div><dt>Instruktør</dt><dd>{detail.instructorName}</dd></div>
            <div><dt>Din rolle</dt><dd>{detail.role === 'candidate' ? 'Kandidat' : 'Instruktør'}</dd></div>
            <div><dt>Fase</dt><dd>{phaseName[detail.phase]}</dd></div>
            <div><dt>Kandidatens tilgang utløper</dt><dd><Deadline value={detail.expiresAt} /></dd></div>
            {detail.template.headerFields.map(({ id, label }) => id in detail.header && (
              <div key={id}><dt>{label}</dt><dd>{detail.header[id as keyof typeof detail.header]}</dd></div>
            ))}
          </dl>
          <details className="field-check">
            <summary>Evalueringskriterier</summary>
            <ol className="test-drive-criteria">
              {detail.template.criteria.map(criterion => <li key={criterion.id}>{criterion.label}</li>)}
            </ol>
            <p className="hint">{detail.template.source.collection} {detail.template.source.year}</p>
          </details>
        </>
      ) : <p role="status">Åpner testkjøringen …</p>}
    </section>
  )
}

type View = { kind: 'loading' | 'sign-in' | 'unavailable' } | { kind: 'workspace'; workspace: TestDriveWorkspace }

function reload() { window.location.reload() }

export function TestDriveApp() {
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [problem, setProblem] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const runId = new URLSearchParams(window.location.search).get('lop')

  usePilotRefresh(signal => {
    void pilotRequest<TestDriveWorkspace>('/workspace', undefined, signal).then(workspace => {
      if (!signal.aborted) setView({ kind: 'workspace', workspace })
    }, error => {
      if (signal.aborted) return
      if (error instanceof PilotRequestError && error.status === 401) setView({ kind: 'sign-in' })
      else setView({ kind: 'unavailable' })
    })
  }, () => {
    if (!runId) setView(current => current.kind === 'workspace' ? { kind: 'loading' } : current)
  })

  function updateRun(run: TestDriveAdministration) {
    setView(current => {
      if (current.kind !== 'workspace') return current
      const list = current.workspace.administration
      const administration = list.some(item => item.id === run.id)
        ? list.map(item => item.id === run.id ? run : item)
        : [run, ...list]
      return { kind: 'workspace', workspace: { ...current.workspace, administration } }
    })
  }

  async function signOut() {
    setProblem('')
    setSigningOut(true)
    try {
      await pilotRequest('/auth/logout', {})
      reload()
    } catch (error) {
      setProblem(pilotMessage(error))
      setSigningOut(false)
    }
  }

  return (
    <>
      <header className="profile">
        <div className="profile-inner">
          <img className="logo" src={logo} alt="Tide" />
          <div className="profile-context">
            <p className="app-name">Testkjøring</p>
            {view.kind === 'workspace' && <p className="day-context">{view.workspace.person.name} · {view.workspace.person.email}</p>}
          </div>
          {view.kind === 'workspace' && <button className="button secondary" type="button" disabled={signingOut}
            onClick={() => void signOut()}>Logg ut</button>}
        </div>
      </header>
      <main className="content test-drive">
        <h1>{view.kind === 'sign-in' ? 'Logg inn til testkjøring' : 'Testkjøring'}</h1>
        {problem && <p role="alert" className="error-panel">{problem}</p>}
        {view.kind === 'loading' && <p role="status">Kontrollerer innloggingen …</p>}
        {view.kind === 'sign-in' && <SignIn />}
        {view.kind === 'unavailable' && (
          <div className="test-drive-section">
            <p role="alert" className="error-panel">Kunne ikke koble til pilotserveren.</p>
            <div className="actions"><button type="button" className="button secondary" onClick={reload}>Prøv igjen</button></div>
          </div>
        )}
        {view.kind === 'workspace' && (runId ? <RunDetail key={view.workspace.person.id} id={runId} onSessionEnd={reload} /> :
          <Workspace key={view.workspace.person.id} workspace={view.workspace} onSessionEnd={reload} onRunChange={updateRun} />)}
        <nav className="test-drive-footer" aria-label="Digital kjørevurdering">
          <a href="/">Til digital kjørevurdering</a>
        </nav>
      </main>
    </>
  )
}
