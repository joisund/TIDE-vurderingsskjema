import type { AnswerContent } from '../domain/baseline.ts'

export const answerLabels = {
  ok: 'OK', needs_improvement: 'Kan bli bedre', not_relevant: 'Ikke relevant',
} as const

export function answerText(row: Pick<AnswerContent, 'value'>) {
  return row.value === null ? 'Ubesvart' : `Valgt · ${answerLabels[row.value]}`
}

export function keepMatrixFocusVisible(target: HTMLElement, header: HTMLElement | null) {
  if (!target.isConnected || document.activeElement !== target) return
  const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0)
  const bounds = target.getBoundingClientRect()
  if (bounds.top < top + 8 || bounds.bottom > window.innerHeight - 8) {
    window.scrollBy(0, bounds.top - (header?.offsetHeight ?? 0) - 10)
  }
}

export function focusMatrixField(id: string) {
  const target = document.getElementById(id)
  target?.focus({ preventScroll: true })
  if (target) keepMatrixFocusVisible(target, target.closest('.assessment-matrix')?.querySelector('.matrix-headings') ?? null)
}
