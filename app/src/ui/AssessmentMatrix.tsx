import { useLayoutEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { answerValues } from '../domain/baseline.ts'
import type { Answer, AnswerContent, AnswerValue } from '../domain/baseline.ts'
import { criterionIds } from '../domain/run.ts'
import type { Criterion } from '../domain/run.ts'
import { answerLabels, answerText, keepMatrixFocusVisible } from './assessment-fields.ts'
const groups = [
  ['Sjåfør', 0, 4],
  ['Buss', 4, 11],
  ['Trafikk / kjøreteknikk · Sjåfør', 11, 14],
  ['Trafikk / kjøreteknikk · Samhandling', 14, 18],
  ['Trafikk / kjøreteknikk · Optimal kjøreteknikk', 18, 22],
] as const

function groupedCriteria(criteria: readonly Criterion[]) {
  const sections: { name: string; rows: { criterion: Criterion; number: number }[] }[] = []
  for (const criterion of criteria) {
    const index = criterionIds.indexOf(criterion.id)
    const [name] = groups.find(([, from, to]) => index >= from && index < to)!
    if (sections.at(-1)?.name !== name) sections.push({ name, rows: [] })
    sections.at(-1)!.rows.push({ criterion, number: index + 1 })
  }
  return sections
}

export function Modal({ title, trigger, fallbackFocus, dismiss, blocking, help, children }: {
  title: string
  trigger: HTMLElement
  fallbackFocus: RefObject<HTMLElement | null>
  dismiss: () => void
  blocking?: boolean
  help?: boolean
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current
    const viewport = window.visualViewport
    const fitViewport = () => {
      if (!element || !viewport) return
      element.style.setProperty('--dialog-center', `${viewport.offsetTop + viewport.height / 2}px`)
      element.style.setProperty('--dialog-view-height', `${viewport.height}px`)
    }
    fitViewport()
    viewport?.addEventListener('resize', fitViewport)
    viewport?.addEventListener('scroll', fitViewport)
    element?.showModal()
    heading.current?.focus()
    return () => {
      viewport?.removeEventListener('resize', fitViewport)
      viewport?.removeEventListener('scroll', fitViewport)
      element?.close()
      // Konfliktoverskriften kan monteres mens dialogen står åpen.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const target = trigger.isConnected ? trigger : fallbackFocus.current
      target?.focus()
    }
  }, [trigger, fallbackFocus])

  return (
    <dialog ref={dialog} className={`assessment-dialog${help ? ' help-dialog' : ''}`}
      aria-labelledby="assessment-dialog-title" onCancel={event => {
        event.preventDefault()
        if (!blocking) dismiss()
      }}>
      <h2 id="assessment-dialog-title" ref={heading} tabIndex={-1}>{title}</h2>
      {children}
    </dialog>
  )
}
type MatrixProps = {
  criteria: readonly Criterion[]
  answers: readonly (Answer & { inheritedFrom?: string })[]
  rows: Record<string, AnswerContent>
  issues: Record<string, string>
  context: string
  editable: boolean
  blocked: boolean
  helpDisabled?: boolean
  reasonLabel?: string
  onHelp: (criterion: Criterion, trigger: HTMLElement) => void
  onChoice: (criterion: Criterion, value: AnswerValue, trigger: HTMLElement) => void
  renderDetails?: (criterion: Criterion) => ReactNode
}

export function AssessmentMatrix({
  criteria, answers, rows, issues, context, editable, blocked, helpDisabled, reasonLabel = 'Begrunnelse',
  onHelp, onChoice, renderDetails,
}: MatrixProps) {
  const matrix = useRef<HTMLDivElement>(null)
  const columnHeadings = useRef<HTMLDivElement>(null)
  const pointerFocus = useRef(false)

  useLayoutEffect(() => {
    const header = columnHeadings.current
    const container = matrix.current
    if (!header || !container) return
    const update = () => container.style.setProperty('--matrix-heading-height', `${header.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="assessment-matrix" ref={matrix}
      onPointerDownCapture={() => {
        pointerFocus.current = true
        requestAnimationFrame(() => { pointerFocus.current = false })
      }}
      onFocus={event => {
        const target = event.target
        if (!pointerFocus.current && target instanceof HTMLElement) {
          keepMatrixFocusVisible(target, columnHeadings.current)
          requestAnimationFrame(() => keepMatrixFocusVisible(target, columnHeadings.current))
        }
      }}>
      <div className="matrix-headings" ref={columnHeadings}>
        <span>Vurderingspunkt</span>
        <span>OK</span>
        <span>Kan bli bedre</span>
        <span>Ikke relevant</span>
      </div>
      {groupedCriteria(criteria).map(({ name, rows: sectionRows }) => {
        const headingId = `baseline-category-${sectionRows[0].criterion.id}`
        return <section key={headingId} aria-labelledby={headingId}>
          <h2 id={headingId} className="category">{name}</h2>
          {sectionRows.map(({ criterion, number }) => {
            const { id, title } = criterion
            const row = rows[id]
            const inherited = Boolean(answers.find(item => item.criterionId === id)?.inheritedFrom)
            const canEditRow = editable && !inherited
            const issue = canEditRow && issues[id]
            return (
              <div className="matrix-row" key={id} role="group" aria-labelledby={`title-${id}`}>
                <div className="matrix-criterion">
                  <div className="criterion-number">
                    <span aria-hidden="true">{number}</span>
                    <button type="button" className="help-trigger" aria-label={`Hjelp om ${title}`} aria-disabled={helpDisabled}
                      onClick={event => onHelp(criterion, event.currentTarget)}>?</button>
                  </div>
                  <p id={`title-${id}`}>{title}</p>
                  <p className="matrix-state">{answerText(row)}</p>
                  {inherited && <p className="matrix-state">Låst · Videreført fra førvurderingen</p>}
                  {issue && <p className="field-error" id={`baseline-issue-${id}`}>{issue}</p>}
                </div>
                {answerValues.map(value => canEditRow ? (
                  <button key={value} id={`answer-${id}-${value}`} type="button" className="matrix-choice"
                    aria-label={`${answerLabels[value]} · ${title} · ${context}`}
                    aria-pressed={row.value === value} aria-describedby={issue ? `baseline-issue-${id}` : undefined}
                    aria-invalid={issue ? true : undefined} aria-disabled={blocked}
                    onClick={event => { if (!blocked) onChoice(criterion, value, event.currentTarget) }}>
                    <span className="choice-dot" aria-hidden="true" />
                  </button>
                ) : (
                  <span key={value} className="matrix-choice choice-read-only" aria-hidden="true">
                    <span className={`choice-dot${row.value === value ? ' choice-selected' : ''}`} />
                  </span>
                ))}
                {row.reason && <p className="matrix-reason">{reasonLabel} · {row.reason}</p>}
                {renderDetails?.(criterion)}
              </div>
            )
          })}
        </section>
      })}
    </div>
  )
}
