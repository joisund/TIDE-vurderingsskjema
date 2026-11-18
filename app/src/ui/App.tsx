import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { DayField } from '../domain/day-draft.ts'
import { availableExtraDays } from '../domain/follow-up.ts'
import { AppError, validateCreateRun } from '../domain/run.ts'
import type { CreateRunCommand, CreateRunFields, FieldErrors, Role, RunReceipt } from '../domain/run.ts'
import { CreateRunForm } from './CreateRunForm.tsx'
import { CreateDayForm } from './CreateDayForm.tsx'
import { ExtendRunForm } from './ExtendRunForm.tsx'
import { CalendarDate } from './CalendarDate.tsx'
import { AssessmentForm } from './AssessmentForm.tsx'
import { DayDraftForm } from './DayDraftForm.tsx'
import { DayHistory, DayTimeline } from './DayHistory.tsx'
import { MentorAssessmentForm } from './MentorAssessmentForm.tsx'
import type { MentorAssessmentHandle } from './MentorAssessmentForm.tsx'
import { copyForStartup, explain } from './app-errors.ts'

type DayScreen = 'day' | 'baseline' | 'after' | 'mentor' | 'history' | 'create-day' | 'extend'
type Screen = 'loading' | 'unavailable' | 'runs' | 'create' | DayScreen
type RoleRestore = 'checking' | 'read-error' | 'local-draft'
type Props = {
  application: RunApplication
  logo: string
  prepare: () => Promise<WorkspaceView>
  requestPersistence: () => Promise<boolean>
  report: (error: unknown) => void
}

const roleName = { fadder: 'Fadder', sjåfør: 'Sjåfør' } as const
const emptyFields: CreateRunFields = {
  driverName: '', employeeNumber: '', mentorName: '', firstDate: '', initialLastDay: '3',
}
const headings: Record<Screen, string> = {
  loading: 'Løpsoversikt',
  unavailable: 'Løpsoversikten er utilgjengelig',
  runs: 'Løpsoversikt',
  create: 'Opprett løp',
  day: 'Dagsoversikt',
  baseline: 'Førvurdering',
  after: 'Dagens ettervurdering',
  mentor: 'Dagens faddervurdering',
  history: 'Historikk',
  'create-day': 'Opprett neste dag',
  extend: 'Utvid planen',
}

