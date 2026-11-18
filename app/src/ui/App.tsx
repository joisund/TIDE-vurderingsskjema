import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { DayView, RunApplication, WorkspaceView } from '../application/run-application.ts'
import type { DownloadRunPdf, DownloadTechnicalPdf } from '../application/run-pdf.ts'
import type { DayField } from '../domain/day-draft.ts'
import type { ClosureIssue } from '../domain/closure.ts'
import { availableExtraDays } from '../domain/follow-up.ts'
import { AppError, isRole, professionalTerms, validateCreateRun, validateDriverFields } from '../domain/run.ts'
import type {
  CreateDriverCommand, CreateRunCommand, CreateRunFields, DriverFields, DriverReference, FieldErrors, Role, RunReceipt,
} from '../domain/run.ts'
import { CreateRunForm } from './CreateRunForm.tsx'
import { CreateDayForm } from './CreateDayForm.tsx'
import { ExtendRunForm } from './ExtendRunForm.tsx'
import { CalendarDate } from './CalendarDate.tsx'
import { AssessmentForm } from './AssessmentForm.tsx'
import { DayDraftForm } from './DayDraftForm.tsx'
import { ClosedHistory, DayHistory, DayTimeline } from './DayHistory.tsx'
import { MentorAssessmentForm } from './MentorAssessmentForm.tsx'
import type { MentorAssessmentHandle } from './MentorAssessmentForm.tsx'
import { copyForStartup, explain } from './app-errors.ts'
import { ClosureForm } from './ClosureForm.tsx'
import { CreateDriverForm, InstructorOverview } from './InstructorOverview.tsx'
import { CreateTechnicalForm, TechnicalTrainingForm } from './TechnicalTraining.tsx'
import type { TechnicalEditorHandle } from './TechnicalTraining.tsx'
import type { TechnicalSelection } from '../domain/technical-training.ts'

type DayScreen = 'day' | 'baseline' | 'after' | 'mentor' | 'history' | 'create-day' | 'extend' | 'closure'
type Screen = 'loading' | 'unavailable' | 'runs' | 'drivers' | 'create-driver' | 'create' | 'context-required'
  | 'create-technical' | 'technical' | DayScreen
type RoleRestore = 'checking' | 'read-error' | 'local-draft'
type Props = {
  application: RunApplication
  downloadRunPdf: DownloadRunPdf
  downloadTechnicalPdf: DownloadTechnicalPdf
  logo: string
  prepare: () => Promise<WorkspaceView>
  requestPersistence: () => Promise<boolean>
  report: (error: unknown) => void
}

const roleName: Record<Role, string> = { fadder: 'Fadder', sjåfør: 'Sjåfør', instruktør: 'Instruktør' }
const emptyFields: CreateRunFields = {
  driverName: '', employeeNumber: '', mentorName: '', firstDate: '', initialLastDay: '3',
}
const headings: Record<Screen, string> = {
  loading: 'Løpsoversikt',
  unavailable: 'Løpsoversikten er utilgjengelig',
  runs: 'Løpsoversikt',
  drivers: 'Instruktøroversikt',
  'create-driver': 'Opprett sjåfør',
  'create-technical': 'Ny teknisk opplæring',
  technical: 'Teknisk opplæring',
  'context-required': 'Velg rolle for vurderingen',
  create: 'Opprett løp',
  day: 'Dagsoversikt',
  baseline: 'Førvurdering',
  after: 'Dagens ettervurdering',
  mentor: 'Dagens faddervurdering',
  history: 'Historikk',
  'create-day': 'Opprett neste dag',
  extend: 'Utvid planen',
  closure: 'Avslutt perioden',
}

function overviewScreen(view: WorkspaceView) {
  return view.actor.role === 'instruktør' ? 'drivers' : 'runs'
}

function initialScreen(view: WorkspaceView) {
  if (view.blocked) return 'context-required'
  if (view.technical || view.technicalProblem) return 'technical'
  return view.selected ? 'day' : overviewScreen(view)
}

