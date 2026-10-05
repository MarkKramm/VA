import { describe, expect, it } from 'vitest'
import { foldEvents } from '@domain/progress/reducer.ts'
import type { NewProgressEvent, ProgressEvent, ProgressState } from '@domain/progress/types.ts'
import { assessmentEligibility, hasDemonstrated } from '../unlock.ts'

/**
 * THE ONE HARD LOCK (M5).
 *
 * `assessmentEligibility` is the only place in the platform that refuses rather
 * than advises, so its boundary cases matter: a gate that cannot be satisfied is
 * a wall, and a gate that does not check practice is not a gate.
 */

let counter = 0
const ev = (payload: NewProgressEvent): ProgressEvent =>
  ({ ...payload, id: `e${(counter += 1)}`, at: '2026-10-05T00:00:00.000Z' }) as ProgressEvent

const stateWith = (...events: readonly ProgressEvent[]): ProgressState => foldEvents(events)

const complete = (lessonId: string) => ev({ type: 'lesson.completed', lessonId, source: 'manual' })

const practised = (exerciseId: string, lessonId: string) =>
  ev({ type: 'exercise.attempted', exerciseId, lessonId, selfChecked: true })

const input = (overrides: Partial<Parameters<typeof assessmentEligibility>[1]> = {}) => ({
  requiredLessons: ['lesson-a'],
  activitiesOfLesson: { 'lesson-a': ['exercise-a'] },
  attemptedActivities: new Set<string>(),
  ...overrides,
})

describe('assessmentEligibility', () => {
  it('refuses until every required lesson is complete', () => {
    const check = assessmentEligibility(stateWith(), input())
    expect(check.eligible).toBe(false)
    expect(check.reasons[0]).toMatch(/Complete the lesson "lesson-a"/)
  })

  it('refuses a lesson that is complete but not practised', () => {
    const check = assessmentEligibility(stateWith(complete('lesson-a')), input())
    expect(check.eligible).toBe(false)
    expect(check.reasons[0]).toMatch(/Practise at least one activity/)
  })

  it('refuses practice of a DIFFERENT activity in the same lesson', () => {
    // The point of naming activities is that any one of them will do — but only
    // one that belongs to the lesson.
    const check = assessmentEligibility(stateWith(complete('lesson-a')), {
      ...input(),
      attemptedActivities: new Set(['some-other-exercise']),
    })
    expect(check.eligible).toBe(false)
  })

  it('is eligible once the lesson is complete and one activity attempted', () => {
    const check = assessmentEligibility(stateWith(complete('lesson-a')), {
      ...input(),
      attemptedActivities: new Set(['exercise-a']),
    })
    expect(check.eligible).toBe(true)
    expect(check.reasons).toEqual([])
  })

  it('does NOT require practice from a lesson that declares no activity (M5)', () => {
    // `[].some()` is false, so without the guard the gate would be unsatisfiable
    // and the assessment unreachable forever. Completion is still required.
    const check = assessmentEligibility(
      stateWith(complete('lesson-a')),
      input({ activitiesOfLesson: {} }),
    )
    expect(check.eligible).toBe(true)
    expect(check.reasons).toEqual([])
  })

  it('still requires completion of a lesson with no activity', () => {
    const check = assessmentEligibility(stateWith(), input({ activitiesOfLesson: {} }))
    expect(check.eligible).toBe(false)
    expect(check.reasons[0]).toMatch(/Complete the lesson/)
  })

  it('reports every unmet requirement, not just the first', () => {
    const check = assessmentEligibility(
      stateWith(complete('lesson-a')),
      input({
        requiredLessons: ['lesson-a', 'lesson-b'],
        activitiesOfLesson: { 'lesson-a': ['exercise-a'], 'lesson-b': [] },
      }),
    )
    expect(check.reasons).toHaveLength(2)
  })

  it('is deterministic', () => {
    const state = stateWith(complete('lesson-a'))
    expect(assessmentEligibility(state, input())).toEqual(assessmentEligibility(state, input()))
  })
})

describe('hasDemonstrated', () => {
  it('needs both completion and practice', () => {
    expect(hasDemonstrated(stateWith(complete('lesson-a')), 'lesson-a')).toBe(false)
    expect(hasDemonstrated(stateWith(practised('exercise-a', 'lesson-a')), 'lesson-a')).toBe(false)
    expect(
      hasDemonstrated(
        stateWith(complete('lesson-a'), practised('exercise-a', 'lesson-a')),
        'lesson-a',
      ),
    ).toBe(true)
  })
})
