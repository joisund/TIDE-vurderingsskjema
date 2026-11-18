import type {
  Actor, CreateDriverCommand, CreateRunCommand, DriverReceipt, DriverReference, Role, Run, RunReceipt,
} from '../domain/run.ts'
import type { SaveDayDraftCommand } from '../domain/day-draft.ts'
import type { ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../domain/baseline.ts'
import type { CreateDayCommand, CreateDayReceipt } from '../domain/create-day.ts'
import type { ConfirmDriverDayCommand, SaveDriverDayDraftCommand } from '../domain/driver-day.ts'
import type { ConfirmMentorDayCommand, MentorDayReceipt, ReviewRelevanceCommand, SaveMentorDayCommand } from '../domain/mentor-day.ts'
import type { FollowUpReceipt, SaveFollowUpCommand } from '../domain/follow-up.ts'
import type { CloseRunCommand, SaveConclusionCommand } from '../domain/closure.ts'
import type {
  TechnicalCommand, TechnicalReadProblem, TechnicalReceipt, TechnicalSelection, TechnicalSummary, TechnicalTraining,
} from '../domain/technical-training.ts'
import type { LineCommand, LineReadProblem, LineReceipt, LineSelection, LineSummary, LineTraining } from '../domain/line-training.ts'

export type Selection = { runId: string; dayId: string }
export type DocumentSelection = TechnicalSelection | LineSelection
export type LineRoleContext = { actor: Actor; driverRef: string; document: LineSelection }
export type Session = { actor: Actor; selection?: Selection; driverId?: string; document?: DocumentSelection }
export type WorkspaceState = {
  session: Session
  runs: Run[]
  drivers: DriverReference[]
  technicalDocuments: (TechnicalSummary | TechnicalReadProblem)[]
  technical?: TechnicalTraining
  technicalProblem?: TechnicalReadProblem
  technicalDriverActorId: string
  lineDocuments: (LineSummary | LineReadProblem)[]
  lineTraining?: LineTraining
  lineProblem?: LineReadProblem
}

export interface RunStore {
  open(actors: Record<Role, string>): Promise<WorkspaceState>
  createDriver(command: CreateDriverCommand, fingerprint: string): Promise<DriverReceipt>
  create(command: CreateRunCommand, fingerprint: string, buildRun: () => Run): Promise<RunReceipt>
  createDay(command: CreateDayCommand, fingerprint: string): Promise<CreateDayReceipt>
  saveDayDraft(command: SaveDayDraftCommand, fingerprint: string): Promise<RunReceipt>
  saveBaselineDraft(command: SaveBaselineDraftCommand, fingerprint: string): Promise<RunReceipt>
  confirmBaseline(command: ConfirmBaselineCommand, fingerprint: string): Promise<RunReceipt>
  saveDriverDayDraft(command: SaveDriverDayDraftCommand, fingerprint: string): Promise<RunReceipt>
  confirmDriverDay(command: ConfirmDriverDayCommand, fingerprint: string): Promise<RunReceipt>
  saveMentorDay(command: SaveMentorDayCommand, fingerprint: string): Promise<RunReceipt>
  confirmMentorDay(command: ConfirmMentorDayCommand, fingerprint: string): Promise<MentorDayReceipt>
  reviewRelevance(command: ReviewRelevanceCommand, fingerprint: string): Promise<RunReceipt>
  saveFollowUp(command: SaveFollowUpCommand, fingerprint: string): Promise<FollowUpReceipt>
  saveConclusion(command: SaveConclusionCommand, fingerprint: string): Promise<RunReceipt>
  closeRun(command: CloseRunCommand, fingerprint: string): Promise<RunReceipt>
  read(selection?: Selection): Promise<WorkspaceState>
  readRun(runId: string): Promise<Run>
  select(runId: string, dayId?: string): Promise<WorkspaceState>
  showDrivers(): Promise<WorkspaceState>
  selectDriver(driverId: string): Promise<WorkspaceState>
  changeRole(role: Role, selection?: Selection | null, expectedLine?: LineRoleContext): Promise<WorkspaceState>
  executeTechnical(command: TechnicalCommand, fingerprint: string): Promise<TechnicalReceipt>
  readTechnical(selection: TechnicalSelection, requireSelected?: boolean): Promise<TechnicalTraining>
  selectTechnical(selection: TechnicalSelection): Promise<WorkspaceState>
  executeLineTraining(command: LineCommand, fingerprint: string): Promise<LineReceipt>
  readLineTraining(selection: LineSelection, requireSelected?: boolean): Promise<LineTraining>
  selectLineTraining(selection: LineSelection): Promise<WorkspaceState>
}
