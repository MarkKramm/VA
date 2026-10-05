import { assessmentContext, type AssessmentCriterionView } from '@/app/content.ts'
import { attemptedActivityIds } from '@domain/progress/selectors.ts'
import { assessmentEligibility, type GateCheck } from '@domain/roadmap/unlock.ts'
import type { EvaluatedBy, ProgressState } from '@domain/progress/types.ts'

/**
 * PRACTICAL ASSESSMENT EVALUATION (M5).
 *
 * THE HONEST PART
 *
 * The platform has no automated evaluator for a practical task, and
 * `docs/ARCHITECTURE.md` lists file upload as a deliberate non-feature — there is
 * nowhere to put a learner's work. So an assessment is SELF-EVALUATED: the
 * learner marks each rubric line they met, and the result is recorded with
 * `evaluatedBy: 'self'`. That field is the whole reason this can be shipped
 * honestly: the domain already distinguishes a self-report from a marked result,
 * the UI labels it, and job readiness weights it lower.
 *
 * NOTHING HERE PRETENDS OTHERWISE. There is no score the platform "computed" from
 * inspecting work, because it inspected nothing. The arithmetic below is only
 * "how many rubric lines did you say you met".
 *
 * WHY THE RUBRIC IS PUBLIC
 *
 * A quiz withholds its answers before submission; an assessment publishes its
 * rubric, because a learner cannot self-assess against a standard they cannot
 * see. That is a deliberate inversion, not an inconsistency — see
 * `assessmentContext` in `src/app/content.ts`.
 *
 * PASSING
 *
 * Every criterion must be met. A practical deliverable is a yes/no artefact, not
 * a percentage: "I organised the files but never named them consistently" is not
 * 80% of the task, it is an unfinished one. `CRITERIA_REQUIRED_TO_PASS` is a
 * constant rather than a content field for the same reason the quiz's pass mark
 * is (`DECISIONS.md` D32) — a per-assessment threshold would be a schema change
 * and its own decision.
 */

/** Every rubric line, or it is not done. See the note above. */
export const CRITERIA_REQUIRED_TO_PASS = 1

export interface AssessmentResult {
  readonly assessmentId: string
  /** Criterion ids the learner marked as met, in the assessment's declared order. */
  readonly met: readonly string[]
  /** Criterion ids they did not. What they still have to do. */
  readonly unmet: readonly string[]
  /** `met.length`. The learner's own count, not the platform's judgement. */
  readonly score: number
  /** `criteria.length`. */
  readonly maxScore: number
  readonly percentage: number
  readonly passed: boolean
  /**
   * Always `'self'` at M5. Typed as `EvaluatedBy` rather than narrowed to the
   * literal so that a future automated evaluator is a change to this function
   * rather than a change to every consumer.
   */
  readonly evaluatedBy: EvaluatedBy
}

/**
 * Turn a self-evaluation into a result. Pure and deterministic.
 *
 * Criterion ids the assessment does not declare are IGNORED rather than counted,
 * so a stale or hand-edited submission cannot inflate a score, and the result's
 * `met`/`unmet` always partition the assessment's own rubric exactly.
 */
export const scoreSelfAssessment = (
  assessmentId: string,
  criteria: readonly AssessmentCriterionView[],
  metCriterionIds: readonly string[],
): AssessmentResult => {
  const met = new Set(metCriterionIds)
  const metIds = criteria.filter((criterion) => met.has(criterion.id)).map((c) => c.id)
  const unmetIds = criteria.filter((criterion) => !met.has(criterion.id)).map((c) => c.id)
  const maxScore = criteria.length
  const score = metIds.length

  return {
    assessmentId,
    met: metIds,
    unmet: unmetIds,
    score,
    maxScore,
    percentage: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
    passed: maxScore > 0 && score / maxScore >= CRITERIA_REQUIRED_TO_PASS,
    evaluatedBy: 'self',
  }
}

/**
 * Whether the learner may attempt an assessment, and if not, why.
 *
 * Delegates to `assessmentEligibility` — the platform's one hard lock, and the
 * reason `docs/DATA_MODEL.md` calls an assessment composite. It is the only place
 * in the product that refuses rather than advises, so it returns the reasons and
 * the UI shows them instead of a dead end.
 *
 * The `activitiesOfLesson` map is built here because "which exercises does this
 * lesson declare" is a content question the domain deliberately cannot answer.
 */
export const assessmentGate = (state: ProgressState, assessmentId: string): GateCheck => {
  const context = assessmentContext(assessmentId)
  if (!context) {
    return { eligible: false, reasons: [`"${assessmentId}" is not part of the curriculum.`] }
  }

  const activitiesOfLesson: Record<string, readonly string[]> = {}
  for (const prerequisite of context.prerequisites) {
    activitiesOfLesson[prerequisite.lesson.id] = prerequisite.exerciseIds
  }

  return assessmentEligibility(state, {
    requiredLessons: context.prerequisites.map((prerequisite) => prerequisite.lesson.id),
    activitiesOfLesson,
    attemptedActivities: attemptedActivityIds(state),
  })
}
