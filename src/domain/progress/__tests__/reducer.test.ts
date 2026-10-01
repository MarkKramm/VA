import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyEvent,
  createInitialState,
  deriveProgress,
  foldEvents,
  recompute,
} from '../reducer.ts'
import { PROGRESS_STATE_VERSION } from '../types.ts'
import {
  completed,
  enrolled,
  event,
  practise,
  quizAttempt,
  resetEventCounter,
  uncompleted,
  unenrolled,
  viewed,
} from '../../../../tests/fixtures/progress.ts'

beforeEach(() => resetEventCounter())

describe('the fold', () => {
  it('starts empty', () => {
    const state = createInitialState()
    expect(state.version).toBe(PROGRESS_STATE_VERSION)
    expect(state.events).toEqual([])
    expect(state.derived.completedLessons).toEqual({})
  })

  it('records a lesson completion', () => {
    const state = foldEvents([completed('lesson-a')])
    expect(state.derived.completedLessons['lesson-a']).toEqual({
      at: '2026-10-01T09:00:00.000Z',
      source: 'manual',
    })
  })

  it('records a completion triggered by an activity', () => {
    const state = foldEvents([
      event({ type: 'lesson.completed' as const, lessonId: 'a', source: 'activity' as const }),
    ])
    expect(state.derived.completedLessons['a']?.source).toBe('activity')
  })

  it('undoes a completion on an explicit uncompletion', () => {
    const state = foldEvents([
      completed('lesson-a', '2026-10-01T09:00:00.000Z'),
      uncompleted('lesson-a', '2026-10-01T10:00:00.000Z'),
    ])
    expect(state.derived.completedLessons['lesson-a']).toBeUndefined()
  })

  it('is last-write-wins, so a later completion wins', () => {
    const state = foldEvents([
      completed('lesson-a', '2026-10-01T09:00:00.000Z'),
      uncompleted('lesson-a', '2026-10-01T10:00:00.000Z'),
      completed('lesson-a', '2026-10-01T11:00:00.000Z'),
    ])
    expect(state.derived.completedLessons['lesson-a']?.at).toBe('2026-10-01T11:00:00.000Z')
  })
})

describe('practice is tracked separately from completion', () => {
  it('records an exercise attempt against its lesson', () => {
    const state = foldEvents([practise('lesson-a')])
    expect(state.derived.practisedLessons['lesson-a']).toBeDefined()
    expect(state.derived.completedLessons['lesson-a']).toBeUndefined()
  })
})

describe('views and continue-learning', () => {
  it('tracks the most recent view time per lesson', () => {
    const state = foldEvents([
      viewed('lesson-a', '2026-10-01T09:00:00.000Z'),
      viewed('lesson-b', '2026-10-01T11:00:00.000Z'),
    ])
    expect(state.derived.viewedAt['lesson-a']).toBe('2026-10-01T09:00:00.000Z')
    expect(state.derived.viewedAt['lesson-b']).toBe('2026-10-01T11:00:00.000Z')
  })

  it('remembers the last viewed lesson even after it is completed', () => {
    const state = foldEvents([viewed('lesson-a'), completed('lesson-a')])
    expect(state.derived.lastViewedLesson).toBe('lesson-a')
  })
})

describe('roadmap enrolment', () => {
  it('records enrolment', () => {
    expect(foldEvents([enrolled('beginner-va')]).derived.enrolledRoadmaps).toEqual(['beginner-va'])
  })

  it('cancels out an unenrolment regardless of order', () => {
    expect(
      foldEvents([enrolled('a'), enrolled('b'), unenrolled('a')]).derived.enrolledRoadmaps,
    ).toEqual(['b'])
    expect(
      foldEvents([enrolled('a'), unenrolled('a'), enrolled('a')]).derived.enrolledRoadmaps,
    ).toEqual(['a'])
  })

  it('de-duplicates repeated enrolment of the same roadmap', () => {
    expect(foldEvents([enrolled('a'), enrolled('a')]).derived.enrolledRoadmaps).toEqual(['a'])
  })
})

