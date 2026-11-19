import { lineTemplateV1 } from '../content/line-training.v1.ts'
import type { LineTemplate, LineTemplateRow } from '../content/line-training.v1.ts'
import { extraLines, lineCatalog, lineTemplateV2 } from '../content/line-training.v2.ts'
import { AppError, hasText, isCalendarDate, isConfirmationTime, isId, isRole, validateDriverFields } from './run.ts'
import type { Actor, DriverFields, DriverReference, ErrorCode } from './run.ts'

export const lineDocumentType = 'line-training'
const ruleVersion = 1
export const linePdfLayoutVersion = 1

export type LineSelection = { documentType: typeof lineDocumentType; documentId: string }
export type LineHeader = DriverFields
export type LineEntryFields = { lineId: string; drivenDate: string }
type DriverAuthor = { id: string; name: string; role: 'sjåfør'; driverRef: string }
type EntryContent = LineEntryFields & { entryId: string; author: DriverAuthor; recordedAt: string; editedAt: string }
export type LineDraftEntry = EntryContent & { status: 'draft' }
export type LineConfirmation = {
  actor: { id: string; name: string; role: 'instruktør' }
  confirmedAt: string
  sourceVersion: number
}
export type ConfirmedLineEntry = EntryContent & { status: 'confirmed'; confirmation: LineConfirmation }
export type LineEntry = LineDraftEntry | ConfirmedLineEntry
type LineContent = LineSelection & {
  driverRef: string; header: LineHeader; template: LineTemplate; ruleVersion: number; pdfLayoutVersion: number
}
export type LineTrainingSnapshot = LineContent & {
  sourceVersion: number; confirmedRevision: number; confirmedThrough: string; entries: ConfirmedLineEntry[]
  previouslyRecordedLines?: LineTemplateRow[]
}
export type LineTraining = LineContent & { revision: number; entries: LineEntry[]; snapshots: LineTrainingSnapshot[] }
export type LineSummary = LineSelection & LineHeader & { driverRef: string; draftCount: number; confirmedCount: number }
export type LineReadProblem = LineSelection & { error: ErrorCode }

type CommandBase = LineSelection & { commandId: string; driverRef: string; actor: Actor; expectedRevision: number }
export type CreateLineTraining = CommandBase & { kind: 'create-line-training'; payload: Record<string, never> }
export type LineEntryChange = { entryId: string; kind: 'add' | 'edit'; fields: LineEntryFields }
  | { entryId: string; kind: 'remove' }
export type SaveLineTraining = CommandBase & {
  kind: 'save-line-training'; payload: { header?: Partial<LineHeader>; changes?: LineEntryChange[]; editedAt: string }
}
export type ConfirmLineTrainingEntries = CommandBase & {
  kind: 'confirm-line-training-entries'; payload: { entryIds: string[]; instructorName: string; confirmedAt: string }
}
export type LineCommand = CreateLineTraining | SaveLineTraining | ConfirmLineTrainingEntries
export type LineReceipt = LineSelection & { revision: number; sourceVersion?: number }
export type LineIssue = { entryId?: string; field?: keyof LineHeader | keyof LineEntryFields; text: string }

const headerFields = ['driverName', 'employeeNumber'] as const
const entryFields = ['lineId', 'drivenDate'] as const
const osloDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', dateStyle: 'short' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value))
}

function stringFields(value: unknown, fields: readonly string[], partial = false) {
  return isRecord(value) && (partial || Object.keys(value).length === fields.length)
    && Object.keys(value).every(field => fields.includes(field) && typeof value[field] === 'string')
}

function uniqueIds(ids: unknown): ids is string[] {
  return Array.isArray(ids) && Array.from(ids).every(isId) && new Set(ids).size === ids.length
}

