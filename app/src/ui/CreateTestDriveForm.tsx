import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { CreateTestDrive, TestDriveAdministration, TestDriveWorkspace } from '../content/test-drive-api.ts'
import { testDriveOptionalFields } from '../content/test-drive.v1.ts'
import type { TestDriveHeader } from '../content/test-drive.v1.ts'
import { PilotRequestError, pilotMessage, pilotRequest } from './test-drive-client.ts'

type Props = {
  personId: string
  departments: TestDriveWorkspace['departments']
  onCreated: (run: TestDriveAdministration) => void
  onSessionEnd: () => void
}

function loadPending(key: string): CreateTestDrive | undefined {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? undefined } catch { return undefined }
}

function savePending(key: string, value?: CreateTestDrive) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value))
    else sessionStorage.removeItem(key)
  } catch {
    // Innsendingen kan fortsatt gjentas fra samme side.
  }
}

function localExpiry(value: string) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return
  const offset = -date.getTimezoneOffset()
  const local = new Date(date.getTime() + offset * 60_000).toISOString().slice(0, 16)
  if (local !== value) return
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0')
  return { date, offset: `UTC${offset < 0 ? '−' : '+'}${hours}:${minutes}` }
}

export function CreateTestDriveForm({ personId, departments, onCreated, onSessionEnd }: Props) {
  const recoveryKey = `tide:testkjoring:oppretting:${personId}`
  const [pending, setPending] = useState(() => loadPending(recoveryKey))
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [formVersion, setFormVersion] = useState(0)
  const [expiryValue, setExpiryValue] = useState('')
  const expiry = localExpiry(expiryValue)
  const department = departments.find(item => item.id === departmentId)

  async function create(input: CreateTestDrive) {
    if (busy) return
    setBusy(true)
    setProblem('')
    savePending(recoveryKey, input)
    try {
      const run = await pilotRequest<TestDriveAdministration>('/runs', input)
      savePending(recoveryKey)
      setPending(undefined)
      setExpiryValue('')
      setFormVersion(version => version + 1)
      onCreated(run)
    } catch (error) {
      if (error instanceof PilotRequestError && error.status === 401) return onSessionEnd()
      setProblem(pilotMessage(error))
      if (error instanceof PilotRequestError && error.status < 500) {
        savePending(recoveryKey)
        setPending(undefined)
      } else setPending(input)
    } finally {
      setBusy(false)
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (name: string) => String(data.get(name) ?? '').trim()
    const expiry = localExpiry(read('expiresAt'))
    if (!expiry) {
      setProblem('Dette tidspunktet finnes ikke i lokal tid. Velg en annen dato eller et annet klokkeslett.')
      return
    }
    const header: TestDriveHeader = {}
    for (const { id } of testDriveOptionalFields) {
      const value = read(id)
      if (value) header[id] = value
    }
    void create({
      requestId: crypto.randomUUID(), departmentId,
      candidateName: read('candidateName'), candidateEmail: read('candidateEmail'),
      instructorId: read('instructorId'), expiresAt: expiry.date.toISOString(), header,
    })
  }

  return (
    <section className="test-drive-section" aria-labelledby="test-drive-create">
      <h2 id="test-drive-create">Opprett testkjøring</h2>
      {problem && <p role="alert" className="error-panel">{problem}</p>}
      {pending ? (
        <div className="form-fields">
          <p>{busy ? 'Oppretter testkjøring …' : 'Opprettingen mangler kvittering. Prøv samme innsending igjen.'}</p>
          <p>{pending.candidateName} · {pending.candidateEmail}</p>
          <div className="actions">
            <button className="button primary" type="button" disabled={busy} onClick={() => void create(pending)}>Prøv opprettingen igjen</button>
            <a href="#test-drive-managed" className="button secondary">Til tilgangsstyring</a>
          </div>
        </div>
      ) : (
        <form className="create-form" key={formVersion} onSubmit={submit}>
          <div className="field">
            <label htmlFor="test-drive-department">Avdeling</label>
            <select id="test-drive-department" value={departmentId} onChange={event => setDepartmentId(event.currentTarget.value)} required>
              {departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="test-drive-candidate-name">Kandidatens navn</label>
            <input id="test-drive-candidate-name" name="candidateName" autoComplete="off" maxLength={120} required />
          </div>
          <div className="field">
            <label htmlFor="test-drive-candidate-email">Kandidatens e-post</label>
            <input id="test-drive-candidate-email" name="candidateEmail" type="email" autoComplete="off" maxLength={254} required
              aria-describedby="test-drive-candidate-hint" />
            <p id="test-drive-candidate-hint" className="hint">Bruk en fiktiv adresse som slutter på @pilot.test.</p>
          </div>
          <div className="field">
            <label htmlFor="test-drive-instructor">Instruktør</label>
            <select id="test-drive-instructor" key={departmentId} name="instructorId" defaultValue="" required>
              <option value="">Velg instruktør</option>
              {department?.instructors.map(instructor => (
                <option key={instructor.id} value={instructor.id}>{instructor.name} · {instructor.email}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="test-drive-expiry">Kandidatens tilgang utløper</label>
            <input id="test-drive-expiry" name="expiresAt" type="datetime-local" value={expiryValue}
              onChange={event => setExpiryValue(event.currentTarget.value)} aria-describedby="test-drive-expiry-hint" required />
            <p id="test-drive-expiry-hint" className="hint" aria-live="polite">
              {expiry ? `Lokal tid · ${expiry.offset}` : 'Dato og klokkeslett i lokal tid.'}
            </p>
          </div>
          <details className="field-check">
            <summary>Flere opplysninger om testkjøringen</summary>
            <div className="form-fields">
              {testDriveOptionalFields.map(({ id, label }) => (
                <div className="field" key={id}>
                  <label htmlFor={`test-drive-${id}`}>{label}</label>
                  <input id={`test-drive-${id}`} name={id} type={id === 'driveDate' ? 'date' : id === 'candidatePhone' ? 'tel' : 'text'} maxLength={120} />
                </div>
              ))}
            </div>
          </details>
          <div className="actions">
            <button className="button primary" type="submit" disabled={busy || !department?.instructors.length}>Opprett og inviter</button>
          </div>
        </form>
      )}
    </section>
  )
}