export function App({ application, downloadRunPdf, downloadTechnicalPdf, logo, prepare, requestPersistence, report }: Props) {
  const [screen, setScreen] = useState<Screen>('loading')
  const [view, setView] = useState<WorkspaceView>()
  const [startupIssue, setStartupIssue] = useState('')
  const [persistent, setPersistent] = useState<boolean>()
  const [fields, setFields] = useState(emptyFields)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState<AppError>()
  const [receipt, setReceipt] = useState<RunReceipt>()
  const [runDriver, setRunDriver] = useState<DriverReference>()
  const [driverFields, setDriverFields] = useState<DriverFields>({ driverName: '', employeeNumber: '' })
  const [driverErrors, setDriverErrors] = useState<FieldErrors<DriverFields>>({})
  const [savedDriverId, setSavedDriverId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [storageStatus, setStorageStatus] = useState('')
  const [navigationError, setNavigationError] = useState('')
  const [roleRestore, setRoleRestore] = useState<RoleRestore>()
  const [selectingDriver, setSelectingDriver] = useState(false)
  const [dayEditorGeneration, setDayEditorGeneration] = useState(0)
  const [closureEditorGeneration, setClosureEditorGeneration] = useState(0)
  const [technicalEditorGeneration, setTechnicalEditorGeneration] = useState(0)
  const [online, setOnline] = useState(() => navigator.onLine)
  const editor = useRef<MentorAssessmentHandle>(null)
  const technicalEditor = useRef<TechnicalEditorHandle>(null)
  const [fieldToFix, setFieldToFix] = useState<DayField>()
  const focusDayField = useRef<DayField>(undefined)
  const roleSelect = useRef<HTMLSelectElement>(null)
  const cachedDialog = useRef<{ element: HTMLDialogElement; focus: Element | null }>(undefined)
  const recoverySelection = useRef<{ runId: string; dayId: string }>(undefined)
  const checkingRole = useRef(false)
  const lostWindowFocus = useRef(false)
  const inFlight = useRef(false)
  const attempt = useRef<{ fields: CreateRunFields; command: CreateRunCommand }>(undefined)
  const driverAttempt = useRef<{ fields: DriverFields; command: CreateDriverCommand }>(undefined)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusHeading = useRef(false)
  const persistenceRequested = useRef(false)
  const initialization = useRef<Promise<WorkspaceView>>(undefined)
  const retryDrivers = useRef(false)
  const overview = screen === 'runs' || screen === 'drivers'
  const showingTechnical = screen === 'technical' || screen === 'create-technical'
  const showingDay = !showingTechnical && !overview
    && !['loading', 'unavailable', 'create', 'create-driver', 'context-required'].includes(screen)
  const selected = showingDay ? view?.selected : undefined
  const technical = screen === 'technical' ? view?.technical : undefined
  const technicalProblem = screen === 'technical' ? view?.technicalProblem : undefined
  const technicalAddress = technical ?? technicalProblem
  const technicalDriver = view?.technicalDrivers.find(driver => driver.id === view.technicalDriverId)
  const blockedRun = screen === 'context-required' ? view?.blocked : undefined
  const professional = professionalTerms(selected?.context ?? blockedRun?.context ?? 'fadder')
  const createContext = runDriver ? 'instruktør' : 'fadder'
  const instructorCreation = screen === 'create-driver' || (screen === 'create' && Boolean(runDriver))
  const dayCommandForm = screen === 'create-day' || screen === 'extend'
  const draftRole = dayCommandForm ? (selected?.context ?? 'fadder') : (view?.actor.role ?? 'fadder')
  const guardedScreen = showingDay || overview || showingTechnical || instructorCreation || screen === 'context-required'
  const instructorProtected = guardedScreen && (showingTechnical || screen === 'drivers' || view?.actor.role === 'instruktør'
    || selected?.context === 'instruktør' || blockedRun?.context === 'instruktør')

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
      setScreen(initialScreen(data))
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
  }, [screen, selected?.dayId, closureEditorGeneration, technicalAddress?.documentId, technicalEditorGeneration])

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
        const opened = await prepare()
        const data = retryDrivers.current && opened.actor.role === 'instruktør'
          ? await application.showDrivers() : opened
        retryDrivers.current = false
        accept(data)
        navigate(initialScreen(data))
      } catch (error) {
        focusHeading.current = true
        fail(error, true)
      }
    })
  }

  function newRun(driver?: DriverReference) {
    if (inFlight.current || view?.actor.role !== (driver ? 'instruktør' : 'fadder')) return
    setRunDriver(driver)
    setFields(driver ? { ...emptyFields, driverName: driver.name, employeeNumber: driver.employeeNumber } : emptyFields)
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
        const latest = await application.withOpenStorage(() => view?.actor.role === 'instruktør'
          ? application.showDrivers() : application.read())
        if (latest.actor.id !== view?.actor.id) replaceRoleView(latest)
        else setView(latest)
        setStorageStatus('')
        navigate(overviewScreen(latest))
      } catch (error) {
        if (view?.actor.role === 'instruktør') {
          retryDrivers.current = true
          focusHeading.current = true
          fail(error)
        } else if (selected) {
          report(error)
          setNavigationError('Løpsoversikten kunne ikke åpnes. ' + explain(error))
        } else {
          focusHeading.current = true
          fail(error)
        }
      }
    })
  }

  function showDocumentOverview() {
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      if (technicalEditor.current && !await technicalEditor.current.flush()) return
      try {
        const latest = await application.withOpenStorage(() => application.showDrivers())
        if (latest.actor.id !== view?.actor.id) replaceRoleView(latest)
        else setView(latest)
        setStorageStatus('')
        navigate(latest.actor.role === 'fadder' ? 'runs' : 'drivers')
      } catch (error) {
        report(error)
        setNavigationError('Dokumentoversikten kunne ikke åpnes. ' + explain(error))
      }
    })
  }

  function newTechnical() {
    if (inFlight.current || !technicalDriver || view?.actor.role === 'fadder') return
    navigate('create-technical')
  }

  async function loadTechnical(selection: TechnicalSelection) {
    const latest = await application.withOpenStorage(() => application.selectTechnical(selection))
    if (latest.actor.id !== view?.actor.id || latest.actor.role !== view?.actor.role) replaceRoleView(latest)
    else setView(latest)
    setStorageStatus('')
    navigate('technical')
  }

  function openTechnical(selection: TechnicalSelection) {
    void perform(async () => {
      if (technicalEditor.current && !await technicalEditor.current.flush()) return
      try {
        await loadTechnical(selection)
      } catch (error) {
        report(error)
        setNavigationError(explain(error))
      }
    })
  }

  function adoptTechnicalState(latest: WorkspaceView) {
    if (latest.actor.id !== view?.actor.id || latest.actor.role !== view?.actor.role) replaceRoleView(latest)
    else setView(latest)
    clearRoleRestore()
    focusHeading.current = true
    setTechnicalEditorGeneration(generation => generation + 1)
    setScreen(initialScreen(latest))
  }

  function openRun(id: string, dayId?: string, next: 'day' | 'history' = 'day') {
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      try {
        const latest = await application.withOpenStorage(() => application.select(id, dayId))
        if (latest.actor.id !== view?.actor.id || latest.actor.role !== view?.actor.role) replaceRoleView(latest)
        else if (selected?.id !== latest.selected?.id || selected?.dayId !== latest.selected?.dayId) {
          flushSync(() => setView(undefined))
          setView(latest)
        } else setView(latest)
        setStorageStatus('')
        navigate(latest.blocked ? 'context-required' : next)
      } catch (error) {
        focusHeading.current = true
        fail(error)
      }
    })
  }

  function newDriver() {
    if (inFlight.current || view?.actor.role !== 'instruktør') return
    setDriverFields({ driverName: '', employeeNumber: '' })
    setDriverErrors({})
    setSavedDriverId(undefined)
    setProblem(undefined)
    setStorageStatus('')
    driverAttempt.current = undefined
    navigate('create-driver')
  }

  async function loadSelectedDriver(driverId: string) {
    const latest = await application.withOpenStorage(() => application.selectDriver(driverId))
    setView(latest)
    if (screen !== 'drivers') navigate('drivers')
  }

  function selectDriver(driverId: string) {
    void perform(async () => {
      setSelectingDriver(true)
      try {
        await loadSelectedDriver(driverId)
        setStorageStatus('')
      } catch (error) {
        report(error)
        setNavigationError('Sjåføren kunne ikke åpnes. ' + explain(error))
      } finally {
        setSelectingDriver(false)
      }
    })
  }

  function submitDriver() {
    if (inFlight.current || view?.actor.role !== 'instruktør') return
    const actor = view.actor
    const issues = validateDriverFields(driverFields)
    setDriverErrors(issues)
    if (Object.keys(issues).length) return
    let attempt = driverAttempt.current
    if (attempt?.fields !== driverFields || attempt.command.actor.id !== actor.id) {
      attempt = { fields: driverFields, command: application.newCreateDriverCommand(actor, driverFields) }
      driverAttempt.current = attempt
    }
    const { command } = attempt
    void perform(async () => {
      let committed = savedDriverId
      setProblem(undefined)
      if (!committed) setStorageStatus('Lagrer …')
      try {
        if (!committed) {
          const result = await application.withOpenStorage(() => application.executeCreateDriver(command))
          committed = result.driverId
          setSavedDriverId(committed)
          setStorageStatus('Lagret på denne enheten')
        }
        await loadSelectedDriver(committed)
      } catch (error) {
        report(error)
        if (!committed) setStorageStatus('Endringene er ikke lagret. Prøv igjen.')
        setProblem(error instanceof AppError ? error : new AppError('storage_read'))
      }
    })
  }

  function restoreInstructor() {
    void perform(async () => {
      try {
        setView(await application.withOpenStorage(() => application.changeRole('instruktør')))
        setProblem(undefined)
      } catch (error) {
        report(error)
        setProblem(error instanceof AppError ? error : new AppError('storage_read'))
      }
    })
  }

  function showAssessmentScreen(next: DayScreen, field?: DayField, requestedDayId?: string) {
    if (!selected) return
    void perform(async () => {
      if (editor.current && !await editor.current.flush()) return
      try {
        const dayId = requestedDayId ?? (field && screen === 'baseline' ? selected.baseline.firstDayId : selected.dayId)
        const latest = await application.withOpenStorage(() => field || requestedDayId
          ? application.select(selected.id, dayId)
          : application.read({ runId: selected.id, dayId }))
        if (latest.actor.id !== view?.actor.id || latest.actor.role !== view?.actor.role) replaceRoleView(latest)
        else {
          setView(latest)
          if (screen === 'day' && latest.selected?.revision !== selected.revision) {
            setDayEditorGeneration(generation => generation + 1)
          }
        }
        if (latest.blocked) {
          navigate('context-required')
          return
        }
        if (latest.selected?.closed && next !== 'day') {
          navigate('history')
          return
        }
        if (next === 'closure' && !latest.selected?.conclusion) {
          setNavigationError(`Velg ${professional.roleLower}rollen for å avslutte perioden.`)
          return
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
          setNavigationError(latest.actor.role === selected.context
            ? 'Planen må utvides før neste dag kan opprettes.' : explain(new AppError('wrong_role')))
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
      if (technicalEditor.current && !await technicalEditor.current.flush()) return
      try {
        const current = selected ?? blockedRun
        const selection = overview && role === 'instruktør' && screen !== 'drivers' ? null
          : current && { runId: current.id, dayId: current.dayId }
        const next = await application.withOpenStorage(() => application.changeRole(role, selection))
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
      if (showingTechnical) setScreen(initialScreen(next))
      else if (screen === 'drivers' && next.actor.role !== 'fadder') setScreen('drivers')
      else if (overview) setScreen(overviewScreen(next))
      else if (next.blocked) setScreen('context-required')
      else if (screen === 'context-required') setScreen(initialScreen(next))
      else if (screen === 'mentor' && !next.selected?.mentorDay) setScreen('day')
      else if (screen === 'closure' && !next.selected?.conclusion) setScreen(next.selected?.closed ? 'history' : 'day')
    })
    flushSync(() => { setView(next) })
    const fieldTarget = screen === 'day' && fieldToFix && next.actor.role === selected?.context
      ? document.getElementById(`day-field-${fieldToFix}`)
      : null
    if (fieldTarget) fieldTarget.focus()
    else if (returnFocus) roleSelect.current?.focus()
  }

  function clearRoleRestore() {
    setRoleRestore(undefined)
    cachedDialog.current = undefined
    recoverySelection.current = undefined
  }

  function acceptDayCommandView(next: WorkspaceView) {
    if (next.blocked) {
      recoverySelection.current = { runId: next.blocked.id, dayId: next.blocked.dayId }
      setRoleRestore('local-draft')
      return false
    }
    setView(next)
    return true
  }

  function adoptClosureState(stored: WorkspaceView) {
    const differentRole = view?.actor.id !== stored.actor.id || view?.actor.role !== stored.actor.role
    if (differentRole) replaceRoleView(stored)
    else setView(stored)
    if (stored.blocked) {
      navigate('context-required')
    } else if (stored.selected?.closed) {
      navigate('history')
    } else if (!stored.selected?.conclusion) {
      navigate('day')
    } else {
      clearRoleRestore()
      focusHeading.current = true
      setClosureEditorGeneration(generation => generation + 1)
      setNavigationError('Gjeldende tilstand er lastet inn. Kontroller avslutningen på nytt.')
    }
  }

  async function checkRestoredRole(resume = false) {
    if (!guardedScreen || !view || checkingRole.current) return
    checkingRole.current = true
    setRoleRestore('checking')
    const current = selected ?? blockedRun
    const selection = recoverySelection.current ?? (current && { runId: current.id, dayId: current.dayId })
    try {
      if (showingTechnical) {
        let next = await application.withOpenStorage(() => resume
          ? application.changeRole(draftRole)
          : application.read())
        if (resume && technicalDriver && next.technicalDriverId !== technicalDriver.id) {
          next = await application.selectDriver(technicalDriver.id)
        }
        if (resume && technicalAddress && (next.technical ?? next.technicalProblem)?.documentId !== technicalAddress.documentId) {
          next = await application.selectTechnical(technicalAddress)
        }
        const sameContext = next.actor.id === view.actor.id && next.actor.role === view.actor.role
          && next.technicalDriverId === view.technicalDriverId
          && (screen === 'create-technical' || (next.technical ?? next.technicalProblem)?.documentId === technicalAddress?.documentId)
        if (!sameContext) {
          technicalEditor.current?.clearDialogs()
          if (screen === 'create-technical' || technicalEditor.current?.hasLocalChanges()) {
            setRoleRestore('local-draft')
            return
          }
          replaceRoleView(next)
          heading.current?.focus()
          return
        }
        if (next.technical) technicalEditor.current?.restore(next.technical)
        flushSync(() => {
          setView(next)
          setRoleRestore(undefined)
        })
        restoreCachedDialog()
        return
      }
      const beforeFlush = await application.withOpenStorage(() => resume
        ? application.changeRole(draftRole, selection)
        : application.read(selection))
      const sameActor = (state: WorkspaceView) => state.actor.id === view.actor.id && state.actor.role === view.actor.role
      const shouldFlush = editor.current && (screen === 'closure' || (!resume && (screen === 'day' || !sameActor(beforeFlush))))
      const flushed = !shouldFlush || await editor.current!.flush()
      // Rolle og revisjon kan ha endret seg mens editoren ventet på lagring eller feilhåndtering.
      const next = shouldFlush ? await application.read(selection) : beforeFlush
      const latest = next.selected
      if (screen === 'closure' && flushed && (latest?.closed || latest?.revision !== selected?.revision)) {
        adoptClosureState(next)
        return
      }
      if (!resume && !sameActor(next)) {
        if (dayCommandForm || instructorCreation || !flushed) {
          setRoleRestore('local-draft')
          return
        }
        replaceRoleView(next)
        heading.current?.focus()
        return
      }
      if (screen === 'mentor' && latest?.dayLocked && !selected?.dayLocked) {
        flushSync(() => {
          editor.current?.restoreLock?.({ ...next, selected: latest })
          clearRoleRestore()
        })
        return
      }
      flushSync(() => {
        if (screen === 'history' || screen === 'day' || dayCommandForm || overview || instructorCreation
          || screen === 'context-required') setView(next)
        if (screen === 'day' && !resume && flushed && latest?.revision !== selected?.revision) {
          setDayEditorGeneration(generation => generation + 1)
        }
        setRoleRestore(undefined)
        recoverySelection.current = undefined
      })
      if (screen === 'history') heading.current?.focus()
      restoreCachedDialog()
    } catch (error) {
      report(error)
      setRoleRestore(resume ? 'local-draft' : 'read-error')
    } finally {
      checkingRole.current = false
    }
  }

  function restoreCachedDialog() {
    const dialog = cachedDialog.current
    cachedDialog.current = undefined
    if (dialog?.element.isConnected && !dialog.element.open) {
      dialog.element.showModal()
      if (dialog.focus instanceof HTMLElement && dialog.element.contains(dialog.focus)) dialog.focus.focus()
    }
  }

  function hideRoleView() {
    // Skjul vurderingsinnhold før nettleseren kan fryse den gamle lesemodellen.
    if (!guardedScreen || roleRestore) return
    const dialog = document.querySelector<HTMLDialogElement>('dialog:modal')
    if (dialog) {
      cachedDialog.current = { element: dialog, focus: document.activeElement }
      dialog.close()
    }
    flushSync(() => setRoleRestore('checking'))
  }
  const hideCachedRoleView = useEffectEvent(() => { hideRoleView() })
  const showCachedRoleView = useEffectEvent(() => { void checkRestoredRole() })
  const checkForegroundRole = useEffectEvent(() => {
    if (!instructorProtected || roleRestore === 'local-draft' || roleRestore === 'read-error' || checkingRole.current) return
    hideRoleView()
    if (!document.hidden) void checkRestoredRole()
  })

  useEffect(() => {
    const onHide = (event: PageTransitionEvent) => { if (event.persisted) hideCachedRoleView() }
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) showCachedRoleView() }
    const onBlur = () => { lostWindowFocus.current = true }
    const onFocus = () => {
      if (!lostWindowFocus.current) return
      lostWindowFocus.current = false
      checkForegroundRole()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    document.addEventListener('visibilitychange', checkForegroundRole)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
      document.removeEventListener('visibilitychange', checkForegroundRole)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
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

  function openClosureIssue(issue: ClosureIssue) {
    if (issue.section === 'session') showAssessmentScreen('day', issue.field, issue.dayId)
    else showAssessmentScreen(issue.section === 'days' ? 'day' : issue.section, undefined, issue.dayId)
  }

  function refreshDraft() {
    void perform(async () => {
      try {
        const current = view?.actor.role === createContext ? await application.open()
          : await application.withOpenStorage(() => application.changeRole(createContext))
        setView(current)
        setProblem(current.actor.role === createContext ? undefined : new AppError('wrong_role'))
      } catch (error) {
        report(error)
        setProblem(error instanceof AppError ? error : new AppError('storage_open'))
      }
    })
  }

  async function loadCommitted(saved: RunReceipt) {
    try {
      const latest = await application.withOpenStorage(() => application.select(saved.runId, saved.dayId))
      setView(latest)
      setStorageStatus('')
      navigate(initialScreen(latest))
    } catch (error) {
      report(error)
      setProblem(error instanceof AppError ? error : new AppError('storage_read'))
    }
  }

  function retryCommitted() {
    if (receipt) void perform(() => loadCommitted(receipt))
  }

  function submit() {
    if (inFlight.current || receipt || view?.actor.role !== createContext) return
    const issues = validateCreateRun(fields, createContext)
    setErrors(issues)
    if (Object.keys(issues).length > 0) return

    const actor = view.actor
    let current = attempt.current
    if (current?.fields !== fields || current.command.actor.id !== actor.id) {
      current = { fields, command: application.newCreateCommand(actor, fields, runDriver) }
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
  const canRetry = view?.actor.role === createContext
    && (!problem || ['storage_read', 'storage_write', 'storage_open'].includes(problem.code))
  const assessmentHeading = `Dagens ${professional.assessment}`
  const title = screen === 'history' && selected?.closed ? 'Hele skjemaet'
    : screen === 'mentor' ? assessmentHeading
      : screen === 'create' && runDriver ? 'Opprett instruktørvurdering'
        : screen === 'drivers' && view?.actor.role === 'sjåfør' ? 'Dokumentoversikt' : headings[screen]
  const overviewLabel = view?.actor.role === 'instruktør' ? 'Til instruktøroversikten' : 'Til løpsoversikten'
  const dayName = selected && (screen === 'baseline' ? selected.baseline.fields.mentorName : selected.fields.mentorName)

  return (
    <>
      <header className="profile">
        <div className="profile-inner">
          <img className="logo" src={logo} alt="Tide" />
          <div className="profile-context">
            <p className="app-name">Digital kjørevurdering</p>
            {view && !roleRestore && (
              <div className="role">
                {screen === 'create' || screen === 'create-driver' || screen === 'create-day' || screen === 'create-technical' || screen === 'extend'
                  ? <p>Simuleringsrolle · {roleName[view.actor.role]}</p>
                  : <>
                      <label htmlFor="simulation-role">Simuleringsrolle</label>
                      <select
                        id="simulation-role"
                        ref={roleSelect}
                        value={view.actor.role}
                        aria-disabled={busy}
                        onChange={event => {
                          const value = event.currentTarget.value
                          if (isRole(value)) changeRole(value)
                        }}
                      >
                        <option value="fadder">Fadder</option>
                        <option value="sjåfør">Sjåfør</option>
                        <option value="instruktør">Instruktør</option>
                      </select>
                    </>}
              </div>
            )}
            {selected && !roleRestore && (
              <>
                <p className="day-context">
                  {(screen === 'baseline' ? selected.baseline.fields.driverName : selected.fields.driverName) || 'Sjåførnavn mangler'}
                  {' · Dag '}{screen === 'baseline' ? 1 : selected.day}
                </p>
                <p className="professional-context">{professional.role}{dayName && ` · ${dayName}`}</p>
              </>
            )}
            {showingTechnical && technicalDriver && !roleRestore && (
              <p className="day-context">Valgt sjåfør · {technicalDriver.name} · {technicalDriver.employeeNumber}</p>
            )}
            {view && <p className="network-status" aria-live="polite">{online ? 'Nett tilkoblet' : 'Uten nett'}</p>}
          </div>
        </div>
      </header>
      <main className="content">
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {(screen === 'create' || screen === 'create-driver' || screen === 'drivers') && (
          <p className="save-status" role="status" aria-atomic="true">{storageStatus}</p>
        )}
        {navigationError && <p className="error-panel" role="alert">{navigationError}</p>}
        {screen === 'loading' && <p role="status">Åpner lokalt lager og laster løp …</p>}
        {screen === 'unavailable' && (
          <section aria-label="Lagringsfeil">
            <p className="error-panel" role="alert">{startupIssue}</p>
            <button type="button" className="button primary" aria-disabled={busy} onClick={retryOpen}>Prøv igjen</button>
          </section>
        )}
        {screen === 'runs' && view && !roleRestore && (
          <>
            {view.actor.role === 'fadder'
              ? <button type="button" className="button primary" aria-disabled={busy} onClick={() => newRun()}>Opprett løp</button>
              : <button type="button" className="button secondary" aria-disabled={busy} onClick={showDocumentOverview}>Dokumentoversikt</button>}
            {view.runs.length === 0
              ? <p className="empty">Det er ingen lagrede løp på denne enheten. Opprett et løp for å registrere den første dagen.</p>
              : <ul className="run-list">
                  {view.runs.map(run => (
                    <li key={run.id}>
                      <button type="button" className="run-button" aria-disabled={busy} onClick={() => openRun(run.id)}>
                        <span className="run-name">{run.driverName}</span>
                        <span>Ansattnummer {run.employeeNumber} · <CalendarDate value={run.firstDate} /></span>
                        {run.context === 'instruktør' && <span>Instruktørvurdering</span>}
                        <span className="run-status">{run.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>}
          </>
        )}
        {screen === 'drivers' && view && view.actor.role !== 'fadder' && !roleRestore && (
          <>
            <InstructorOverview view={view} busy={busy} selectingDriver={selectingDriver} onNewDriver={newDriver}
              onSelect={selectDriver} onNewRun={newRun} onOpenRun={openRun} onNewTechnical={newTechnical} onOpenTechnical={openTechnical} />
            {view.actor.role === 'sjåfør' && <button type="button" className="button secondary" aria-disabled={busy} onClick={showRuns}>
              Til løpsoversikten
            </button>}
          </>
        )}
        {screen === 'create-technical' && view && technicalDriver && (
          <CreateTechnicalForm key={`${view.actor.id}/${technicalDriver.id}`} driver={technicalDriver} actor={view.actor}
            application={application} navigating={busy} suspended={Boolean(roleRestore)} report={report}
            onCreated={loadTechnical} onCancel={showDocumentOverview} />
        )}
        {screen === 'technical' && technical && view && (
          <div hidden={Boolean(roleRestore)}>
            <TechnicalTrainingForm key={`${view.actor.id}/${technical.documentId}/${technicalEditorGeneration}`} ref={technicalEditor}
              initial={technical} actor={view.actor} application={application} navigating={busy} suspended={Boolean(roleRestore)}
              download={downloadTechnicalPdf} report={report} onStored={adoptTechnicalState} />
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={showDocumentOverview}>Til dokumentoversikten</button>
            </div>
          </div>
        )}
        {technicalProblem && !roleRestore && (
          <section aria-label="Leseproblem i teknisk opplæring">
            <p className="error-panel" role="alert">Det tekniske dokumentet kunne ikke leses. {
              technicalProblem.error === 'storage_read' ? 'Dokumentgrunnlaget er ugyldig.' : explain(new AppError(technicalProblem.error))
            }</p>
            <div className="actions">
              <button type="button" className="button primary" aria-disabled={busy}
                onClick={() => openTechnical(technicalProblem)}>Prøv igjen</button>
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={showDocumentOverview}>Til dokumentoversikten</button>
            </div>
          </section>
        )}
        {screen === 'create-driver' && view?.actor.role === 'instruktør' && !roleRestore && (
          <CreateDriverForm view={view} fields={driverFields} errors={driverErrors} busy={busy}
            problem={problemText} saved={Boolean(savedDriverId)} onSubmit={submitDriver} onSelect={selectDriver}
            restoreRole={problem?.code === 'stale' || problem?.code === 'wrong_role' ? restoreInstructor : undefined}
            onCancel={showRuns} onChange={(field, value) => {
              if (inFlight.current || savedDriverId) return
              setDriverFields(previous => ({ ...previous, [field]: value }))
              setDriverErrors(previous => ({ ...previous, [field]: undefined }))
              setProblem(undefined)
              setStorageStatus('')
            }} />
        )}
        {blockedRun && !roleRestore && (
          <>
            <p>{blockedRun.driverName} · Ansattnummer {blockedRun.employeeNumber} · Dag {blockedRun.day}</p>
            <p>Vurderingsskjema · {professional.role} · {blockedRun.status}</p>
            <p>Velg {professional.roleLower}rollen for faglig innsyn og arbeid i denne vurderingen.</p>
            <div className="actions">
              <button type="button" className="button primary" aria-disabled={busy}
                onClick={() => changeRole(blockedRun.context)}>Bytt til {professional.role}</button>
              <button type="button" className="button secondary" aria-disabled={busy} onClick={showRuns}>{overviewLabel}</button>
            </div>
          </>
        )}
        {screen === 'create' && receipt && problem && !roleRestore && (
          <section aria-label="Lagret løp">
            <p className="error-panel" role="alert">Løpet er lagret, men kunne ikke åpnes. {explain(problem)}</p>
            <button className="button primary" type="button" aria-disabled={busy} onClick={retryCommitted}>Åpne lagret løp</button>
          </section>
        )}
        {screen === 'create' && !receipt && !roleRestore && (
          <>
            {runDriver ? (
              <p className="context">Faglig kontekst · Instruktør · Registrering {runDriver.id}. Alle felt er obligatoriske.</p>
            ) : <p className="context">Bruk fiktive navn og ansattnummer i demonstrasjonen. Alle felt er obligatoriske.</p>}
            <CreateRunForm fields={fields} errors={errors} pending={busy} problem={problemText} canRetry={canRetry}
              driver={runDriver} context={createContext}
              recoveryLabel={view?.actor.role !== createContext ? `Bytt til ${roleName[createContext]}` : 'Last inn gjeldende tilstand'}
              onChange={updateField} onSubmit={submit} onCancel={showRuns} onRefresh={refreshDraft} />
          </>
        )}
        {screen === 'create-day' && selected && view && (
          <div hidden={Boolean(roleRestore)}>
            <CreateDayForm key={selected.id} day={selected} actor={view.actor} application={application} report={report}
            onWorkspace={acceptDayCommandView} onCancel={() => showAssessmentScreen('day')} onComplete={(next, created) => {
              if (!acceptDayCommandView(next)) return
              setStorageStatus(created ? '' : 'Datoen er allerede registrert. Den eksisterende dagen er åpnet.')
              navigate('day')
            }} />
          </div>
        )}
        {screen === 'extend' && selected && view && (
          <div hidden={Boolean(roleRestore)}>
            <ExtendRunForm key={selected.id} day={selected} actor={view.actor} application={application} report={report}
            onWorkspace={acceptDayCommandView} onCancel={() => showAssessmentScreen('day')} onComplete={next => {
              if (!acceptDayCommandView(next)) return
              navigate('day')
            }} />
          </div>
        )}
        {screen === 'day' && selected?.closed && !roleRestore && (
          <>
            <p className="run-status">Avsluttet</p>
            <DayTimeline day={selected} busy={busy} onSelect={id => openRun(selected.id, id)} />
            <div className="actions">
              <button type="button" className="button primary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('history')}>Åpne hele skjemaet</button>
              <button type="button" className="button secondary" aria-disabled={busy} onClick={showRuns}>{overviewLabel}</button>
            </div>
          </>
        )}
        {screen === 'day' && selected && !selected.closed && view && (
          <div hidden={Boolean(roleRestore)}>
            {storageStatus && <p role="status" className="save-status">{storageStatus}</p>}
            <DayTimeline day={selected} busy={busy} onSelect={id => openRun(selected.id, id)} />
            {view.actor.role === selected.context && !selected.dayLocked && selected.status !== 'Avsluttet'
              && selected.days.length === selected.plannedLastDay && selected.days.length < 5 && (
              <p className="context">Planen må utvides før neste dag kan opprettes. Bruk oppfølgingen i {professional.assessment}en.</p>
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
                <h2 id="mentor-entry-heading">{assessmentHeading}</h2>
                <p>{professional.role}vurderingen er {selected.dayLocked ? 'låst' : 'ikke bekreftet'}</p>
                <button type="button" className="button secondary" aria-disabled={busy}
                  onClick={() => showAssessmentScreen('mentor')}>Åpne dagens {professional.assessment}</button>
              </section>
            )}
            <DayDraftForm key={`${view.actor.id}/${selected.id}/${selected.dayId}/${dayEditorGeneration}`} ref={editor}
              initial={selected} actor={view.actor} application={application} report={report}
              onSaved={acceptDaySave} onAdopt={adoptStoredDay} navigating={busy} fieldToFix={fieldToFix} />
            <div className="actions">
              {selected.conclusion && (
                <button type="button" className="button primary" aria-disabled={busy}
                  onClick={() => showAssessmentScreen('closure')}>Avslutt perioden</button>
              )}
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('history')}>Åpne historikk</button>
              <button type="button" className="button secondary" aria-disabled={busy} onClick={showRuns}>{overviewLabel}</button>
            </div>
          </div>
        )}
        {screen === 'closure' && selected?.conclusion && view && (
          <div hidden={Boolean(roleRestore)}>
            <ClosureForm key={`${view.actor.id}/${selected.id}/${closureEditorGeneration}`} ref={editor}
              initial={{ ...selected, conclusion: selected.conclusion }} actor={view.actor} application={application}
              navigating={busy} report={report} onSaved={acceptDaySave} onStored={adoptClosureState} onIssue={openClosureIssue} />
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('day')}>Til dagsoversikten</button>
            </div>
          </div>
        )}
        {screen === 'history' && selected && view && !roleRestore && (
          <>
            {selected.closed ? <ClosedHistory key={`${view.actor.id}/${selected.id}/${selected.dayId}`} day={{ ...selected, closed: selected.closed }}
              busy={busy} downloadRunPdf={downloadRunPdf} report={report} /> : (
              <>
                <p>Planlagt siste dag · Dag {selected.plannedLastDay}</p>
                <DayTimeline day={selected} busy={busy} onSelect={id => openRun(selected.id, id, 'history')} />
                <DayHistory key={`${view.actor.id}/${selected.dayId}`} day={selected} />
              </>
            )}
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('day')}>Til dagsoversikten</button>
            </div>
          </>
        )}
        {(screen === 'baseline' || (screen === 'after' && selected?.driverAfter)) && selected && view && (
          <div hidden={Boolean(roleRestore)}>
            <AssessmentForm key={`${screen}/${view.actor.id}/${selected.id}/${selected.dayId}`} ref={editor}
              phase={screen === 'baseline' ? 'before' : 'driver_after'}
              initial={selected} actor={view.actor} application={application} report={report}
              onSaved={acceptDaySave} onAdopt={adoptStoredDay} navigating={busy}
              onConfirmIssue={setNavigationError} onDayField={field => showAssessmentScreen('day', field)} />
            <div className="actions">
              <button type="button" className="button secondary" aria-disabled={busy}
                onClick={() => showAssessmentScreen('day')}>Til dagsoversikten</button>
            </div>
          </div>
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