function isEarlier(a: string, b: string) {
  const aSecond = a.slice(0, 19)
  const bSecond = b.slice(0, 19)
  if (aSecond !== bSecond) return aSecond < bSecond
  // Brøkdelen kan ha ulik presisjon. Avsluttende nuller endrer ikke tidspunktet.
  return a.slice(20, -1).replace(/0+$/, '') < b.slice(20, -1).replace(/0+$/, '')
}

function validChange(change: LineEntryChange) {
  if (!isRecord(change) || !isId(change.entryId)) return false
  if (change.kind === 'remove') return Object.keys(change).length === 2
  return (change.kind === 'add' || change.kind === 'edit') && Object.keys(change).length === 3
    && stringFields(change.fields, entryFields)
}

export function validateLineCommand(command: LineCommand) {
  if (command?.documentType !== lineDocumentType || !isId(command.documentId) || !isId(command.commandId)
    || !isId(command.actor?.id) || !isRole(command.actor.role)
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0) throw new AppError('invalid_command')
  if (!isId(command.driverRef)) throw new AppError('driver_reference_missing')
  const { payload } = command
  if (!isRecord(payload)) throw new AppError('invalid_command')
  switch (command.kind) {
    case 'create-line-training':
      if (command.expectedRevision !== 0 || Object.keys(payload).length) throw new AppError('invalid_command')
      return
    case 'save-line-training':
      if (!isConfirmationTime(command.payload.editedAt)
        || Object.keys(payload).some(key => !['header', 'changes', 'editedAt'].includes(key))
        || (command.payload.header !== undefined && !stringFields(command.payload.header, headerFields, true))
        || (command.payload.changes !== undefined && (!Array.isArray(command.payload.changes)
          || !command.payload.changes.every(validChange) || !uniqueIds(command.payload.changes.map(change => change.entryId))))
        || (!Object.keys(command.payload.header ?? {}).length && !command.payload.changes?.length)) throw new AppError('invalid_command')
      return
    case 'confirm-line-training-entries':
      if (Object.keys(payload).length !== 3 || !uniqueIds(command.payload.entryIds) || !command.payload.entryIds.length
        || typeof command.payload.instructorName !== 'string' || !isConfirmationTime(command.payload.confirmedAt)) {
        throw new AppError('invalid_command')
      }
      return
    default: throw new AppError('invalid_command')
  }
}

export function createLineTraining(command: CreateLineTraining, driver: DriverReference): LineTraining {
  return {
    documentType: lineDocumentType, documentId: command.documentId, driverRef: driver.id, revision: 0,
    header: { driverName: driver.name, employeeNumber: driver.employeeNumber },
    template: structuredClone(lineTemplateV2), ruleVersion, pdfLayoutVersion: linePdfLayoutVersion, entries: [], snapshots: [],
  }
}

function checkLineContent(content: LineContent) {
  if (!content || content.documentType !== lineDocumentType || !isId(content.documentId) || !isId(content.driverRef)
    || !stringFields(content.header, headerFields)) throw new AppError('storage_read')
  const { template } = content
  const expected = [lineTemplateV1, lineTemplateV2].find(candidate => candidate.version === template?.version)
  if (!expected || template.id !== expected.id
    || content.ruleVersion !== ruleVersion || content.pdfLayoutVersion !== linePdfLayoutVersion) throw new AppError('line_version')
  if (!sameLineRows(template.lines, expected.lines)) throw new AppError('line_template')
}

function sameLineRows(rows: unknown, expected: LineTemplateRow[]) {
  return Array.isArray(rows) && rows.length === expected.length && expected.every(({ id, label, note }, index) => {
    const row = rows[index]
    return row?.id === id && row.label === label && row.note === note
  })
}

export function previouslyRecordedLines(entries: ReadonlyArray<Pick<LineEntryFields, 'lineId'>>) {
  const recordedIds = new Set(entries.map(entry => entry.lineId))
  return extraLines.filter(line => recordedIds.has(line.id))
}

