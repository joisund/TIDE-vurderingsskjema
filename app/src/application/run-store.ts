import type { Actor, CreateRunCommand, Role, Run, RunReceipt } from '../domain/run.ts'
import type { SaveDayDraftCommand } from '../domain/day-draft.ts'
import type { ConfirmBaselineCommand, SaveBaselineDraftCommand } from '../domain/baseline.ts'

export type Selection = { runId: string; dayId: string }
export type Session = { actor: Actor; selection?: Selection }
export type WorkspaceState = { session: Session; runs: Run[] }

export interface RunStore {
  open(actors: Record<Role, string>): Promise<WorkspaceState>
  create(command: CreateRunCommand, fingerprint: string, buildRun: () => Run): Promise<RunReceipt>
  saveDayDraft(command: SaveDayDraftCommand, fingerprint: string): Promise<RunReceipt>
  saveBaselineDraft(command: SaveBaselineDraftCommand, fingerprint: string): Promise<RunReceipt>
  confirmBaseline(command: ConfirmBaselineCommand, fingerprint: string): Promise<RunReceipt>
  read(selection?: Selection): Promise<WorkspaceState>
  select(runId: string, dayId?: string): Promise<WorkspaceState>
  changeRole(role: Role, selection?: Selection): Promise<WorkspaceState>
}
