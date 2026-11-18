import { criterionIds } from '../domain/run.ts'
import type { Criterion } from '../domain/run.ts'

const groups = [
  ['Sjåfør', 0, 4],
  ['Buss', 4, 11],
  ['Trafikk / kjøreteknikk · Sjåfør', 11, 14],
  ['Trafikk / kjøreteknikk · Samhandling', 14, 18],
  ['Trafikk / kjøreteknikk · Optimal kjøreteknikk', 18, 22],
] as const

export function groupedCriteria(criteria: readonly Criterion[]) {
  const sections: { name: string; rows: { criterion: Criterion; number: number }[] }[] = []
  for (const criterion of criteria) {
    const index = criterionIds.indexOf(criterion.id)
    const [name] = groups.find(([, from, to]) => index >= from && index < to)!
    if (sections.at(-1)?.name !== name) sections.push({ name, rows: [] })
    sections.at(-1)!.rows.push({ criterion, number: index + 1 })
  }
  return sections
}