export function lineEntryErrors(fields: LineEntryFields, lines: LineTemplateRow[], now: string) {
  return {
    lineId: lines.some(line => line.id === fields.lineId) ? undefined : 'Velg en linje fra oversikten.',
    drivenDate: isCalendarDate(fields.drivenDate) && fields.drivenDate <= osloDate.format(new Date(now))
      ? undefined : 'Skriv inn faktisk kjøredato som ÅÅÅÅ-MM-DD. Datoen kan ikke være i fremtiden.',
  }
}

function validAuthor(entry: LineEntry, driverRef: string) {
  const { author } = entry
  return isId(author?.id) && hasText(author.name) && author.role === 'sjåfør' && author.driverRef === driverRef
}

function validEntry(entry: LineEntry, driverRef: string, lines: LineTemplateRow[]) {
  return isId(entry?.entryId) && typeof entry.lineId === 'string'
    && (!entry.lineId || lines.some(line => line.id === entry.lineId))
    && typeof entry.drivenDate === 'string' && validAuthor(entry, driverRef)
    && isConfirmationTime(entry.recordedAt) && isConfirmationTime(entry.editedAt)
    && !isEarlier(entry.editedAt, entry.recordedAt)
}

function validConfirmedEntry(entry: ConfirmedLineEntry, source: LineTrainingSnapshot, lines: LineTemplateRow[]) {
  const confirmation = entry?.confirmation
  return validEntry(entry, source.driverRef, lines) && entry.status === 'confirmed' && isId(confirmation?.actor?.id)
    && confirmation.actor.role === 'instruktør' && hasText(confirmation.actor.name)
    && isConfirmationTime(confirmation.confirmedAt) && Number.isSafeInteger(confirmation.sourceVersion)
    && confirmation.sourceVersion > 0 && confirmation.sourceVersion <= source.sourceVersion
    && !isEarlier(confirmation.confirmedAt, entry.editedAt)
    && !Object.values(lineEntryErrors(entry, lines, confirmation.confirmedAt)).some(Boolean)
}

function sameHeader(a: LineHeader, b: LineHeader) {
  return a.driverName === b.driverName && a.employeeNumber === b.employeeNumber
}

function sameConfirmation(a: LineConfirmation, b: LineConfirmation) {
  return a.actor.id === b.actor.id && a.actor.name === b.actor.name && a.actor.role === b.actor.role
    && a.confirmedAt === b.confirmedAt && a.sourceVersion === b.sourceVersion
}

function sameEntry(a: ConfirmedLineEntry, b: ConfirmedLineEntry) {
  return a.entryId === b.entryId && a.lineId === b.lineId && a.drivenDate === b.drivenDate
    && a.recordedAt === b.recordedAt && a.editedAt === b.editedAt && a.author.id === b.author.id
    && a.author.name === b.author.name && sameConfirmation(a.confirmation, b.confirmation)
}

