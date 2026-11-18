import {
  applyBaselineChanges, baselineOf, emptyAnswer, firstDayCanDriveAfter, validAnswerContent, validReasonDrafts,
  validateAnswerChanges, validateAnswerSet, validateSavedBaseline, validRecordedAnswer,
} from './baseline.ts'
import type { Answer, AnswerDraft, BaselineChanges } from './baseline.ts'
import { checkDayFields, dayDraft } from './day-draft.ts'
import { driverAfterOf, validateSavedDriverDays } from './driver-day.ts'
import { dailyFollowUp, validateSavedPlan } from './follow-up.ts'
import { reasonRequirement, validateReason } from './reason.ts'
import { AppError, dayLocks, findDay, hasText, isConfirmationTime, isId, replaceDay, runDays, validateContent, validateSavedRun } from './run.ts'
import type { Actor, Day, MentorConfirmation, Run, RunReceipt } from './run.ts'

type MentorActor = { role: 'fadder'; id: string; name: string }
type MentorAnswer = Answer & { actor?: MentorActor }
type CriterionMap<T> = Partial<Record<string, T>>
type MentorComment = { text: string; actor: MentorActor }
export type ReviewTarget = { answerId: string; answerRevision: number }
type ReviewChoice = { decision: 'accepted'; rejectionComment?: never } | { decision: 'rejected'; rejectionComment: string }
export type ReviewInput = ReviewTarget & ReviewChoice
export type RelevanceReview = ReviewInput & { actor: MentorActor }
export type MentorDay = AnswerDraft<MentorAnswer> & {
  comments: CriterionMap<MentorComment>
  rejectionDrafts: CriterionMap<string>
  reviews: CriterionMap<RelevanceReview>
}
type MentorCommand = { commandId: string; runId: string; actor: Actor; expectedRevision: number }
export type MentorDayChanges = {
  answers?: BaselineChanges
  comments?: Record<string, string>
  rejectionDrafts?: Record<string, string>
}
export type SaveMentorDayCommand = MentorCommand & { payload: { dayId: string; changes: MentorDayChanges } }
export type ReviewRelevanceCommand = MentorCommand & {
  payload: ReviewInput & { dayId: string; criterionId: string }
}
export type ConfirmMentorDayCommand = MentorCommand & { payload: { dayId: string; confirmedAt: string } }
export type MentorDayReceipt = RunReceipt & { confirmation: MentorConfirmation }

export type RelevanceStatus =
  | { state: 'not_applicable'; previouslyReviewed: boolean }
  | { state: 'pending' | 'outdated'; target: ReviewTarget; reason: string }
  | { state: 'accepted' | 'rejected'; target: ReviewTarget; reason: string; review: RelevanceReview }

export function mentorDayOf(run: Run, day: Day): MentorDay {
  return day.mentorDay ?? {
    answers: run.content.criteria.map(({ id }) => emptyAnswer(day.id, id, 'mentor')),
    reasonDrafts: {}, comments: {}, rejectionDrafts: {}, reviews: {},
  }
}

export function sameReviewTarget(a: ReviewTarget, b: ReviewTarget) {
  return a.answerId === b.answerId && a.answerRevision === b.answerRevision
}

export function driverRelevance(run: Run, day: Day): Record<string, RelevanceStatus> {
  const after = firstDayCanDriveAfter(run) ? driverAfterOf(run, day).answers : []
  const reviews = day.mentorDay?.reviews
  const validAnswer = day.driverConfirmation ? validRecordedAnswer : validAnswerContent
  return Object.fromEntries(run.content.criteria.map(({ id }): [string, RelevanceStatus] => {
    const answer = after.find(item => item.criterionId === id)
    const review = reviews?.[id]
    if (answer?.value !== 'not_relevant' || !validAnswer(answer) || answer.reason === null) {
      return [id, { state: 'not_applicable', previouslyReviewed: Boolean(review) }]
    }
    const target = { answerId: answer.id, answerRevision: answer.answerRevision }
    if (!review || !validReview(review, Boolean(day.mentorConfirmation)) || !sameReviewTarget(review, target)) {
      return [id, { state: review ? 'outdated' : 'pending', target, reason: answer.reason }]
    }
    return [id, { state: review.decision, target, reason: answer.reason, review }]
  }))
}

export function mentorAssessmentIssues(
  answers: readonly Answer[], relevance: Record<string, RelevanceStatus>, reasonDrafts: CriterionMap<string> = {},
) {
  return answers.flatMap(({ criterionId, ...answer }) => {
    const issues: { criterionId: string; field: 'answer' | 'reason' | 'review'; message: string }[] = []
    const draft = reasonDrafts[criterionId]
    if (!validAnswerContent(answer) || (answer.value === null && draft && !validateReason(draft).valid)) {
      issues.push({ criterionId, field: 'reason', message: reasonRequirement })
    } else if (answer.value === null) {
      issues.push({ criterionId, field: 'answer', message: 'Velg et faddersvar.' })
    }
    const status = relevance[criterionId]
    if (status.state === 'pending') {
      issues.push({ criterionId, field: 'review', message: 'Behandle sjåførens Ikke relevant-valg.' })
    } else if (status.state === 'outdated') {
      issues.push({ criterionId, field: 'review', message: 'Behandle sjåførens endrede Ikke relevant-valg på nytt.' })
    }
    return issues
  })
}

