/**
 * The progress event log.
 *
 * THE central design decision of the application. Progress state is a pure fold
 * over an append-only log of events:
 *
 *     progressState = events.reduce(applyEvent, initialState)
 *
 * Two consequences, and they are why everything else in the plan can be deferred
 * safely:
 *
 *  1. The reducer is trivially testable with no DOM and no framework.
 *  2. Every future personalisation feature is a *pure function over this log*.
 *     Sync, undo, history charts, weak-area reports, spaced review, streaks,
 *     "what did I do last Tuesday" — all of them can be written at any time with
 *     no migration, because they read the log rather than a bespoke store.
 *
 * That is the rule to remember: model the events now, write the derivations
 * later.
 *
 * Nothing is stored that is not already derivable. There is deliberately no
 * `completedLessons: Set` field, no "primary roadmap" field, and no separate
 * `learner.goal` event — a second source of truth can always disagree with the
 * log, and `roadmap.enrolled` already *is* a goal declaration.
 */

export type RoadmapId = string
export type ModuleId = string
export type LessonId = string
export type TopicId = string
export type SkillId = string
export type ExerciseId = string
export type QuizId = string
export type LabId = string
export type AssessmentId = string
export type ArtifactId = string

/**
 * Who evaluated an attempt.
 *
 * 'system' means the platform scored it. 'self' means the learner scored their
 * own work against a published rubric — which is a real and necessary thing to
 * record, and not a synonym for a pass. It is weighted lower in job readiness
 * and labelled distinctly everywhere it appears, because the learner is the only
 * user and self-assessment is therefore inherently unverified.
 */
export type EvaluatedBy = 'system' | 'self'

export interface EventBase {
  /**
   * Unique id. This exists so two browser tabs writing concurrently can be
   * merged by union rather than by last-write-wins — without it, one tab
   * silently overwrites the other's events and the learner loses progress with
   * no error. See storage/merge.ts.
   */
  readonly id: string
  readonly at: string
}

export type ProgressEvent =
  | (EventBase & { type: 'lesson.viewed'; lessonId: LessonId })
  | (EventBase & { type: 'lesson.completed'; lessonId: LessonId; source: 'manual' | 'activity' })
  | (EventBase & { type: 'lesson.uncompleted'; lessonId: LessonId })
  | (EventBase & {
      type: 'topic.completed'
      topicId: TopicId
      lessonId: LessonId
      completed: boolean
    })
  | (EventBase & {
      type: 'exercise.attempted'
      exerciseId: ExerciseId
      lessonId: LessonId
      selfChecked: boolean
    })
  | (EventBase & {
      type: 'quiz.attempted'
      quizId: QuizId
      attemptId: string
      score: number
      maxScore: number
      passed: boolean
      evaluatedBy: EvaluatedBy
    })
  | (EventBase & {
      type: 'lab.submitted'
      labId: LabId
      attemptId: string
      attemptNumber: number
      /** What the learner produced. Required for self-assessed labs at M6. */
      payload: string
      feedbackNotes: readonly string[]
      passed: boolean
      evaluatedBy: EvaluatedBy
    })
  | (EventBase & {
      type: 'assessment.attempted'
      assessmentId: AssessmentId
      attemptId: string
      score: number
      maxScore: number
      passed: boolean
      evaluatedBy: EvaluatedBy
    })
  | (EventBase & { type: 'roadmap.enrolled'; roadmapId: RoadmapId })
  | (EventBase & { type: 'roadmap.unenrolled'; roadmapId: RoadmapId })
  | (EventBase & { type: 'bookmark.toggled'; refType: string; refId: string })
  | (EventBase & { type: 'note.saved'; refType: string; refId: string; body: string })
  | (EventBase & {
      type: 'portfolio.artifact.added'
      artifactId: ArtifactId
      roadmapId: RoadmapId
      skills: readonly SkillId[]
    })

export type ProgressEventType = ProgressEvent['type']

/**
 * `Omit` applied distributively across the union.
 *
 * A plain `Omit<ProgressEvent, 'id' | 'at'>` collapses to only the keys every
 * member shares, which silently erases `lessonId`, `roadmapId` and the rest. The
 * conditional type is what keeps each variant intact.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** An event as a caller supplies it: no id, no timestamp. The store adds both. */
export type NewProgressEvent = DistributiveOmit<ProgressEvent, 'id' | 'at'>

export interface CompletionMeta {
  readonly at: string
  readonly source: 'manual' | 'activity'
}

export interface Attempt {
  readonly attemptId: string
  readonly at: string
  readonly score: number
  readonly maxScore: number
  readonly passed: boolean
  readonly evaluatedBy: EvaluatedBy
}

export interface LabAttempt extends Attempt {
  readonly attemptNumber: number
  readonly payload: string
  readonly feedbackNotes: readonly string[]
}

export interface Artifact {
  readonly artifactId: ArtifactId
  readonly roadmapId: RoadmapId
  readonly skills: readonly SkillId[]
  readonly at: string
}

/**
 * Everything derived from the log. This is a CACHE, not a source of truth: it may
 * be deleted and recomputed at any moment, and an architectural invariant test
 * asserts that it always equals the fold. That is what gives migrations exactly
 * one code path instead of five.
 */
export interface DerivedProgress {
  readonly completedLessons: Readonly<Record<LessonId, CompletionMeta>>
  readonly completedTopics: Readonly<Record<TopicId, CompletionMeta>>
  readonly practisedLessons: Readonly<Record<LessonId, string>>
  readonly quizAttempts: Readonly<Record<QuizId, readonly Attempt[]>>
  readonly labAttempts: Readonly<Record<LabId, readonly LabAttempt[]>>
  readonly assessmentAttempts: Readonly<Record<AssessmentId, readonly Attempt[]>>
  readonly enrolledRoadmaps: readonly RoadmapId[]
  readonly bookmarks: readonly { refType: string; refId: string }[]
  readonly notes: readonly { refType: string; refId: string; body: string; at: string }[]
  readonly portfolio: readonly Artifact[]
  readonly lastViewedLesson: LessonId | undefined
  /** lessonId -> most recent view time. Drives "continue learning". */
  readonly viewedAt: Readonly<Record<LessonId, string>>
}

export interface ProgressState {
  /**
   * Bumped when the shape changes, so an old export can be migrated rather than
   * silently misread. Starts at 1. The export validator checks it.
   */
  readonly version: number
  readonly events: readonly ProgressEvent[]
  readonly derived: DerivedProgress
}

export const PROGRESS_STATE_VERSION = 1