export function validateSavedLine(document: LineTraining) {
  checkLineContent(document)
  if (!Number.isSafeInteger(document.revision) || document.revision < 0 || !Array.isArray(document.snapshots)
    || !Array.isArray(document.entries) || !uniqueIds(document.entries.map(entry => entry?.entryId))
    || !document.entries.every(entry => validEntry(entry, document.driverRef, lineCatalog) && (entry.status === 'confirmed'
      || (entry.status === 'draft' && !Object.hasOwn(entry, 'confirmation'))))) throw new AppError('storage_read')
  let last: LineTrainingSnapshot | undefined
  for (const source of document.snapshots) {
    checkLineContent(source)
    if (source.documentId !== document.documentId || source.driverRef !== document.driverRef || !sameHeader(source.header, document.header)
      || source.template.version > document.template.version || (last && source.template.version < last.template.version)
      || Object.keys(validateDriverFields(source.header)).length || source.sourceVersion !== (last?.sourceVersion ?? 0) + 1
      || !Number.isSafeInteger(source.confirmedRevision) || source.confirmedRevision <= (last?.confirmedRevision ?? 0)
      || source.confirmedRevision > document.revision || !isConfirmationTime(source.confirmedThrough)
      || (last && isEarlier(source.confirmedThrough, last.confirmedThrough))
      || !Array.isArray(source.entries) || !uniqueIds(source.entries.map(entry => entry?.entryId))) throw new AppError('line_history')
    if (source.template.version === lineTemplateV1.version ? source.previouslyRecordedLines !== undefined
      : !sameLineRows(source.previouslyRecordedLines, previouslyRecordedLines(source.entries))) throw new AppError('line_history')
    const sourceLines = [...source.template.lines, ...(source.previouslyRecordedLines ?? [])]
    if (!source.entries.every(entry => validConfirmedEntry(entry, source, sourceLines))) throw new AppError('line_history')
    const oldEntries = last?.entries ?? []
    const newEntries = source.entries.slice(oldEntries.length)
    if (!newEntries.length || !oldEntries.every((entry, index) => sameEntry(entry, source.entries[index]))
      || !newEntries.every(entry => entry.confirmation.sourceVersion === source.sourceVersion
        && entry.confirmation.confirmedAt === source.confirmedThrough
        && sameConfirmation(entry.confirmation, newEntries[0].confirmation))) throw new AppError('line_history')
    last = source
  }
  const history = new Map(last?.entries.map(entry => [entry.entryId, entry]))
  for (const entry of document.entries) {
    if (entry.status === 'draft') continue
    const frozen = history.get(entry.entryId)
    if (!frozen || !validConfirmedEntry(entry, last!, lineCatalog) || !sameEntry(entry, frozen)) throw new AppError('line_history')
    history.delete(entry.entryId)
  }
  if (history.size) throw new AppError('line_history')
  return document
}

export function upgradeLineTraining(document: LineTraining): LineTraining {
  validateSavedLine(document)
  return document.template.version === lineTemplateV1.version
    ? { ...document, template: structuredClone(lineTemplateV2) }
    : document
}

export function lineExportSource(document: LineTraining, sourceVersion?: number) {
  validateSavedLine(document)
  const source = sourceVersion === undefined ? document.snapshots.at(-1)
    : document.snapshots.find(snapshot => snapshot.sourceVersion === sourceVersion)
  if (!source) throw new AppError('line_source_missing')
  return source
}

export function checkLineSelection(document: LineTraining, entryIds: string[], driverActorId: string, now: string): LineIssue[] {
  const errors = validateDriverFields(document.header)
  const issues: LineIssue[] = headerFields.flatMap(field => errors[field] ? [{ field, text: errors[field] }] : [])
  if (!entryIds.length) issues.push({ text: 'Velg minst én registrering.' })
  for (const entryId of entryIds) {
    const entry = document.entries.find(entry => entry.entryId === entryId)
    if (!entry || entry.status !== 'draft') {
      issues.push({ entryId, text: 'Registreringen finnes ikke som utkast lenger.' })
      continue
    }
    if (entry.author.id !== driverActorId || !validAuthor(entry, document.driverRef)) {
      issues.push({ entryId, text: 'Denne registreringen må fylles ut av sjåføren i riktig sjåførkontekst.' })
    }
    const errors = lineEntryErrors(entry, lineCatalog, now)
    for (const field of entryFields) {
      const error = errors[field]
      if (error) issues.push({ entryId, field, text: error })
    }
  }
  return issues
}