export function App({ application, logo, prepare, requestPersistence, report }: Props) {
  const [screen, setScreen] = useState<Screen>('loading')
  const [view, setView] = useState<WorkspaceView>()
  const [startupIssue, setStartupIssue] = useState('')
  const [persistent, setPersistent] = useState<boolean>()
  const [fields, setFields] = useState(emptyFields)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState<AppError>()
  const [receipt, setReceipt] = useState<RunReceipt>()
  const [busy, setBusy] = useState(false)
  const [storageStatus, setStorageStatus] = useState('')
  const [navigationError, setNavigationError] = useState('')
  const [roleRestore, setRoleRestore] = useState<RoleRestore>()
  const [dayEditorGeneration, setDayEditorGeneration] = useState(0)
  const [online, setOnline] = useState(() => navigator.onLine)
  const editor = useRef<MentorAssessmentHandle>(null)
  const [fieldToFix, setFieldToFix] = useState<DayField>()
  const focusDayField = useRef<DayField>(undefined)
  const roleSelect = useRef<HTMLSelectElement>(null)
  const cachedDialog = useRef<{ element: HTMLDialogElement; focus: Element | null }>(undefined)
  const inFlight = useRef(false)
  const attempt = useRef<{ fields: CreateRunFields; command: CreateRunCommand }>(undefined)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusHeading = useRef(false)
  const persistenceRequested = useRef(false)
  const initialization = useRef<Promise<WorkspaceView>>(undefined)
  const selected = screen === 'loading' || screen === 'unavailable' || screen === 'runs' || screen === 'create' ? undefined : view?.selected
  const dayCommandForm = screen === 'create-day' || screen === 'extend'
  const draftRole = dayCommandForm ? 'fadder' : (view?.actor.role ?? 'fadder')
  const guardedScreen = dayCommandForm || screen === 'mentor' || screen === 'history' || screen === 'day'

  const accept = useCallback((data: WorkspaceView) => {
    setView(data)
    if (!persistenceRequested.current) {
      persistenceRequested.current = true
      void requestPersistence().then(setPersistent)
    }
  }, [requestPersistence])

  const fail = useCallback((error: unknown, startup = false) => {
    report(error)
    setStartupIssue(startup ? copyForStartup(error) : explain(error))
    setView(undefined)
    setStorageStatus('')
    setScreen('unavailable')
  }, [report])

  useEffect(() => {
    let active = true
    initialization.current ??= prepare()
    void initialization.current.then(data => {
      if (!active) return
      accept(data)
      setScreen(data.selected ? 'day' : 'runs')
    }, error => {
      if (active) fail(error, true)
    })
    return () => { active = false }
    // Oppstarten utføres én gang per visning. Nytt forsøk går gjennom retryOpen.
  }, [accept, fail, prepare])

  useLayoutEffect(() => {
    if (screen === 'day' && focusDayField.current) {
      const target = document.getElementById(`day-field-${focusDayField.current}`)
      focusDayField.current = undefined
      if (target) {
        focusHeading.current = false
        target.focus()
      }
    }
    if (focusHeading.current) {
      focusHeading.current = false
      heading.current?.focus()
    }
  }, [screen, selected?.dayId])

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    return () => {
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
    }
  }, [])

  function navigate(next: Screen) {
    focusHeading.current = true
    if (next !== 'day') setFieldToFix(undefined)
    clearRoleRestore()
    setScreen(next)
  }

  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setNavigationError('')
    try {
      await action()
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function retryOpen() {
    void perform(async () => {
      setScreen('loading')
      try {
        const data = await prepare()
        accept(data)
        navigate(data.selected ? 'day' : 'runs')
      } catch (error) {
        focusHeading.current = true
        fail(error, true)
      }
    })
  }

  function newRun() {
    if (inFlight.current || view?.actor.role !== 'fadder') return
    setFields(emptyFields)
    setErrors({})
    setProblem(undefined)
    setReceipt(undefined)
    setStorageStatus('')
    attempt.current = undefined
    navigate('create')
  }

  function updateField(name: keyof CreateRunFields, value: string) {
    if (inFlight.current || receipt) return
    setFields(current => ({ ...current, [name]: value }))
    setErrors(current => {
      const remaining = { ...current }
      delete remaining[name]
      return remaining
    })
    setStorageStatus('')
    if (problem?.code === 'storage_write') setProblem(undefined)
  }

  function showRuns() {
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      try {
        setView(await application.withOpenStorage(() => application.read()))
        setStorageStatus('')
        navigate('runs')
      } catch (error) {
        if (selected) {
          report(error)
          setNavigationError('Løpsoversikten kunne ikke åpnes. ' + explain(error))
        } else {
          focusHeading.current = true
          fail(error)
        }
      }
    })
  }

  function openRun(id: string, dayId?: string, next: 'day' | 'history' = 'day') {
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      try {
        const latest = await application.withOpenStorage(() => application.select(id, dayId))
        if (latest.actor.id !== view?.actor.id || latest.actor.role !== view?.actor.role) replaceRoleView(latest)
        else setView(latest)
        setStorageStatus('')
        navigate(next)
      } catch (error) {
        focusHeading.current = true
        fail(error)
      }
    })
  }

  function showAssessmentScreen(next: DayScreen, field?: DayField) {
    if (!selected) return
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      try {
        const dayId = field && screen === 'baseline' ? selected.baseline.firstDayId : selected.dayId
        const latest = await application.withOpenStorage(() => field
          ? application.select(selected.id, dayId)
          : application.read({ runId: selected.id, dayId }))
        if (latest.actor.id !== view?.actor.id || latest.actor.role !== view?.actor.role) replaceRoleView(latest)
        else {
          setView(latest)
          if (screen === 'day' && latest.selected?.revision !== selected.revision) {
            setDayEditorGeneration(generation => generation + 1)
          }
        }
        if (next === 'after' && !latest.selected?.driverAfter) {
          setNavigationError(explain(new AppError('baseline_required')))
          return
        }
        if (next === 'mentor' && !latest.selected?.mentorDay) {
          setNavigationError(explain(new AppError('wrong_role')))
          return
        }
        if (next === 'create-day' && !latest.selected?.canCreateDay) {
          setNavigationError(latest.actor.role === 'fadder'
            ? explain(new AppError('plan_required')) : explain(new AppError('wrong_role')))
          return
        }
        if (next === 'extend' && (!latest.selected?.extensionWindow || !availableExtraDays(latest.selected.extensionWindow).length)) {
          setNavigationError('Planen kan ikke utvides fra denne dagen.')
          return
        }
        setStorageStatus('')
        focusDayField.current = field
        setFieldToFix(field)
        navigate(next)
      } catch (error) {
        report(error)
        setNavigationError(explain(error))
      }
    })
  }

  function changeRole(role: Role) {
    if (view?.actor.role === role) return
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      try {
        const next = await application.withOpenStorage(() =>
          application.changeRole(role, selected && { runId: selected.id, dayId: selected.dayId }),
        )
        replaceRoleView(next)
      } catch (error) {
        report(error)
        setNavigationError('Rollebyttet kunne ikke fullføres. ' + explain(error))
      }
    })
  }

  function replaceRoleView(next: WorkspaceView) {
    const returnFocus = roleSelect.current === document.activeElement
    flushSync(() => {
      setView(undefined)
      setFields(emptyFields)
      setErrors({})
      setProblem(undefined)
      setReceipt(undefined)
      setStorageStatus('')
      attempt.current = undefined
      clearRoleRestore()
      if (screen === 'mentor' && !next.selected?.mentorDay) setScreen('day')
    })
    flushSync(() => { setView(next) })
    const fieldTarget = screen === 'day' && fieldToFix && next.actor.role === 'fadder'
      ? document.getElementById(`day-field-${fieldToFix}`)
      : null
    if (fieldTarget) fieldTarget.focus()
    else if (returnFocus) roleSelect.current?.focus()
  }

  function clearRoleRestore() {
    setRoleRestore(undefined)
    cachedDialog.current = undefined
  }

  async function checkRestoredRole(resume = false) {
    if (!guardedScreen || !selected || !view) return
    setRoleRestore('checking')
    const selection = { runId: selected.id, dayId: selected.dayId }
    try {
      const beforeFlush = await application.withOpenStorage(() => resume
        ? application.changeRole(draftRole, selection)
        : application.read(selection))
      const sameActor = (state: WorkspaceView) => state.actor.id === view.actor.id && state.actor.role === view.actor.role
      const shouldFlush = !resume && editor.current && (screen === 'day' || !sameActor(beforeFlush))
      const flushed = !shouldFlush || await editor.current!.flush()
      // Rolle og revisjon kan ha endret seg mens editoren ventet på lagring eller feilhåndtering.
      const next = shouldFlush ? await application.read(selection) : beforeFlush
      const latest = next.selected
      if (!resume && !sameActor(next)) {
        if (dayCommandForm || !flushed) {
          setRoleRestore('local-draft')
          return
        }
        replaceRoleView(next)
        heading.current?.focus()
        return
      }
      if (screen === 'mentor' && latest?.dayLocked && !selected.dayLocked) {
        flushSync(() => {
          editor.current?.restoreLock?.({ ...next, selected: latest })
          clearRoleRestore()
        })
        return
      }
      flushSync(() => {
        if (screen === 'history' || screen === 'day' || dayCommandForm) setView(next)
        if (screen === 'day' && !resume && flushed && latest?.revision !== selected.revision) {
          setDayEditorGeneration(generation => generation + 1)
        }
        setRoleRestore(undefined)
      })
      if (screen === 'history') heading.current?.focus()
      const dialog = cachedDialog.current
      cachedDialog.current = undefined
      if (dialog?.element.isConnected && !dialog.element.open) {
        dialog.element.showModal()
        if (dialog.focus instanceof HTMLElement && dialog.element.contains(dialog.focus)) dialog.focus.focus()
      }
    } catch (error) {
      report(error)
      setRoleRestore(resume ? 'local-draft' : 'read-error')
    }
  }

  const hideCachedRoleView = useEffectEvent(() => {
    // Skjul fadderinnhold før nettleseren kan fryse den gamle lesemodellen.
    if (!guardedScreen) return
    const dialog = document.querySelector<HTMLDialogElement>('dialog:modal')
    if (dialog) {
      cachedDialog.current = { element: dialog, focus: document.activeElement }
      dialog.close()
    }
    flushSync(() => setRoleRestore('checking'))
  })
  const showCachedRoleView = useEffectEvent(() => { void checkRestoredRole() })

  useEffect(() => {
    const onHide = (event: PageTransitionEvent) => { if (event.persisted) hideCachedRoleView() }
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) showCachedRoleView() }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
    }
  }, [])

  function acceptDaySave(saved: DayView) {
    setView(current => {
      if (!current?.selected || current.selected.id !== saved.id || current.selected.dayId !== saved.dayId) return current
      return {
        ...current,
        selected: {
          ...saved,
          plannedLastDate: saved.day === saved.plannedLastDay ? saved.fields.date : saved.plannedLastDate,
          days: saved.days.map(day => day.id === saved.dayId ? { ...day, date: saved.fields.date } : day),
        },
      }
    })
  }

  function adoptStoredDay(stored: WorkspaceView) {
    if (view?.actor.id !== stored.actor.id || view?.actor.role !== stored.actor.role) {
      replaceRoleView(stored)
      heading.current?.focus()
    }
    else setView(stored)
  }

  function refreshDraft() {
    void perform(async () => {
      try {
        const current = view?.actor.role === 'sjåfør'
          ? await application.withOpenStorage(() => application.changeRole('fadder'))
          : await application.open()
        setView(current)
        setProblem(current.actor.role === 'fadder' ? undefined : new AppError('wrong_role'))
      } catch (error) {
        report(error)
        setProblem(error instanceof AppError ? error : new AppError('storage_open'))
      }
    })
  }

  async function loadCommitted(saved: RunReceipt) {
    try {
      setView(await application.withOpenStorage(() => application.select(saved.runId, saved.dayId)))
      setStorageStatus('')
      navigate('day')
    } catch (error) {
      report(error)
      setProblem(error instanceof AppError ? error : new AppError('storage_read'))
    }
  }

  function retryCommitted() {
    if (receipt) void perform(() => loadCommitted(receipt))
  }

  function submit() {
    if (inFlight.current || receipt || view?.actor.role !== 'fadder') return
    const issues = validateCreateRun(fields)
    setErrors(issues)
    if (Object.keys(issues).length > 0) return

    const actor = view.actor
    let current = attempt.current
    if (current?.fields !== fields || current.command.actor.id !== actor.id) {
      current = { fields, command: application.newCreateCommand(actor, fields) }
      attempt.current = current
    }
    const { command } = current
    void perform(async () => {
      setProblem(undefined)
      setStorageStatus('Lagrer …')
      try {
        const saved = await application.withOpenStorage(() => application.executeCreate(command))
        setReceipt(saved)
        setStorageStatus('Lagret på denne enheten')
        await loadCommitted(saved)
      } catch (error) {
        report(error)
        setStorageStatus('')
        if (error instanceof AppError && error.code === 'validation') setErrors(error.fields)
        else setProblem(error instanceof AppError ? error : new AppError('storage_open'))
      }
    })
  }

  const problemText = problem && (problem.code === 'storage_write'
    ? 'Lagringen kunne ikke fullføres. ' + explain(problem)
    : explain(problem))
  const canRetry = view?.actor.role === 'fadder'
    && (!problem || ['storage_read', 'storage_write', 'storage_open'].includes(problem.code))

  return (
    <>
      <header className="profile">
        <div className="profile-inner">
          <img className="logo" src={logo} alt="Tide" />
          <div className="profile-context">
            <p className="app-name">Digital kjørevurdering</p>
            {view && !roleRestore && (
              <div className="role">
                {screen === 'create' || screen === 'create-day' || screen === 'extend'
                  ? <p>Simuleringsrolle · {roleName[view.actor.role]}</p>
                  : <>
                      <label htmlFor="simulation-role">Simuleringsrolle</label>
                      <select
                        id="simulation-role"
                        ref={roleSelect}
                        value={view.actor.role}
                        aria-disabled={busy}
                        onChange={event => changeRole(event.currentTarget.value === 'sjåfør' ? 'sjåfør' : 'fadder')}
                      >
                        <option value="fadder">Fadder</option>
                        <option value="sjåfør">Sjåfør</option>
                      </select>
                    </>}
              </div>
            )}
            {selected && !roleRestore && screen !== 'create-day' && <p className="day-context">
              {(screen === 'baseline' ? selected.baseline.fields.driverName : selected.fields.driverName) || 'Sjåførnavn mangler'}
              {' · Dag '}{screen === 'baseline' ? 1 : selected.day}
            </p>}
            {view && <p className="network-status" aria-live="polite">{online ? 'Nett tilkoblet' : 'Uten nett'}</p>}
          </div>
        </div>
      </header>
      <main className="content">
        <h1 ref={heading} tabIndex={-1}>{headings[screen]}</h1>
        {screen === 'create' && <p className="save-status" role="status" aria-atomic="true">{storageStatus}</p>}
        {navigationError && <p className="error-panel" role="alert">{navigationError}</p>}
        {screen === 'loading' && <p role="status">Åpner lokalt lager og laster løp …</p>}
        {screen === 'unavailable' && (
          <section aria-label="Lagringsfeil">
            <p className="error-panel" role="alert">{startupIssue}</p>
            <button type="button" className="button primary" aria-disabled={busy} onClick={retryOpen}>Prøv igjen</button>
          </section>
        )}
        {screen === 'runs' && view && (
          <>
            {view.actor.role === 'fadder'
              ? <button type="button" className="button primary" aria-disabled={busy} onClick={newRun}>Opprett løp</button>
              : <p>Velg fadderrollen for å opprette et løp.</p>}
            {view.runs.length === 0
              ? <p className="empty">Det er ingen lagrede løp på denne enheten. Opprett et løp for å registrere den første dagen.</p>
              : <ul className="run-list">
                  {view.runs.map(run => (
                    <li key={run.id}>
                      <button type="button" className="run-button" aria-disabled={busy} onClick={() => openRun(run.id)}>
                        <span className="run-name">{run.driverName}</span>
                        <span>Ansattnummer {run.employeeNumber} · <CalendarDate value={run.firstDate} /></span>
                        <span className="run-status">{run.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>}
          </>
        )}
        {screen === 'create' && receipt && problem && (
          <section aria-label="Lagret løp">
            <p className="error-panel" role="alert">Løpet er lagret, men kunne ikke åpnes. {explain(problem)}</p>
            <button className="button primary" type="button" aria-disabled={busy} onClick={retryCommitted}>Åpne lagret løp</button>
          </section>
        )}
        {screen === 'create' && !receipt && (
          <>
            <p className="context">Bruk fiktive navn og ansattnummer i demonstrasjonen. Alle felt er obligatoriske.</p>
            <CreateRunForm fields={fields} errors={errors} pending={busy} problem={problemText} canRetry={canRetry}
              recoveryLabel={view?.actor.role === 'sjåfør' ? 'Bytt til Fadder' : 'Last inn gjeldende tilstand'}
              onChange={updateField} onSubmit={submit} onCancel={showRuns} onRefresh={refreshDraft} />
          </>
        )}
        {screen === 'create-day' && selected && view && (
          <div hidden={Boolean(roleRestore)}>
            <CreateDayForm key={selected.id} day={selected} actor={view.actor} application={application} report={report}
            onWorkspace={setView} onCancel={() => showAssessmentScreen('day')} onComplete={(next, created) => {
              setView(next)
              setStorageStatus(created ? '' : 'Datoen er allerede registrert. Den eksisterende dagen er åpnet.')
              navigate('day')
            }} />
          </div>
        )}
        {screen === 'extend' && selected && view && (
          <div hidden={Boolean(roleRestore)}>
            <ExtendRunForm key={selected.id} day={selected} actor={view.actor} application={application} report={report}
            onWorkspace={setView} onCancel={() => showAssessmentScreen('day')} onComplete={next => {
              setView(next)
              navigate('day')
            }} />
          </div>
        )}
        {screen === 'day' && selected && view && (
          <div hidden={Boolean(roleRestore)}>
            {storageStatus && <p role="status" className="save-status">{storageStatus}</p>}
            <DayTimeline day={selected} busy={busy} onSelect={id => openRun(selected.id, id)} />
            {view.actor.role === 'fadder' && !selected.dayLocked && selected.status !== 'Avsluttet'
              && selected.days.length === selected.plannedLastDay && selected.days.length < 5 && (
              <p className="context">Planen må utvides før neste dag kan opprettes. Bruk oppfølgingen i faddervurderingen.</p>
            )}
            {selected.canCreateDay && <button type="button" className="button primary" aria-disabled={busy}
              onClick={() => showAssessmentScreen('create-day')}>Opprett neste dag</button>}
            {selected.extensionWindow && availableExtraDays(selected.extensionWindow).length > 0 && (
              <button type="button" className="button primary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('extend')}>Utvid planen</button>
            )}
            {selected.days.length === 5 && <p className="context">Maksimalt fem dager er registrert.</p>}
            <p className="run-status">{selected.status}</p>
            <dl className="details">
              <div>
                <dt>Planlagt siste dag</dt>
                <dd>Dag {selected.plannedLastDay}</dd>
                <dd>{selected.plannedLastDate ? <CalendarDate value={selected.plannedLastDate} /> : 'Dato ikke registrert'}</dd>
              </div>
              <div>
                <dt>Dag {selected.day}</dt>
                <dd>{selected.dayLocked ? 'Dagen er låst' : 'Dagen er åpen'}</dd>
              </div>
            </dl>
            <section className="baseline-entry" aria-labelledby="baseline-entry-heading">
              <h2 id="baseline-entry-heading">Førvurdering for løpet</h2>
              <p>{selected.baseline.confirmation ? 'Førvurderingen er låst' : 'Førvurderingen er ikke bekreftet'}</p>
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('baseline')}>Åpne førvurderingen</button>
            </section>
            <section className="baseline-entry" aria-labelledby="driver-after-entry-heading">
              <h2 id="driver-after-entry-heading">Dagens ettervurdering</h2>
              {selected.driverAfter ? (
                <>
                  <p>{selected.driverAfter.confirmation ? 'Sjåførens ettervurdering er låst' : 'Sjåførens ettervurdering er ikke bekreftet'}</p>
                  <button type="button" className="button secondary" aria-disabled={busy}
                    onClick={() => showAssessmentScreen('after')}>Åpne dagens ettervurdering</button>
                </>
              ) : <p>Ettervurderingen åpner når førvurderingen er bekreftet.</p>}
            </section>
            {selected.mentorDay && (
              <section className="baseline-entry" aria-labelledby="mentor-entry-heading">
                <h2 id="mentor-entry-heading">Dagens faddervurdering</h2>
                <p>{selected.dayLocked ? 'Faddervurderingen er låst' : 'Faddervurderingen er ikke bekreftet'}</p>
                <button type="button" className="button secondary" aria-disabled={busy}
                  onClick={() => showAssessmentScreen('mentor')}>Åpne dagens faddervurdering</button>
              </section>
            )}
            <DayDraftForm key={`${view.actor.id}/${selected.id}/${selected.dayId}/${dayEditorGeneration}`} ref={editor}
              initial={selected} actor={view.actor} application={application} report={report}
              onSaved={acceptDaySave} onAdopt={adoptStoredDay} navigating={busy} fieldToFix={fieldToFix} />
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('history')}>Åpne historikk</button>
              <button type="button" className="button secondary" aria-disabled={busy} onClick={showRuns}>Til løpsoversikten</button>
            </div>
          </div>
        )}
        {screen === 'history' && selected && view && !roleRestore && (
          <>
            <p>Planlagt siste dag · Dag {selected.plannedLastDay}</p>
            <DayTimeline day={selected} busy={busy} onSelect={id => openRun(selected.id, id, 'history')} />
            <DayHistory key={`${view.actor.id}/${selected.dayId}`} day={selected} />
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('day')}>Til dagsoversikten</button>
            </div>
          </>
        )}
        {(screen === 'baseline' || (screen === 'after' && selected?.driverAfter)) && selected && view && (
          <>
            <AssessmentForm key={`${screen}/${view.actor.id}/${selected.id}/${selected.dayId}`} ref={editor}
              phase={screen === 'baseline' ? 'before' : 'driver_after'}
              initial={selected} actor={view.actor} application={application} report={report}
              onSaved={acceptDaySave} onAdopt={adoptStoredDay} navigating={busy}
              onConfirmIssue={setNavigationError} onDayField={field => showAssessmentScreen('day', field)} />
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('day')}>Til dagsoversikten</button>
            </div>
          </>
        )}
        {screen === 'mentor' && selected?.mentorDay && view && (
            <div hidden={Boolean(roleRestore)}>
              <MentorAssessmentForm key={`mentor/${view.actor.id}/${selected.id}/${selected.dayId}`} ref={editor}
                initial={{ ...selected, mentorDay: selected.mentorDay }} actor={view.actor} application={application}
                report={report} onSaved={acceptDaySave} onAdopt={adoptStoredDay} navigating={busy}
                onDayField={field => showAssessmentScreen('day', field)} onDriverPart={part => showAssessmentScreen(part)} />
              <div className="actions">
                <button type="button" className="button secondary" aria-disabled={busy}
                  onClick={() => showAssessmentScreen('day')}>Til dagsoversikten</button>
              </div>
            </div>
        )}
        {roleRestore === 'checking' && <p role="status">Kontrollerer aktiv rolle …</p>}
        {roleRestore === 'read-error' && (
          <div className="error-panel">
            <p role="alert">Aktiv rolle kunne ikke kontrolleres.</p>
            <button type="button" className="button secondary" onClick={() => void checkRestoredRole()}>Prøv igjen</button>
          </div>
        )}
        {roleRestore === 'local-draft' && (
          <div className="error-panel">
            <p role="alert">{roleName[draftRole]}utkastet er fortsatt åpent. Gjenoppta som {draftRole} for å kontrollere og lagre det.</p>
            <button type="button" className="button secondary" onClick={() => void checkRestoredRole(true)}>Gjenoppta som {draftRole}</button>
          </div>
        )}
        {view && persistent === false && (
          <p className="storage-notice">Nettleseren har ikke gitt varig lagring. Opplysningene kan forsvinne hvis nettleseren rydder eller du sletter nettstedsdata.</p>
        )}
      </main>
    </>
  )
}
