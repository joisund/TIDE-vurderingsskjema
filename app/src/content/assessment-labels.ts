import type { EvaluationField } from '../domain/driver-day.ts'
import type { FollowUpChoice } from '../domain/follow-up.ts'

export const answerLabels = {
  ok: 'OK', needs_improvement: 'Kan bli bedre', not_relevant: 'Ikke relevant',
} as const

export const conclusionLabels = { approved: 'Godkjent', follow_up_needed: 'Oppfølgingsbehov' } as const

export const evaluationLabels = {
  strength1: 'Styrke 1', strength2: 'Styrke 2', strength3: 'Styrke 3',
  growth1: 'Utviklingsområde 1', growth2: 'Utviklingsområde 2', growth3: 'Utviklingsområde 3',
} satisfies Record<EvaluationField, string>

export const training = 'Utvidet kjøretrening før fadderkjøring fortsetter'

export function followUpText(choice?: FollowUpChoice) {
  switch (choice?.kind) {
    case 'none': return 'Nei'
    case 'training': return `Ja · ${training}`
    case 'days': return `Ja · ${choice.extraDays} ekstra ${choice.extraDays === 1 ? 'fadderdag' : 'fadderdager'}`
    default: return 'Ubesvart'
  }
}
