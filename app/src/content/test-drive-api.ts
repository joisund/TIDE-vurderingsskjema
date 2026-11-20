import type { TestDriveHeader, testDriveV1 } from './test-drive.v1.ts'

export const testDrivePath = '/testkjoring/'
export const testDriveApiPath = '/api/testkjoring'
export const testDriveCommentLimits = { criterion: 1000, overall: 12_000 } as const

const osloReceiptTime = new Intl.DateTimeFormat('nb-NO', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  timeZone: 'Europe/Oslo', timeZoneName: 'shortOffset',
})

export function testDriveReceiptTime(iso: string) {
  return osloReceiptTime.format(new Date(iso))
}

export type TestDrivePhase = 'before' | 'driving' | 'after' | 'closed'
export type TestDriveRole = 'candidate' | 'instructor'
export type TestDriveCandidatePart = 'before' | 'after'
export type TestDriveAssessmentAction = 'save' | 'submit'
export type TestDriveCandidateChoice = typeof testDriveV1.candidateChoices[number]['id']
export type TestDriveCandidateAnswers = Partial<Record<string, TestDriveCandidateChoice>>
export type TestDriveAssessmentStatus = { revision: number; submittedAt: string | null }
export type TestDriveCandidateAssessment = TestDriveAssessmentStatus & { answers: TestDriveCandidateAnswers }
export type TestDriveCandidateWrite = {
  requestId: string
  revision: number
  answers: TestDriveCandidateAnswers
}
export type TestDriveInstructorChoice = typeof testDriveV1.instructorChoices[number]['id']
export type TestDriveResultChoice = typeof testDriveV1.resultChoices[number]['id']
export type TestDriveInstructorFields = {
  answers: Partial<Record<string, TestDriveInstructorChoice>>
  comments: Partial<Record<string, string>>
  overallComment: string
  result: TestDriveResultChoice | null
}
export type TestDriveInstructorAssessment = TestDriveAssessmentStatus & TestDriveInstructorFields & { authorId: string | null }
export type TestDriveInstructorWrite = TestDriveInstructorFields & { requestId: string; revision: number }
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

type TestDriveCandidateTemplate = Pick<typeof testDriveV1, 'version' | 'source' | 'headerFields' | 'criteria' | 'candidateChoices'>

export type TestDriveOpenDetail = TestDriveAssignment & { phase: Exclude<TestDrivePhase, 'closed'>; header: TestDriveHeader } & (
  | {
    role: 'candidate'
    template: TestDriveCandidateTemplate
    candidateAssessments: Record<TestDriveCandidatePart, TestDriveCandidateAssessment>
  }
  | {
    role: 'instructor'
    template: TestDriveCandidateTemplate & Pick<typeof testDriveV1, 'instructorChoices' | 'resultChoices'>
    candidateAssessments: Record<TestDriveCandidatePart, TestDriveAssessmentStatus>
    instructorAssessment: TestDriveInstructorAssessment
  }
)

export type TestDriveClosedDocument = {
  documentVersion: 1
  runId: string
  department: TestDriveDepartment
  header: TestDriveHeader
  template: typeof testDriveV1
  candidate: TestDrivePerson
  instructor: Pick<TestDrivePerson, 'id' | 'name'>
  closedAt: string
  closedBy: string
  candidateAssessments: Record<TestDriveCandidatePart, TestDriveCandidateAssessment & { submittedAt: string }>
  instructorAssessment: TestDriveInstructorAssessment & { submittedAt: string; authorId: string; result: TestDriveResultChoice }
}

export type TestDriveClosedDetail = TestDriveAssignment & { phase: 'closed'; document: TestDriveClosedDocument }
export type TestDriveDetail = TestDriveOpenDetail | TestDriveClosedDetail

export function testDriveHeaderValue(document: TestDriveClosedDocument, field: typeof testDriveV1.headerFields[number]['id']) {
  switch (field) {
    case 'candidateName': return document.candidate.name
    case 'candidateEmail': return document.candidate.email
    case 'instructorName': return document.instructor.name
    case 'department': return document.department.name
    default: return document.header[field]
  }
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
