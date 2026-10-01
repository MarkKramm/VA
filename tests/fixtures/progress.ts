/**
 * Progress fixtures.
 *
 * Event ids are explicit and deterministic so merge tests can assert exact
 * behaviour. Timestamps are fixed so ordering is testable without a clock.
 */

let counter = 0

export const resetEventCounter = (): void => {
  counter = 0
}

export const event = <T extends { type: string }>(payload: T, at = '2026-10-01T09:00:00.000Z') => {
  counter += 1
  return { id: `e${counter.toString().padStart(3, '0')}`, at, ...payload }
}

export const viewed = (lessonId: string, at?: string) =>
  event({ type: 'lesson.viewed' as const, lessonId }, at)
export const completed = (lessonId: string, at?: string) =>
  event({ type: 'lesson.completed' as const, lessonId, source: 'manual' as const }, at)
export const uncompleted = (lessonId: string, at?: string) =>
  event({ type: 'lesson.uncompleted' as const, lessonId }, at)
export const practise = (lessonId: string, at?: string) =>
  event(
    {
      type: 'exercise.attempted' as const,
      exerciseId: `ex-${lessonId}`,
      lessonId,
      selfChecked: true,
    },
    at,
  )
export const quizAttempt = (overrides: Record<string, unknown> = {}, at?: string) =>
  event(
    {
      type: 'quiz.attempted' as const,
      quizId: 'q-1',
      attemptId: 'a-1',
      score: 7,
      maxScore: 10,
      passed: true,
      evaluatedBy: 'system' as const,
      ...overrides,
    },
    at,
  )
export const enrolled = (roadmapId: string, at?: string) =>
  event({ type: 'roadmap.enrolled' as const, roadmapId }, at)
export const unenrolled = (roadmapId: string, at?: string) =>
  event({ type: 'roadmap.unenrolled' as const, roadmapId }, at)
