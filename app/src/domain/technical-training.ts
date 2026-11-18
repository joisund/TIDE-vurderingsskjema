import { technicalTemplateV1 } from '../content/technical-training.v1.ts'
import type { TechnicalTemplate } from '../content/technical-training.v1.ts'
import { AppError, hasText, isCalendarDate, isConfirmationTime, isId, isRole, validateDriverFields } from './run.ts'
import type { Actor, DriverFields, DriverReference, ErrorCode, FieldErrors, Role } from './run.ts'

export const technicalDocumentType = 'technical-training'
const ruleVersion = 1
const pdfLayoutVersion = 1

export type TechnicalSelection = { documentType: typeof technicalDocumentType; documentId: string }
export type TechnicalHeader = DriverFields & { instructorName: string; busType: string; trainingDate: string }
export type TechnicalCreateFields = Omit<TechnicalHeader, keyof DriverFields>
export const technicalCreateFields = ['instructorName', 'busType', 'trainingDate'] as const
export const technicalHeaderFields = ['driverName', 'employeeNumber', ...technicalCreateFields] as const
export const technicalFieldLabels: Record<keyof TechnicalHeader, string> = {
  driverName: 'Kandidatnavn', employeeNumber: 'Fiktivt ansattnummer', instructorName: 'Instruktørnavn',
  busType: 'Busstype', trainingDate: 'Opplæringsdato',
}

export const technicalStatusText = {
  pending: 'Ikke gjennomgått',
  reviewed: 'Gjennomgått',
  not_applicable: 'Gjelder ikke busstypen',
} as const
type PointStatus = keyof typeof technicalStatusText
type DriverActor = { id: string; role: 'sjåfør'; driverRef: string }
type PointAuthor = { actor: DriverActor; revision: number }
export type TechnicalPoint = {
  id: string
  status: PointStatus
  reason?: string
  author?: PointAuthor
  reasonDraft?: string
  draftAuthor?: PointAuthor
}
export type PointChange =
  | { status: 'pending' | 'reviewed'; reasonDraft?: string }
  | { status: 'not_applicable'; reason: string; reasonDraft?: string }
  | { status?: undefined; reasonDraft: string }

type TechnicalContent = TechnicalSelection & {
  driverRef: string
  header: TechnicalHeader
  template: TechnicalTemplate
  ruleVersion: number
  pdfLayoutVersion: number
}
export type TechnicalConfirmation = {
  actor: { id: string; role: 'instruktør'; name: string }
  confirmedAt: string
}
export type TechnicalSnapshot = TechnicalContent & {
  points: Omit<TechnicalPoint, 'reasonDraft' | 'draftAuthor'>[]
  filledBy: DriverActor & { name: string }
  confirmation: TechnicalConfirmation
  confirmedRevision: number
}
export type TechnicalTraining = TechnicalContent & {
  revision: number
  points: TechnicalPoint[]
  status: 'draft' | 'confirmed'
  snapshot?: TechnicalSnapshot
}
export type TechnicalSummary = TechnicalSelection & {
  driverRef: string
  busType: string
  trainingDate: string
  status: TechnicalTraining['status']
  ready: boolean
}
export type TechnicalReadProblem = TechnicalSelection & { error: ErrorCode }

type CommandBase = TechnicalSelection & { commandId: string; driverRef: string; actor: Actor; expectedRevision: number }
export type CreateTechnicalTraining = CommandBase & { kind: 'create-technical-training'; payload: TechnicalCreateFields }
export type SaveTechnicalTraining = CommandBase & {
  kind: 'save-technical-training'
  payload: { header?: Partial<TechnicalHeader>; points?: Record<string, PointChange> }
}
export type ConfirmTechnicalTraining = CommandBase & {
  kind: 'confirm-technical-training'
  payload: { instructorName: string; confirmedAt: string }
}
export type TechnicalCommand = CreateTechnicalTraining | SaveTechnicalTraining | ConfirmTechnicalTraining
export type TechnicalReceipt = TechnicalSelection & { revision: number }
export type TechnicalIssue = { field?: keyof TechnicalHeader; pointId?: string; text: string }

