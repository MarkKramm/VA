import { allLessons, findLesson, findRoadmap, lessonsInRoadmap } from '@/app/content.ts'
import {
  completedLessonCount,
  continueLesson,
  isLessonComplete,
  isLessonPractised,
  practisedLessonCount,
} from '@domain/progress/selectors.ts'
import type { ProgressState } from '@domain/progress/types.ts'
import type { Lesson } from '@/content/schemas/index.ts'

/**
 * The progress seam (M3).
 *
 * This is to progress what `src/app/content.ts` is to content: the one place the
 * curriculum and the learner's state are JOINED, so no feature has to reach into
 * the registry or re-implement a calculation. Every function here is a pure
 * function of a `ProgressState`, and the maths itself stays in `src/domain/` —
 * this file only supplies the content side (which lessons, which modules, which
 * roadmap) that the domain deliberately does not know.
 */

export interface LessonProgress {
  /** The learner explicitly marked the lesson complete. */
  readonly complete: boolean
  /** The learner recorded at least one exercise attempt for the lesson. */
  readonly practised: boolean
}

export const lessonProgressFor = (state: ProgressState, lessonId: string): LessonProgress => ({
  complete: isLessonComplete(state, lessonId),
  practised: isLessonPractised(state, lessonId),
})

export interface ProgressRatio {
  readonly completed: number
  readonly total: number
  /** `completed / total`, or 0 when there is nothing to complete. */
  readonly ratio: number
}

const ratio = (completed: number, total: number): number => (total === 0 ? 0 : completed / total)

export interface CurriculumProgress extends ProgressRatio {
  readonly practisedLessons: number
}

/** Overall progress across every lesson in the curriculum. */
export const curriculumProgress = (state: ProgressState): CurriculumProgress => {
  const lessonIds = allLessons().map((lesson) => lesson.id)
  const completed = completedLessonCount(state, lessonIds)
  return {
    completed,
    practisedLessons: practisedLessonCount(state, lessonIds),
    total: lessonIds.length,
    ratio: ratio(completed, lessonIds.length),
  }
}

/**
 * A roadmap's progress as completed lessons over its lessons, or `undefined` for
 * an unknown id.
 *
 * WHY THIS IS A COUNT AND NOT THE DOMAIN'S `roadmapProgress`
 *
 * The domain's `roadmapProgress` is a mean over STAGES, and that is deliberate:
 * it stops a short introductory stage from unlocking an assessment (D5). But a
 * learner reading "2 of 4 lessons complete" must be able to count the two, so the
 * number a learner is shown is the literal count. The stage-mean remains the
 * gating policy and is untouched; this is the progress statement. See
 * `DECISIONS.md` D27.
 */
export const roadmapLessonProgress = (
  state: ProgressState,
  roadmapId: string,
): ProgressRatio | undefined => {
  if (!findRoadmap(roadmapId)) return undefined
  const lessons = lessonsInRoadmap(roadmapId)
  const completed = lessons.filter((lesson) => isLessonComplete(state, lesson.id)).length
  return { completed, total: lessons.length, ratio: ratio(completed, lessons.length) }
}

/**
 * The lesson to resume: the most recently viewed lesson that is not complete.
 *
 * `undefined` when nothing has been viewed, which is the honest state for a
 * brand-new learner rather than a fabricated "start here".
 */
export const continueLearning = (state: ProgressState): Lesson | undefined => {
  const lessonId = continueLesson(state)
  return lessonId ? findLesson(lessonId)?.lesson : undefined
}

/** The most recently completed lessons, newest first. */
export const recentlyCompleted = (state: ProgressState, limit = 3): readonly Lesson[] =>
  Object.entries(state.derived.completedLessons)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, limit)
    .flatMap(([lessonId]) => {
      const found = findLesson(lessonId)
      return found ? [found.lesson] : []
    })
