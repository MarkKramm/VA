import { beforeEach, describe, expect, it } from 'vitest'
import {
  continueLearning,
  curriculumProgress,
  lessonProgressFor,
  recentlyCompleted,
  roadmapLessonProgress,
} from '../composition.ts'
import { createInitialState, foldEvents } from '@domain/progress/reducer.ts'
import { completed, practise, resetEventCounter, viewed } from '@fixtures/progress.ts'

/**
 * THE PROGRESS SEAM (M3).
 *
 * `composition.ts` joins the learner's state to the real curriculum, so these
 * tests run against the REAL content: 4 lessons, 2 roadmaps, both containing the
 * same 4 lessons. That matters — a composition that resolved the wrong lessons
 * would look fine against a fixture written to match it.
 */

const LESSON = 'files-and-folders'
const OTHER_LESSON = 'browser-basics'

beforeEach(() => resetEventCounter())

describe('curriculumProgress', () => {
  it('reports nothing complete for a fresh learner', () => {
    const progress = curriculumProgress(createInitialState())
    expect(progress.completed).toBe(0)
    expect(progress.practisedLessons).toBe(0)
    expect(progress.total).toBe(4)
    expect(progress.ratio).toBe(0)
  })

  it('counts completed lessons over the curriculum', () => {
    const state = foldEvents([completed(LESSON), completed(OTHER_LESSON)])
    const progress = curriculumProgress(state)
    expect(progress.completed).toBe(2)
    expect(progress.total).toBe(4)
    expect(progress.ratio).toBe(0.5)
  })

  it('counts practised lessons separately from completed ones', () => {
    // Reading and doing are different evidence (D5/D6), so the two numbers are
    // independent — a lesson can be practised without being marked complete.
    const state = foldEvents([completed(LESSON), practise(OTHER_LESSON)])
    const progress = curriculumProgress(state)
    expect(progress.completed).toBe(1)
    expect(progress.practisedLessons).toBe(1)
  })
})

describe('lessonProgressFor', () => {
  it('reports completion and practice independently', () => {
    const state = foldEvents([completed(LESSON), practise(LESSON)])
    expect(lessonProgressFor(state, LESSON)).toEqual({ complete: true, practised: true })
    expect(lessonProgressFor(state, OTHER_LESSON)).toEqual({ complete: false, practised: false })
  })
})

describe('roadmapLessonProgress', () => {
  it('counts completed lessons within a real roadmap', () => {
    const state = foldEvents([completed(LESSON)])
    const progress = roadmapLessonProgress(state, 'beginner-va')
    expect(progress?.total).toBe(4)
    expect(progress?.completed).toBe(1)
    expect(progress?.ratio).toBe(0.25)
  })

  it('returns undefined for an unknown roadmap rather than throwing', () => {
    expect(roadmapLessonProgress(createInitialState(), 'no-such-roadmap')).toBeUndefined()
  })
})

describe('continueLearning', () => {
  it('is undefined when nothing has been viewed', () => {
    expect(continueLearning(createInitialState())).toBeUndefined()
  })

  it('returns the most recently viewed incomplete lesson', () => {
    const state = foldEvents([viewed(LESSON, '2026-10-01T09:00:00.000Z')])
    expect(continueLearning(state)?.id).toBe(LESSON)
  })

  it('skips a lesson that has been completed', () => {
    const state = foldEvents([
      viewed(LESSON, '2026-10-01T09:00:00.000Z'),
      completed(LESSON, '2026-10-01T09:05:00.000Z'),
    ])
    expect(continueLearning(state)).toBeUndefined()
  })
})

describe('recentlyCompleted', () => {
  it('returns completions newest first, resolved to lessons', () => {
    const state = foldEvents([
      completed(LESSON, '2026-10-01T09:00:00.000Z'),
      completed(OTHER_LESSON, '2026-10-01T11:00:00.000Z'),
    ])
    expect(recentlyCompleted(state).map((lesson) => lesson.id)).toEqual([OTHER_LESSON, LESSON])
  })
})