describe('quiz attempts', () => {
  it('appends every attempt rather than overwriting', () => {
    const state = foldEvents([
      quizAttempt({ attemptId: 'a1', score: 4, passed: false }),
      quizAttempt({ attemptId: 'a2', score: 9, passed: true }, '2026-10-02T09:00:00.000Z'),
    ])
    expect(state.derived.quizAttempts['q-1']).toHaveLength(2)
    expect(state.derived.quizAttempts['q-1']?.[1]?.passed).toBe(true)
  })

  it('keeps evaluatedBy, so self and system results stay distinguishable', () => {
    const state = foldEvents([quizAttempt({ evaluatedBy: 'self' })])
    expect(state.derived.quizAttempts['q-1']?.[0]?.evaluatedBy).toBe('self')
  })
})

describe('bookmarks, notes and portfolio', () => {
  it('toggles a bookmark on and off', () => {
    const on = foldEvents([
      event({ type: 'bookmark.toggled' as const, refType: 'lesson', refId: 'a' }),
    ])
    expect(on.derived.bookmarks).toEqual([{ refType: 'lesson', refId: 'a' }])
    const off = foldEvents([
      ...on.events,
      event(
        { type: 'bookmark.toggled' as const, refType: 'lesson', refId: 'a' },
        '2026-10-01T10:00:00.000Z',
      ),
    ])
    expect(off.derived.bookmarks).toEqual([])
  })

  it('replaces a note rather than appending a second copy', () => {
    const state = foldEvents([
      event({ type: 'note.saved' as const, refType: 'lesson', refId: 'a', body: 'first' }),
      event(
        { type: 'note.saved' as const, refType: 'lesson', refId: 'a', body: 'second' },
        '2026-10-01T10:00:00.000Z',
      ),
    ])
    expect(state.derived.notes).toHaveLength(1)
    expect(state.derived.notes[0]?.body).toBe('second')
  })

  it('records portfolio artefacts with the skills they demonstrate', () => {
    const state = foldEvents([
      event({
        type: 'portfolio.artifact.added' as const,
        artifactId: 'art-1',
        roadmapId: 'data-entry-va',
        skills: ['data-entry'],
      }),
    ])
    expect(state.derived.portfolio[0]?.skills).toEqual(['data-entry'])
  })
})

describe('applyEvent and recompute', () => {
  it('appends without mutating the previous state', () => {
    const before = createInitialState()
    const after = applyEvent(before, completed('lesson-a'))
    expect(before.events).toHaveLength(0)
    expect(after.events).toHaveLength(1)
    expect(after).not.toBe(before)
  })

  it('rebuilds identical state from the same events, regardless of path', () => {
    const events = [viewed('a'), completed('a'), practise('a'), enrolled('r')]
    const incremental = events.reduce(applyEvent, createInitialState())
    const bulk = foldEvents(events)
    expect(incremental.derived).toEqual(bulk.derived)
  })

  it('recovers from a corrupted derived cache, which is the whole point of it being a cache', () => {
    const good = foldEvents([completed('a'), enrolled('r')])
    const corrupted = {
      ...good,
      derived: { ...good.derived, completedLessons: {}, enrolledRoadmaps: [] },
    }
    expect(recompute(corrupted).derived).toEqual(good.derived)
  })

  it('is idempotent when the same event is folded twice', () => {
    // This is what makes cross-tab merging by union safe rather than corrupting.
    const events = [completed('a'), completed('b')]
    const twice = [...events, ...events]
    const state = foldEvents(twice)
    expect(Object.keys(state.derived.completedLessons)).toEqual(['a', 'b'])
    expect(state.events).toHaveLength(4)
  })
})

describe('deriveProgress', () => {
  it('returns the same empty shape as the initial state', () => {
    expect(deriveProgress([])).toEqual(createInitialState().derived)
  })
})