export function validateTechnicalCreate(fields: TechnicalCreateFields): FieldErrors<TechnicalCreateFields> {
  return {
    ...(!hasText(fields.instructorName) && { instructorName: 'Fyll inn instruktørnavn.' }),
    ...(!hasText(fields.busType) && { busType: 'Fyll inn busstype.' }),
    ...(!isCalendarDate(fields.trainingDate) && { trainingDate: 'Velg en gyldig opplæringsdato.' }),
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function matchesFields(value: unknown, fields: readonly string[], required = false) {
  if (!isPlainRecord(value)) return false
  const keys = Object.keys(value)
  return (!required || keys.length === fields.length)
    && keys.every(key => fields.includes(key) && typeof value[key] === 'string')
}

function validatePointChange(change: PointChange): boolean {
  if (matchesFields(change, ['reasonDraft'], true)) return true
  if (!change || typeof change !== 'object' || !('status' in change)) return false
  if (change.status === 'not_applicable') return matchesFields(change, ['status', 'reason', 'reasonDraft']) && hasText(change.reason)
  return (change.status === 'pending' || change.status === 'reviewed') && matchesFields(change, ['status', 'reasonDraft'])
}

export function validateTechnicalCommand(command: TechnicalCommand) {
  if (command?.documentType !== technicalDocumentType || !isId(command.documentId) || !isId(command.commandId)
    || !isId(command.actor?.id) || !isRole(command.actor.role)
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0) {
    throw new AppError('invalid_command')
  }
  if (!isId(command.driverRef)) throw new AppError('driver_reference_missing')
  switch (command.kind) {
    case 'create-technical-training':
      if (command.expectedRevision !== 0 || !matchesFields(command.payload, technicalCreateFields, true)) {
        throw new AppError('invalid_command')
      }
      return
    case 'save-technical-training': {
      const { payload } = command
      if (!isPlainRecord(payload) || Object.keys(payload).some(key => key !== 'header' && key !== 'points')
        || (payload.header !== undefined && !matchesFields(payload.header, technicalHeaderFields))
        || (payload.points !== undefined && (!isPlainRecord(payload.points) || !Object.values(payload.points).every(validatePointChange)))) {
        throw new AppError('invalid_command')
      }
      return
    }
    case 'confirm-technical-training':
      if (!matchesFields(command.payload, ['instructorName', 'confirmedAt'], true)
        || !isConfirmationTime(command.payload.confirmedAt)) throw new AppError('invalid_command')
      return
    default: throw new AppError('invalid_command')
  }
}

export function canReadTechnical(role: Role, activeDriver: string | undefined, driverRef: string) {
  return (role === 'sjåfør' || role === 'instruktør') && activeDriver === driverRef
}

export function assertTechnicalAccess(role: Role, activeDriver: string | undefined, driverRef: string) {
  if (!canReadTechnical(role, activeDriver, driverRef)) throw new AppError('wrong_role')
}

export function createTechnicalTraining(command: CreateTechnicalTraining, driver: DriverReference): TechnicalTraining {
  const errors = validateTechnicalCreate(command.payload)
  if (Object.keys(errors).length) throw new AppError('validation', errors)
  const template = structuredClone(technicalTemplateV1)
  return {
    documentType: technicalDocumentType, documentId: command.documentId, driverRef: driver.id, revision: 0,
    status: 'draft', template, ruleVersion, pdfLayoutVersion,
    header: {
      driverName: driver.name, employeeNumber: driver.employeeNumber,
      instructorName: command.payload.instructorName.trim(), busType: command.payload.busType.trim(),
      trainingDate: command.payload.trainingDate,
    },
    points: template.groups.flatMap(group => group.points.map(({ id }) => ({ id, status: 'pending' }))),
  }
}

function templatePoints(template: TechnicalTemplate) {
  return template.groups.flatMap(group => group.points)
}

export function validateTechnicalContent(content: TechnicalContent, points: TechnicalSnapshot['points']) {
  if (!content || content.documentType !== technicalDocumentType || !isId(content.documentId) || !isId(content.driverRef)
    || !matchesFields(content.header, technicalHeaderFields, true)) throw new AppError('storage_read')
  const { template } = content
  if (template?.id !== technicalTemplateV1.id || template.version !== technicalTemplateV1.version
    || content.ruleVersion !== ruleVersion || content.pdfLayoutVersion !== pdfLayoutVersion) {
    throw new AppError('technical_version')
  }
  // Hver støttede historiske versjon har sin egen uforanderlige kontrollmal.
  if (template.title !== technicalTemplateV1.title || template.vehicleContext !== technicalTemplateV1.vehicleContext
    || !Array.isArray(template.groups) || template.groups.length !== technicalTemplateV1.groups.length
    || !technicalTemplateV1.groups.every((expected, index) => {
      const group = template.groups[index]
      return group?.order === expected.order && group.title === expected.title
        && Array.isArray(group.points) && group.points.length === expected.points.length
        && expected.points.every((item, index) => {
          const point = group.points[index]
          return point?.id === item.id && point.text === item.text && point.note === item.note
        })
    })) throw new AppError('technical_points')
  const expectedPoints = templatePoints(technicalTemplateV1)
  if (!Array.isArray(points) || points.length !== expectedPoints.length
    || !expectedPoints.every(({ id }, index) => points[index]?.id === id)) throw new AppError('technical_points')
}

export function validateSavedTechnical(document: TechnicalTraining) {
  if (!document || document.documentType !== technicalDocumentType || !isId(document.documentId) || !isId(document.driverRef)
    || !Number.isSafeInteger(document.revision) || document.revision < 0) {
    throw new AppError('storage_read')
  }
  if (document.status === 'confirmed') return technicalExportSource(document)
  if (document.status !== 'draft' || document.snapshot !== undefined) throw new AppError('storage_read')
  validateTechnicalContent(document, document.points)
}

export function checkTechnicalTraining(
  document: TechnicalContent & { points: TechnicalSnapshot['points'] }, driverActorId: string, revision: number,
): TechnicalIssue[] {
  validateTechnicalContent(document, document.points)
  const errors = { ...validateDriverFields(document.header), ...validateTechnicalCreate(document.header) }
  const issues: TechnicalIssue[] = technicalHeaderFields.flatMap(field => errors[field] ? [{ field, text: errors[field] }] : [])
  const pointTexts = templatePoints(document.template)
  document.points.forEach((point, index) => {
    const { author, status, reason } = point
    let message: string | undefined
    if (status === 'pending') message = 'Sjåføren må fylle ut punktet.'
    else if (status !== 'reviewed' && status !== 'not_applicable') message = 'Punktet har ukjent status.'
    else if (author?.actor?.id !== driverActorId || author.actor.role !== 'sjåfør'
      || author.actor.driverRef !== document.driverRef || !Number.isSafeInteger(author.revision)
      || author.revision < 1 || author.revision > revision) message = 'Punktet må fylles ut av denne sjåføren.'
    else if (status === 'not_applicable' && !hasText(reason)) message = 'Sjåføren må begrunne kjøretøyunntaket.'
    else if (status === 'reviewed' && reason !== undefined) message = 'Punktet har en aktiv unntaksbegrunnelse som må rettes.'
    if (message) issues.push({ pointId: point.id, text: `${pointTexts[index].text}. ${message}` })
  })
  if (!document.points.some(point => point.status === 'reviewed')) {
    issues.push({ text: 'Minst ett punkt må være gjennomgått.' })
  }
  return issues
}

function saveTechnicalTraining(document: TechnicalTraining, command: SaveTechnicalTraining): TechnicalTraining {
  const { header, points } = command.payload
  if (points && command.actor.role !== 'sjåfør') throw new AppError('wrong_role')
  if (points && Object.keys(points).some(id => !document.points.some(point => point.id === id))) {
    throw new AppError('technical_points')
  }
  const revision = document.revision + 1
  const author: PointAuthor = { actor: { id: command.actor.id, role: 'sjåfør', driverRef: document.driverRef }, revision }
  return {
    ...document, revision, header: { ...document.header, ...header },
    points: points ? document.points.map(point => {
      const change = points[point.id]
      if (!change) return point
      return {
        ...withTechnicalPointChange(point, change),
        ...(change.status !== undefined && { author }),
        ...(change.reasonDraft !== undefined || change.status === 'not_applicable' ? { draftAuthor: author } : {}),
      }
    }) : document.points,
  }
}

export function withTechnicalPointChange(point: TechnicalPoint, change: PointChange): TechnicalPoint {
  const status = change.status ?? point.status
  const reason = change.status === undefined ? point.reason : change.status === 'not_applicable' ? change.reason.trim() : undefined
  const reasonDraft = change.reasonDraft ?? (change.status === 'not_applicable' ? change.reason : point.reasonDraft ?? point.reason)
  return { ...point, status, reason, reasonDraft }
}

export function applyTechnicalCommand(
  document: TechnicalTraining, command: SaveTechnicalTraining | ConfirmTechnicalTraining, driverActorId: string,
): TechnicalTraining {
  if (document.documentType !== command.documentType || document.documentId !== command.documentId || document.driverRef !== command.driverRef) {
    throw new AppError('technical_document_missing')
  }
  if (document.status !== 'draft') throw new AppError('locked')
  if (document.revision !== command.expectedRevision) throw new AppError('stale')
  if (command.kind === 'save-technical-training') return saveTechnicalTraining(document, command)

  if (command.actor.role !== 'instruktør') throw new AppError('wrong_role')
  const name = command.payload.instructorName.trim()
  if (!name || name !== document.header.instructorName.trim()) throw new AppError('technical_instructor')
  const issues = checkTechnicalTraining(document, driverActorId, document.revision)
  if (issues.length) throw new AppError('technical_incomplete')
  const { documentType, documentId, driverRef, header, template, ruleVersion, pdfLayoutVersion } = document
  const filledBy = { id: driverActorId, role: 'sjåfør' as const, driverRef, name: header.driverName.trim() }
  const confirmation = { actor: { id: command.actor.id, role: command.actor.role, name }, confirmedAt: command.payload.confirmedAt }
  const points = document.points.map(({ id, status, reason, author }) => ({ id, status, reason, author }))
  const snapshot: TechnicalSnapshot = {
    documentType, documentId, driverRef, header: { ...header }, template: structuredClone(template), ruleVersion,
    pdfLayoutVersion, points, filledBy, confirmation, confirmedRevision: document.revision + 1,
  }
  return { ...document, revision: snapshot.confirmedRevision, status: 'confirmed', snapshot }
}

export function technicalExportSource(document: TechnicalTraining): TechnicalSnapshot {
  if (document.status !== 'confirmed') throw new AppError('locked')
  const source = document.snapshot
  if (!source || source.documentId !== document.documentId || source.driverRef !== document.driverRef
    || source.confirmedRevision !== document.revision) throw new AppError('technical_incomplete')
  validateTechnicalContent(source, source.points)
  if (source.filledBy?.role !== 'sjåfør'
    || !isId(source.filledBy.id) || source.filledBy.driverRef !== source.driverRef
    || !hasText(source.filledBy.name) || source.filledBy.name !== source.header.driverName.trim()
    || source.confirmation?.actor?.role !== 'instruktør' || !isId(source.confirmation.actor.id)
    || !hasText(source.confirmation.actor.name) || source.confirmation.actor.name !== source.header.instructorName.trim()
    || !isConfirmationTime(source.confirmation.confirmedAt)) throw new AppError('technical_incomplete')
  if (checkTechnicalTraining(source, source.filledBy.id, source.confirmedRevision - 1).length) {
    throw new AppError('technical_incomplete')
  }
  return source
}

export function technicalSummary(
  { documentType, documentId, driverRef, header, status, ...rest }: TechnicalTraining, driverActorId: string,
): TechnicalSummary {
  const ready = status === 'draft'
    && checkTechnicalTraining({ ...rest, documentType, documentId, driverRef, header }, driverActorId, rest.revision).length === 0
  const { busType, trainingDate } = header
  return { documentType, documentId, driverRef, status, busType, trainingDate, ready }
}
