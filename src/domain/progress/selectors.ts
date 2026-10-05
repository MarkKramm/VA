import type { Attempt, LessonId, ModuleId, ProgressState, RoadmapId, SkillId } from './types.ts'

/**
 * Progress selectors: pure reads over derived state.
 *
 * Every function here takes plain data. Nothing in this file imports the content
 * registry, React, or the app layer — that is what keeps `src/domain/` testable
 * with no DOM and reusable verbatim if progress ever moves to a server.
 * Composition with content happens in `src/app/hooks/` at M3.
 */

export const isLessonComplete = (state: ProgressState, lessonId: LessonId): boolean =>
  Boolean(state.derived.completedLessons[lessonId])

/** True once the learner has *done* something with the lesson, not just read it. */
export const isLessonPractised = (state: ProgressState, lessonId: LessonId): boolean =>
  Boolean(state.derived.practisedLessons[lessonId])

export const completedLessonCount = (
  state: ProgressState,
  lessonIds: readonly LessonId[],
): number => lessonIds.filter((id) => isLessonComplete(state, id)).length

/**
 * How many of these lessons the learner has PRACTISED (M3).
 *
 * Deliberately separate from `completedLessonCount`: reading a lesson and doing
 * its practice are different evidence (D5/D6), and the dashboard shows both so a
 * learner who has only read cannot mistake it for having done the work.
 */
export const practisedLessonCount = (
  state: ProgressState,
  lessonIds: readonly LessonId[],
): number => lessonIds.filter((id) => isLessonPractised(state, id)).length

/**
 * Module progress as a 0–1 ratio.
 *
 * `allLessonIds` is passed in rather than looked up, because the domain layer
 * does not know what a module is. The caller — a hook, at M3 — resolves the ids
 * from the registry and hands them over.
 */
export const moduleProgress = (state: ProgressState, allLessonIds: readonly LessonId[]): number => {
  if (allLessonIds.length === 0) return 0
  return completedLessonCount(state, allLessonIds) / allLessonIds.length
}

export interface StageProgressInput {
  readonly moduleId: ModuleId
  /** All lesson ids in the stage, in order. */
  readonly lessonIds: readonly LessonId[]
}

export interface RoadmapProgressInput {
  readonly stages: readonly StageProgressInput[]
}

/**
 * Roadmap progress is a mean over stages, not over lessons.
 *
 * A roadmap that ends with a short assessment stage must not be able to reach
 * 90% while the learner has done none of the actual specialisation work, which is
 * exactly what a flat lesson-weighted average would allow. Stages are equal
 * because the weights are a content decision and an implicit weighting is
 * harder to notice and to change.
 */
export const roadmapProgress = (state: ProgressState, input: RoadmapProgressInput): number => {
  const usable = input.stages.filter((stage) => stage.lessonIds.length > 0)
  if (usable.length === 0) return 0
  const total = usable.reduce((sum, stage) => sum + moduleProgress(state, stage.lessonIds), 0)
  return total / usable.length
}

/** Default progression policy: a stage unlocks at 80% of itself. */
export const DEFAULT_STAGE_THRESHOLD = 0.8

export const isStageComplete = (
  state: ProgressState,
  stage: StageProgressInput,
  threshold = DEFAULT_STAGE_THRESHOLD,
): boolean => moduleProgress(state, stage.lessonIds) >= threshold

/**
 * Best score plus a recency-weighted mean of the most recent attempts.
 *
 * Best-so-far is what a learner cares about ("can I pass this?"). The
 * recency-weighted mean is what stops a single lucky attempt months ago from
 * still reading as mastery.
 */
export interface MasterySummary {
  readonly score: number
  /** How much evidence there is. Always shown next to the score. */
  readonly confidence: number
  readonly best: number
  readonly recentMean: number
  readonly attempts: number
}

export const summariseAttempts = (attempts: readonly Attempt[]): MasterySummary => {
  if (attempts.length === 0) {
    return { score: 0, confidence: 0, best: 0, recentMean: 0, attempts: 0 }
  }
  const ratios = attempts.map((attempt) =>
    attempt.maxScore === 0 ? 0 : attempt.score / attempt.maxScore,
  )
  const best = Math.max(...ratios)
  const recent = [...ratios].reverse().slice(0, 3)
  const recentMean = recent.reduce((sum, value) => sum + value, 0) / recent.length
  return {
    score: best,
    // Confidence grows with evidence and saturates: a learner is not meaningfully
    // more confident after 20 attempts than after 5.
    confidence: Math.min(1, attempts.length / 5),
    best,
    recentMean,
    attempts: attempts.length,
  }
}

/**
 * Mastery is stored as a number but NEVER rendered as one.
 *
 * A decimal like "0.734" implies a precision the underlying data does not have,
 * which is dishonest on a platform whose credibility depends on not overstating
 * what a learner knows. The UI shows the level, plus the evidence behind it.
 */
export const MASTERY_LEVELS = ['not-started', 'aware', 'able', 'proficient', 'mastered'] as const
export type MasteryLevel = (typeof MASTERY_LEVELS)[number]

const MASTERY_THRESHOLDS: readonly { level: MasteryLevel; min: number }[] = [
  { level: 'not-started', min: 0 },
  { level: 'aware', min: 0.01 },
  { level: 'able', min: 0.4 },
  { level: 'proficient', min: 0.7 },
  { level: 'mastered', min: 0.9 },
]

export const masteryLevel = (score: number): MasteryLevel => {
  let result: MasteryLevel = 'not-started'
  for (const threshold of MASTERY_THRESHOLDS) {
    if (score >= threshold.min) result = threshold.level
  }
  return result
}

/** The most recently viewed lesson that is not yet complete. Drives "continue learning". */
export const continueLesson = (state: ProgressState): LessonId | undefined => {
  const viewed = Object.entries(state.derived.viewedAt).sort((a, b) => b[1].localeCompare(a[1]))
  return viewed.find(([lessonId]) => !isLessonComplete(state, lessonId))?.[0]
}

/** Bookmarked ids of a given type, for the learner's saved list. */
export const bookmarkedIds = (state: ProgressState, refType: string): string[] =>
  state.derived.bookmarks.filter((b) => b.refType === refType).map((b) => b.refId)

/** Skills the learner has produced portfolio evidence for. Feeds job readiness at M7. */
export const evidencedSkills = (state: ProgressState): SkillId[] => {
  const skills = new Set<SkillId>()
  for (const artifact of state.derived.portfolio) {
    for (const skillId of artifact.skills) skills.add(skillId)
  }
  return [...skills]
}

export const isRoadmapEnrolled = (state: ProgressState, roadmapId: RoadmapId): boolean =>
  state.derived.enrolledRoadmaps.includes(roadmapId)

/**
 * The practice activities the learner has actually attempted, by id (M5).
 *
 * `practisedLessons` records WHICH LESSON was practised, not which exercise, so
 * "did they attempt one of these specific activities?" cannot be answered from
 * the derived cache alone. This reads the log — the source of truth — rather than
 * widening the cache for one caller.
 *
 * Exercises and labs count, because `docs/DATA_MODEL.md` defines both as
 * PRACTICE. A quiz does not: a quiz is a scored check, and letting it satisfy a
 * practice requirement would collapse the two tiers the evidence model exists to
 * keep apart.
 */
export const attemptedActivityIds = (state: ProgressState): ReadonlySet<string> => {
  const ids = new Set<string>()
  for (const event of state.events) {
    if (event.type === 'exercise.attempted') ids.add(event.exerciseId)
    if (event.type === 'lab.submitted') ids.add(event.labId)
  }
  return ids
}
