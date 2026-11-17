import criteria from './criteria.v1.json' with { type: 'json' }
import type { ContentSnapshot } from '../domain/run.ts'

// Kriterier fra PRD-addendumet, hjelp fra help-texts-draft.md (godkjent 2026-10-29).
// Regelversjon 1 viser til AD-6–8 vedtatt 2026-11-05.
export const approvedContent: ContentSnapshot = {
  criteriaVersion: 'prd-addendum-2026-10-29-v1',
  ruleVersion: 'ad-2026-11-05-v1',
  helpVersion: 'ux-approved-2026-10-29-v1',
  criteria,
}