function saveLineTraining(document: LineTraining, command: SaveLineTraining, driver: DriverReference): LineTraining {
  const { header, changes, editedAt } = command.payload
  if ((header && command.actor.role !== 'instruktør') || (changes && command.actor.role !== 'sjåfør')) throw new AppError('wrong_role')
  if (header && document.snapshots.length) throw new AppError('locked')
  const entries = new Map(document.entries.map(entry => [entry.entryId, entry]))
  const author = { id: command.actor.id, role: 'sjåfør' as const, driverRef: driver.id, name: driver.name }
  for (const change of changes ?? []) {
    const previous = entries.get(change.entryId)
    if (change.kind === 'add' ? previous : !previous) throw new AppError('stale')
    if (previous?.status === 'confirmed') throw new AppError('locked')
    if (previous && previous.author.id !== command.actor.id) throw new AppError('wrong_role')
    if (change.kind === 'remove') entries.delete(change.entryId)
    else {
      if (previous && isEarlier(editedAt, previous.editedAt)) throw new AppError('line_clock')
      const { lineId } = change.fields
      if (lineId && lineId !== previous?.lineId && !document.template.lines.some(line => line.id === lineId)) {
        throw new AppError('line_template')
      }
      entries.set(change.entryId, { ...change.fields, entryId: change.entryId, status: 'draft',
        recordedAt: previous?.recordedAt ?? editedAt, editedAt, author: previous?.author ?? author })
    }
  }
  return { ...document, header: { ...document.header, ...header }, entries: [...entries.values()], revision: document.revision + 1 }
}

export function applyLineCommand(document: LineTraining, command: SaveLineTraining | ConfirmLineTrainingEntries,
  driver: DriverReference, driverActorId: string): LineTraining {
  document = upgradeLineTraining(document)
  if (document.documentId !== command.documentId || document.driverRef !== command.driverRef || driver.id !== document.driverRef) {
    throw new AppError('line_document_missing')
  }
  if (document.revision !== command.expectedRevision) throw new AppError('stale')
  if (document.revision === Number.MAX_SAFE_INTEGER) throw new AppError('line_revision_limit')
  if (command.kind === 'save-line-training') return saveLineTraining(document, command, driver)
  if (command.actor.role !== 'instruktør') throw new AppError('wrong_role')
  const { entryIds, instructorName, confirmedAt } = command.payload
  const selected = new Set(entryIds)
  if (document.entries.some(entry => selected.has(entry.entryId) && entry.status === 'confirmed')) throw new AppError('locked')
  if (!hasText(instructorName)) throw new AppError('line_instructor')
  const previous = document.snapshots.at(-1)
  if ((previous && isEarlier(confirmedAt, previous.confirmedThrough))
    || document.entries.some(entry => selected.has(entry.entryId) && isEarlier(confirmedAt, entry.editedAt))) {
    throw new AppError('line_clock')
  }
  if (checkLineSelection(document, entryIds, driverActorId, confirmedAt).length) throw new AppError('line_incomplete')
  const { documentType, documentId, driverRef, header, template, ruleVersion, pdfLayoutVersion } = document
  const sourceVersion = document.snapshots.length + 1
  const confirmation: LineConfirmation = {
    actor: { id: command.actor.id, role: 'instruktør', name: instructorName.trim() }, confirmedAt, sourceVersion,
  }
  const confirmed = new Map(document.entries.filter(entry => selected.has(entry.entryId)).map(entry => [
    entry.entryId, { ...entry, status: 'confirmed', confirmation } satisfies ConfirmedLineEntry,
  ]))
  const revision = document.revision + 1
  const entries = [...(previous?.entries ?? []), ...confirmed.values()]
  const snapshot: LineTrainingSnapshot = structuredClone({
    documentType, documentId, driverRef, header, template, ruleVersion, pdfLayoutVersion, sourceVersion,
    confirmedRevision: revision, confirmedThrough: confirmedAt, entries, previouslyRecordedLines: previouslyRecordedLines(entries),
  })
  return { ...document, revision, entries: document.entries.map(entry => confirmed.get(entry.entryId) ?? entry),
    snapshots: [...document.snapshots, snapshot] }
}

export function lineSummary(document: LineTraining): LineSummary {
  const { documentType, documentId, driverRef, header, entries } = document
  const confirmedCount = entries.filter(entry => entry.status === 'confirmed').length
  return { documentType, documentId, driverRef, ...header, confirmedCount, draftCount: entries.length - confirmedCount }
}
