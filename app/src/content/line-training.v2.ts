import { lineTemplateV1 } from './line-training.v1.ts'
import type { LineTemplate } from './line-training.v1.ts'

export const lineCatalog = lineTemplateV1.lines
const extraLineIds = new Set(['L10', 'L22', 'L23', 'L24', 'L25'])
export const extraLines = lineCatalog.filter(line => extraLineIds.has(line.id))

export function isExtraLineId(id: unknown): id is string {
  return typeof id === 'string' && extraLineIds.has(id)
}

export const lineTemplateV2: LineTemplate = {
  id: lineTemplateV1.id,
  version: 2,
  lines: lineCatalog.filter(line => !extraLineIds.has(line.id)),
}