export function driverReadyForMentorDay(run: Run, day: Day) {
  return firstDayCanDriveAfter(run) && Boolean(day.driverConfirmation)
}

export function checkMentorDay(run: Run, day: Day) {
  validateContent(run.content)
  const before = baselineOf(run).answers
  const after = driverAfterOf(run, day).answers
  const draft = mentorDayOf(run, day)
  validateAnswerSet(run, before, 'before', run.id)
  validateAnswerSet(run, after, 'driver_after', day.id)
  validateAnswerSet(run, draft.answers, 'mentor', day.id)
  const baselineMissing = !firstDayCanDriveAfter(run) || before.some(answer => !validRecordedAnswer(answer))
  const driverAfterMissing = !day.driverConfirmation || after.some(answer => !validRecordedAnswer(answer))
  const fields = checkDayFields(dayDraft(run, day), 'day-lock')
  const assessment = mentorAssessmentIssues(draft.answers, driverRelevance(run, day), draft.reasonDrafts)
  const followUpMissing = !dailyFollowUp(run, day)
  return {
    baselineMissing, driverAfterMissing, fields, assessment, followUpMissing,
    complete: !baselineMissing && !driverAfterMissing && !Object.keys(fields).length && !assessment.length && !followUpMissing,
  }
}

function validateMentorAnswers(run: Run, day: Day, draft: MentorDay) {
  validateAnswerSet(run, draft.answers, 'mentor', day.id)
  const validAnswer = day.mentorConfirmation ? validRecordedAnswer : validAnswerContent
  if (draft.answers.some((answer, index) => answer.criterionId !== run.content.criteria[index].id
    || !validAnswer(answer) || (answer.value !== null && !isMentorActor(answer.actor))
    || (answer.actor !== undefined && !isMentorActor(answer.actor)))
    || !validReasonDrafts(draft.answers, draft.reasonDrafts)) throw new AppError('storage_read')
}

