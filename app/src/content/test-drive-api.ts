import type { TestDriveHeader, testDriveV1 } from './test-drive.v1.ts'

export const testDrivePath = '/testkjoring/'
export const testDriveApiPath = '/api/testkjoring'

export type TestDrivePhase = 'before' | 'driving' | 'after' | 'closed'
export type TestDriveRole = 'candidate' | 'instructor'
export type TestDrivePerson = { id: string; name: string; email: string }
export type TestDriveDepartment = { id: string; name: string }

export type CreateTestDrive = {
  requestId: string
  departmentId: string
  candidateName: string
  candidateEmail: string
  instructorId: string
  expiresAt: string
  header: TestDriveHeader
}

export type TestDriveAssignment = {
  id: string
  department: TestDriveDepartment
  role: TestDriveRole
  candidateName: string
  instructorName: string
  expiresAt: string
  phase: TestDrivePhase
}

export type TestDriveDetail = TestDriveAssignment & {
  header: TestDriveHeader
  template: Pick<typeof testDriveV1, 'version' | 'source' | 'headerFields' | 'criteria' | 'candidateChoices'>
}

export type TestDriveAdministration = {
  id: string
  department: TestDriveDepartment
  candidate: TestDrivePerson
  instructor: TestDrivePerson
  expiresAt: string
  revokedAt: string | null
  access: 'active' | 'expired' | 'revoked'
  invitationUrl: string
}

export type TestDriveWorkspace = {
  person: TestDrivePerson
  assignments: TestDriveAssignment[]
  departments: (TestDriveDepartment & { instructors: TestDrivePerson[] })[]
  administration: TestDriveAdministration[]
}
