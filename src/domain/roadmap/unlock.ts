import { isLessonComplete, isLessonPractised } from '../progress/selectors.ts'
import type { LessonId, ProgressState } from '../progress/types.ts'

/**
 * Gating policy.
 *
 * The settled decision (Q6) is SOFT GATING. Locked-but-clickable content with a
 * stated reason, because walls cause abandonment on a free platform and nothing
 * in the brief asks for them.
 *
 * There is exactly ONE hard lock, and it is the case Q6 explicitly carved out:
 * claiming a *demonstrated* outcome. An assessment cannot be passed until its
 * lessons are completed and practised, because a result recorded before the
 * teaching happened is meaningless — and would let a learner record a "job ready"
 * score on the strength of checkboxes alone. That is the single most damaging
 * thing this platform could do, so it is the single place a lock is justified.
 *
 * The policies are named functions rather than conditionals so a future change is
 * a decision in DECISIONS.md rather than a quiet edit.
 */

export interface PrerequisiteInput {
  readonly id: LessonId
  readonly reason: string
}

export type LockState =
  | { readonly state: 'available' }
  | { readonly state: 'advisory'; readonly unmet: readonly PrerequisiteInput[] }

/** Soft gating. Everything is reachable; unmet prerequisites are explained. */
export const lessonAccess = (
  state: ProgressState,
  prerequisites: readonly PrerequisiteInput[],
): LockState => {
  const unmet = prerequisites.filter((prerequisite) => !isLessonComplete(state, prerequisite.id))
  return unmet.length === 0 ? { state: 'available' } : { state: 'advisory', unmet }
}

export interface AssessmentGateInput {
  readonly requiredLessons: readonly LessonId[]
  /**
   * Which practice activities count as "practised" for a given lesson. Supplied
   * by the caller because resolving a lesson's activities is a content concern,
   * and the domain layer deliberately knows nothing about content.
   */
  readonly activitiesOfLesson: Readonly<Record<LessonId, readonly string[]>>
  /** Whether the learner has attempted at least one of those activities. */
  readonly attemptedActivities: ReadonlySet<string>
}

export interface GateCheck {
  readonly eligible: boolean
  readonly reasons: readonly string[]
}

/**
 * The one hard lock. Returns *why*, not just a boolean, so the UI can explain
 * itself rather than presenting a dead end.
 */
export const assessmentEligibility = (
  state: ProgressState,
  input: AssessmentGateInput,
): GateCheck => {
  const reasons: string[] = []

  for (const lessonId of input.requiredLessons) {
    if (!isLessonComplete(state, lessonId)) {
      reasons.push(`Complete the lesson "${lessonId}" first.`)
      continue
    }
    const activities = input.activitiesOfLesson[lessonId] ?? []
    /*
     * A lesson with nothing to practise cannot be required to practise (M5).
     *
     * The practice requirement is "do something with what you read", and a
     * lesson whose content declares no activity has nothing to do — `[].some()`
     * is false, so without this the gate would be unsatisfiable and the
     * assessment unreachable forever. Completion is still required above, so the
     * gate stays honest: it just does not demand the impossible.
     */
    if (activities.length === 0) continue
    const practised = activities.some((activityId) => input.attemptedActivities.has(activityId))
    if (!practised) {
      reasons.push(
        `Practise at least one activity for "${lessonId}" — reading is not the same as doing.`,
      )
    }
  }

  return { eligible: reasons.length === 0, reasons }
}

/** True once the learner has both completed and practised a lesson. */
export const hasDemonstrated = (state: ProgressState, lessonId: LessonId): boolean =>
  isLessonComplete(state, lessonId) && isLessonPractised(state, lessonId)