function isMentorActor(actor: MentorActor | undefined) {
  return isId(actor?.id) && actor.role === 'fadder' && hasText(actor.name)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function validReview(review: ReviewInput, locked = false) {
  if (!isId(review?.answerId) || !Number.isSafeInteger(review.answerRevision) || review.answerRevision < 1) return false
  if (review.decision === 'accepted') return review.rejectionComment === undefined
  const validAnswer = locked ? validRecordedAnswer : validAnswerContent
  return review.decision === 'rejected' && validAnswer({ value: 'not_relevant', reason: review.rejectionComment })
}

export function validateSavedMentorDays(run: Run) {
  for (const day of runDays(run)) {
    if (day.mentorDay === undefined) {
      if (day.mentorConfirmation) throw new AppError('storage_read')
      continue
    }
    const draft = day.mentorDay
    if (!draft || !isRecord(draft.comments) || !isRecord(draft.reviews)) throw new AppError('storage_read')
    validateMentorAnswers(run, day, draft)
    if (!validReasonDrafts(draft.answers, draft.rejectionDrafts)) throw new AppError('storage_read')
    const ids = new Set(draft.answers.map(answer => answer.criterionId))
    for (const [id, comment] of Object.entries(draft.comments)) {
      if (!ids.has(id) || typeof comment?.text !== 'string' || !isMentorActor(comment.actor)) throw new AppError('storage_read')
    }
    for (const [id, review] of Object.entries(draft.reviews)) {
      const answer = day.driverAfterAnswers?.find(item => item.criterionId === id)
      if (!answer || !review || !validReview(review, Boolean(day.mentorConfirmation)) || !isMentorActor(review.actor)
        || review.answerId !== answer.id || review.answerRevision > answer.answerRevision
        || (review.answerRevision === answer.answerRevision && answer.value !== 'not_relevant')) {
        throw new AppError('storage_read')
      }
    }
    if (day.mentorConfirmation && (!driverReadyForMentorDay(run, day)
      || !dailyFollowUp(run, day) || Object.keys(checkDayFields(dayDraft(run, day), 'day-lock')).length
      || Object.values(driverRelevance(run, day)).some(({ state }) => state === 'pending' || state === 'outdated'))) {
      throw new AppError('storage_read')
    }
  }
}

function validateMentorCommand(command: MentorCommand, dayId: unknown) {
  const ids = [command.commandId, command.runId, command.actor?.id, dayId]
  if (!ids.every(isId) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length
    || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1) throw new AppError('invalid_command')
  if (command.actor.role !== 'fadder') throw new AppError('wrong_role')
}

export function validateSaveMentorDay(command: SaveMentorDayCommand) {
  validateMentorCommand(command, command.payload?.dayId)
  const { changes } = command.payload
  if (!isRecord(changes) || !Object.keys(changes).length
    || Object.entries(changes).some(([key, value]) => !['answers', 'comments', 'rejectionDrafts'].includes(key) || value === undefined)) {
    throw new AppError('invalid_command')
  }
  if (changes.answers !== undefined) validateAnswerChanges(changes.answers)
  for (const values of [changes.comments, changes.rejectionDrafts]) {
    if (values !== undefined && (!isRecord(values) || !Object.keys(values).length
      || Object.values(values).some(value => typeof value !== 'string'))) throw new AppError('invalid_command')
  }
}

export function validateReviewRelevance(command: ReviewRelevanceCommand) {
  validateMentorCommand(command, command.payload?.dayId)
  if (typeof command.payload.criterionId !== 'string' || !validReview(command.payload)) throw new AppError('validation')
}

export function validateConfirmMentorDayCommand(command: ConfirmMentorDayCommand) {
  validateMentorCommand(command, command.payload?.dayId)
  if (!isConfirmationTime(command.payload.confirmedAt)
    || Object.keys(command.payload).some(key => key !== 'dayId' && key !== 'confirmedAt')) throw new AppError('invalid_command')
}

function writableMentorDay(run: Run, command: SaveMentorDayCommand | ReviewRelevanceCommand | ConfirmMentorDayCommand) {
  if (command.runId !== run.id) throw new AppError('run_missing')
  if (command.expectedRevision !== run.revision) throw new AppError('stale')
  const day = findDay(run, command.payload.dayId)
  if (!day) throw new AppError('day_missing')
  if (dayLocks(run, day).dayLocked) throw new AppError('locked')
  if (run.revision === Number.MAX_SAFE_INTEGER) throw new AppError('storage_write')
  if (day.driverId !== run.driver.id) throw new AppError('storage_read')
  validateContent(run.content)
  const draft = mentorDayOf(run, day)
  validateMentorAnswers(run, day, draft)
  const actor: MentorActor = { id: command.actor.id, role: 'fadder', name: day.mentorName }
  return { day, draft, actor }
}

export function confirmMentorDay(run: Run, command: ConfirmMentorDayCommand): Run {
  validateConfirmMentorDayCommand(command)
  const { day, draft, actor } = writableMentorDay(run, command)
  validateSavedRun(run)
  validateSavedBaseline(run)
  validateSavedPlan(run)
  validateSavedDriverDays(run)
  validateSavedMentorDays(run)
  if (!checkMentorDay(run, day).complete) throw new AppError('validation')
  return replaceDay(run, { ...day, mentorDay: draft, mentorConfirmation: {
    actor, date: day.date, part: 'mentor_day', confirmedAt: command.payload.confirmedAt,
  } })
}

export function updateMentorDay(run: Run, command: SaveMentorDayCommand): Run {
  validateSaveMentorDay(command)
  const { day, draft, actor } = writableMentorDay(run, command)
  const changes = command.payload.changes
  const ids = new Set(draft.answers.map(answer => answer.criterionId))
  for (const fields of Object.values(changes)) {
    if (Object.keys(fields).some(id => !ids.has(id))) throw new AppError('invalid_command')
  }
  return replaceDay(run, { ...day, mentorDay: { ...draft, ...applyMentorChanges(draft, changes, actor) } })
}

export function applyMentorChanges(
  draft: Omit<MentorDay, 'reviews'>, { answers, comments, rejectionDrafts }: MentorDayChanges, actor: MentorActor,
) {
  const applied = answers ? applyBaselineChanges(draft, answers) : draft
  const savedComments = { ...draft.comments }
  for (const [id, text] of Object.entries(comments ?? {})) {
    if (text === '') delete savedComments[id]
    else if (text !== savedComments[id]?.text) savedComments[id] = { text, actor }
  }
  const savedRejections = { ...draft.rejectionDrafts, ...rejectionDrafts }
  return {
    answers: applied.answers.map((answer, index) => answer !== draft.answers[index] ? { ...answer, actor } : answer),
    reasonDrafts: applied.reasonDrafts, comments: savedComments, rejectionDrafts: savedRejections,
  }
}

export function reviewRelevance(run: Run, command: ReviewRelevanceCommand): Run {
  validateReviewRelevance(command)
  const { day, draft, actor } = writableMentorDay(run, command)
  const { criterionId, answerId, answerRevision, decision, rejectionComment } = command.payload
  const target = { answerId, answerRevision }
  const subjects = driverRelevance(run, day)
  if (!Object.hasOwn(subjects, criterionId)) throw new AppError('invalid_command')
  const subject = subjects[criterionId]
  if (subject.state === 'not_applicable' || !sameReviewTarget(subject.target, target)) throw new AppError('stale')
  const review: RelevanceReview = decision === 'accepted'
    ? { ...target, decision, actor } : { ...target, decision, rejectionComment, actor }
  const rejectionDrafts = { ...draft.rejectionDrafts }
  if (review.decision === 'rejected') delete rejectionDrafts[criterionId]
  return replaceDay(run, { ...day, mentorDay: {
    ...draft, reviews: { ...draft.reviews, [criterionId]: review }, rejectionDrafts,
  } })
}
