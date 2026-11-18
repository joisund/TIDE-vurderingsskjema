import type { Actor, CreateRunCommand, Role, Run, RunReceipt } from '../domain/run.ts'
import type { SaveDayDraftCommand } from '../domain/day-draft.ts'
import type { ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../domain/baseline.ts'
import type { CreateDayCommand, CreateDayReceipt } from '../domain/create-day.ts'
import type { ConfirmDriverDayCommand, SaveDriverDayDraftCommand } from '../domain/driver-day.ts'
import type { ConfirmMentorDayCommand, MentorDayReceipt, ReviewRelevanceCommand, SaveMentorDayCommand } from '../domain/mentor-day.ts'
import type { FollowUpReceipt, SaveFollowUpCommand } from '../domain/follow-up.ts'
import type { CloseRunCommand, SaveConclusionCommand } from '../domain/closure.ts'

export type Selection = { runId: string; dayId: string }
export type Session = { actor: Actor; selection?: Selection }
export type WorkspaceState = { session: Session; runs: Run[] }

export interface RunStore {
  open(actors: Record<Role, string>): Promise<WorkspaceState>
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
  changeRole(role: Role, selection?: Selection): Promise<WorkspaceState>
}
