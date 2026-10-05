import { describe, expect, it, vi } from 'vitest'
import { LearnerProgress } from '../store.ts'
import { MemoryStorageAdapter } from '@/app/storage/memory.ts'
import { PROGRESS_KEY } from '@/app/storage/merge.ts'
import { parseProgressExport } from '@/app/storage/export-validate.ts'
import { createInitialState } from '@domain/progress/reducer.ts'
import { isLessonComplete, isLessonPractised } from '@domain/progress/selectors.ts'
import type { ProgressEvent, ProgressState } from '@domain/progress/types.ts'

/**
 * THE REACT-FACING PROGRESS STORE (M3).
 *
 * These are the seams that matter, not button clicks: record → persist → reload →
 * read, and tab A → storage → store → tab B. Everything here runs against a
 * `MemoryStorageAdapter`, so it exercises the real store, the real fold and the
 * real merge — nothing is mocked away except the bytes on disk.
 */

const LESSON = 'files-and-folders'
const OTHER_LESSON = 'what-is-a-virtual-assistant'

const persistedEvents = (adapter: MemoryStorageAdapter): readonly ProgressEvent[] =>
  adapter.read<ProgressState>(PROGRESS_KEY, createInitialState()).events

describe('a fresh learner', () => {
  it('starts with empty progress', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    expect(store.getState().events).toEqual([])
    expect(isLessonComplete(store.getState(), LESSON)).toBe(false)
  })
})

describe('lesson completion', () => {
  it('records a manual completion and updates immediately', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)

    expect(isLessonComplete(store.getState(), LESSON)).toBe(true)
    const event = store.getState().events[0]
    expect(event?.type).toBe('lesson.completed')
    // `source: 'manual'` is the explicit-completion distinction, not an activity.
    expect(event?.type === 'lesson.completed' ? event.source : undefined).toBe('manual')
  })

  it('persists, so a reload restores it', () => {
    const adapter = new MemoryStorageAdapter()
    new LearnerProgress(adapter).completeLesson(LESSON)

    expect(persistedEvents(adapter).some((event) => event.type === 'lesson.completed')).toBe(true)
    expect(isLessonComplete(new LearnerProgress(adapter).getState(), LESSON)).toBe(true)
  })

  it('undoes a completion with lesson.uncompleted', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)
    store.uncompleteLesson(LESSON)
    expect(isLessonComplete(store.getState(), LESSON)).toBe(false)
  })

  it('records a view as a view, never as a completion', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.recordLessonViewed(LESSON)
    expect(store.getState().derived.viewedAt[LESSON]).toBeDefined()
    expect(isLessonComplete(store.getState(), LESSON)).toBe(false)
  })
})

describe('exercise practice', () => {
  it('records a self-checked attempt, with no score and no pass/fail', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.markExercisePractised('organise-a-client-folder-structure', LESSON)

    const event = store.getState().events[0]
    expect(event?.type).toBe('exercise.attempted')
    if (event?.type === 'exercise.attempted') {
      expect(event.exerciseId).toBe('organise-a-client-folder-structure')
      expect(event.lessonId).toBe(LESSON)
      expect(event.selfChecked).toBe(true)
      // The exercise is ungraded (D25): nothing here may score it.
      expect(event).not.toHaveProperty('score')
      expect(event).not.toHaveProperty('passed')
    }
    expect(isLessonPractised(store.getState(), LESSON)).toBe(true)
  })

  it('persists, so a reload restores it', () => {
    const adapter = new MemoryStorageAdapter()
    new LearnerProgress(adapter).markExercisePractised('ex-1', LESSON)
    expect(isLessonPractised(new LearnerProgress(adapter).getState(), LESSON)).toBe(true)
  })
})

describe('subscription', () => {
  it('notifies listeners on a change, and stops after unsubscribe', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.completeLesson(LESSON)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.completeLesson(OTHER_LESSON)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('cross-tab synchronization', () => {
  it('picks up a write made by another store over the same storage', () => {
    const adapter = new MemoryStorageAdapter()
    const tabA = new LearnerProgress(adapter)
    const tabB = new LearnerProgress(adapter)

    tabB.completeLesson(LESSON)
    expect(isLessonComplete(tabA.getState(), LESSON)).toBe(false)

    tabA.syncExternal()
    expect(isLessonComplete(tabA.getState(), LESSON)).toBe(true)
  })

  it('does not notify when the log is genuinely unchanged', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)
    const listener = vi.fn()
    store.subscribe(listener)

    store.syncExternal()
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not duplicate an event that arrives twice with the same id', () => {
    // The realistic duplicate: the same export imported twice, or an event two
    // tabs both replayed. Merge is by id, so it collapses to one.
    const store = new LearnerProgress(new MemoryStorageAdapter())
    const event: ProgressEvent = {
      id: 'dup-1',
      at: '2026-10-01T09:00:00.000Z',
      type: 'lesson.completed',
      lessonId: LESSON,
      source: 'manual',
    }
    store.record(event)
    store.record(event)
    expect(store.getState().events).toHaveLength(1)
  })
})

describe('export and import', () => {
  it('exports a file the existing parser accepts', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)

    const parsed = parseProgressExport(store.exportData())
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.state.events).toHaveLength(1)
  })

  it('merges a valid import rather than replacing local progress', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)

    const other = new LearnerProgress(new MemoryStorageAdapter())
    other.completeLesson(OTHER_LESSON)

    const outcome = store.importData(other.exportData())
    expect(outcome.ok).toBe(true)
    // Local kept AND imported added — an import is additive, not destructive.
    expect(isLessonComplete(store.getState(), LESSON)).toBe(true)
    expect(isLessonComplete(store.getState(), OTHER_LESSON)).toBe(true)
    expect(store.getState().events).toHaveLength(2)
  })

  it('is idempotent when the same file is imported twice', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)
    const file = store.exportData()

    store.importData(file)
    expect(store.getState().events).toHaveLength(1)
  })

  it('rejects an invalid file and commits nothing', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.completeLesson(LESSON)
    const before = store.getState()

    const outcome = store.importData('this is not a progress export')
    expect(outcome.ok).toBe(false)
    // Same object reference: nothing was written, so nothing changed.
    expect(store.getState()).toBe(before)
  })

  it('rejects an export from a newer format version', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    const outcome = store.importData(JSON.stringify({ version: 99, events: [] }))
    expect(outcome.ok).toBe(false)
  })
})

describe('malformed or unavailable storage', () => {
  it('falls back to an empty state when the stored value is not a progress state', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.write(PROGRESS_KEY, { hello: 'world' })
    expect(new LearnerProgress(adapter).getState().events).toEqual([])
  })

  it('drops structurally malformed events but keeps unknown event types', () => {
    // A1-R: an event this build does not UNDERSTAND is still structurally valid.
    // Dropping it on read would delete a newer build's data on the next write, so
    // only the malformed entry (no `at`, no `type`) is discarded.
    const adapter = new MemoryStorageAdapter()
    adapter.write(PROGRESS_KEY, {
      version: 1,
      events: [
        {
          id: 'e1',
          at: '2026-10-01T09:00:00.000Z',
          type: 'lesson.completed',
          lessonId: LESSON,
          source: 'manual',
        },
        { id: 'e2', at: '2026-10-01T09:00:00.000Z', type: 'something.from.the.future' },
        { id: 'e3' },
      ],
    })

    const store = new LearnerProgress(adapter)
    expect(store.getState().events.map((event) => event.id)).toEqual(['e1', 'e2'])
    expect(isLessonComplete(store.getState(), LESSON)).toBe(true)
  })

  it('starts empty rather than crashing when the adapter throws on read', () => {
    // The shipped adapters never throw, but this runs during render, where a
    // throw would take the page down. Failing to an empty session is better.
    const adapter = new MemoryStorageAdapter()
    vi.spyOn(adapter, 'read').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(() => new LearnerProgress(adapter)).not.toThrow()
  })
})

describe('clear', () => {
  it('wipes progress and resets the state', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new LearnerProgress(adapter)
    store.completeLesson(LESSON)
    store.clear()
    expect(store.getState().events).toEqual([])
    expect(persistedEvents(adapter)).toEqual([])
  })
})

/**
 * MALFORMED STORED EVENTS CANNOT REACH THE FOLD OR THE MERGE (pre-M4 hardening, A1).
 *
 * M3 validated only during initialization. `append`, `mergeEvents` and `syncFrom`
 * re-read storage, and they read it RAW — so a malformed event was filtered out of
 * the in-memory state at boot and then reached the merge's sort on the next
 * interaction, where `undefined.localeCompare` threw. The store looked fine until
 * the learner did something.
 */
describe('malformed stored events (A1)', () => {
  it('discards malformed events and still accepts the next write', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.write(PROGRESS_KEY, {
      version: 1,
      events: [
        {
          id: 'keep-1',
          at: '2026-10-01T09:00:00.000Z',
          type: 'lesson.completed',
          lessonId: LESSON,
          source: 'manual',
        },
        // No `at` and no `type`: the shape the merge's sort would choke on.
        { id: 'broken' },
        // A type this build does not understand — structurally valid, so KEPT.
        { id: 'future', at: '2026-10-01T09:00:01.000Z', type: 'from.the.future' },
      ],
    })

    const store = new LearnerProgress(adapter)
    expect(store.getState().events.map((event) => event.id)).toEqual(['keep-1', 'future'])

    // The regression: this re-read the raw log, sorted it, and threw.
    expect(() => store.completeLesson(OTHER_LESSON)).not.toThrow()

    const events = persistedEvents(adapter)
    // The valid stored event and the unknown-typed one survived; only the
    // structurally broken entry is gone; the new event was appended.
    expect(events).toHaveLength(3)
    expect(events.some((event) => event.id === 'keep-1')).toBe(true)
    expect(events.some((event) => event.id === 'future')).toBe(true)
    expect(events.some((event) => event.id === 'broken')).toBe(false)
    expect(isLessonComplete(store.getState(), LESSON)).toBe(true)
    expect(isLessonComplete(store.getState(), OTHER_LESSON)).toBe(true)
  })

  it('drops junk entries without losing the valid events around them', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.write(PROGRESS_KEY, {
      version: 1,
      events: [
        { id: 'a', at: '2026-10-01T09:00:00.000Z', type: 'lesson.viewed', lessonId: LESSON },
        null,
        'not an event',
        {
          id: 'b',
          at: '2026-10-01T09:00:01.000Z',
          type: 'lesson.completed',
          lessonId: LESSON,
          source: 'manual',
        },
      ],
    })

    const store = new LearnerProgress(adapter)
    expect(store.getState().events.map((event) => event.id)).toEqual(['a', 'b'])
    expect(isLessonComplete(store.getState(), LESSON)).toBe(true)
  })

  it('adopts a valid state, not the raw value, when another tab writes garbage', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new LearnerProgress(adapter)
    store.completeLesson(LESSON)

    // A bad migration or a hand-edit left a value with no `events` array at all.
    adapter.write(PROGRESS_KEY, { version: 1 })

    // The regression: `sameEventLog` compared `undefined.length` and threw.
    expect(() => store.syncExternal()).not.toThrow()

    // Whatever storage holds, what reaches React is a valid progress state.
    expect(Array.isArray(store.getState().events)).toBe(true)
    expect(store.getState().events.every((event) => typeof event.at === 'string')).toBe(true)
  })

  it('preserves an unknown event type across load → append → write (A1-R)', () => {
    // A log written by a NEWER build holds a type this build has never heard of.
    // Reading it must not filter it out: the sanitized state is what gets written
    // back, so filtering would silently DELETE the newer build's event.
    const adapter = new MemoryStorageAdapter()
    const fromTheFuture = {
      id: 'future-1',
      at: '2026-10-01T09:00:00.000Z',
      type: 'question.answered',
      questionId: 'q-1',
      correct: true,
    }
    adapter.write(PROGRESS_KEY, {
      version: 1,
      events: [
        {
          id: 'known-1',
          at: '2026-10-01T08:59:00.000Z',
          type: 'lesson.completed',
          lessonId: LESSON,
          source: 'manual',
        },
        fromTheFuture,
      ],
    })

    const store = new LearnerProgress(adapter)
    // Folded through untouched: the reducer has no case for the unknown type, so
    // it simply does not contribute to derived state.
    expect(store.getState().events.map((event) => event.id)).toEqual(['known-1', 'future-1'])
    expect(isLessonComplete(store.getState(), LESSON)).toBe(true)

    store.completeLesson(OTHER_LESSON)

    const stored = persistedEvents(adapter)
    expect(stored).toHaveLength(3)
    // Still present, and unchanged.
    expect(stored.find((event) => event.id === 'future-1')).toEqual(fromTheFuture)
    // The known stored event survived, and the new one was appended.
    const completions = stored
      .filter((event) => event.type === 'lesson.completed')
      .map((event) => (event.type === 'lesson.completed' ? event.lessonId : ''))
    expect(completions).toEqual([LESSON, OTHER_LESSON])
    expect(isLessonComplete(store.getState(), OTHER_LESSON)).toBe(true)
  })
})

/**
 * QUIZ ATTEMPTS (M4.3).
 *
 * The store method is the only thing that turns a submission into progress, so it
 * is worth pinning directly as well as through the quiz page: the event type, the
 * evaluator, one event per call, and history that accumulates rather than being
 * overwritten.
 */
describe('recording a quiz attempt', () => {
  const QUIZ = 'va-foundations-basics'

  const attemptOf = (store: LearnerProgress, quizId: string) =>
    store.getState().derived.quizAttempts[quizId] ?? []

  it('records the existing quiz.attempted event, evaluated by the system', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new LearnerProgress(adapter)

    store.submitQuizAttempt({
      quizId: QUIZ,
      attemptId: 'attempt-1',
      score: 3,
      maxScore: 3,
      passed: true,
    })

    const [event] = persistedEvents(adapter)
    expect(event).toMatchObject({
      type: 'quiz.attempted',
      quizId: QUIZ,
      attemptId: 'attempt-1',
      score: 3,
      maxScore: 3,
      passed: true,
      // The platform marked it against the canonical answers, which is what
      // `'system'` means and why it is not `'self'`.
      evaluatedBy: 'system',
    })
    // The store still supplies the event id and timestamp, so merging and
    // ordering are unchanged.
    expect(event?.id).toBeTypeOf('string')
    expect(event?.at).toBeTypeOf('string')
  })

  it('keeps every attempt, in order, rather than replacing the last one', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())

    store.submitQuizAttempt({ quizId: QUIZ, attemptId: 'a', score: 0, maxScore: 3, passed: false })
    store.submitQuizAttempt({ quizId: QUIZ, attemptId: 'b', score: 3, maxScore: 3, passed: true })

    expect(attemptOf(store, QUIZ).map((attempt) => attempt.attemptId)).toEqual(['a', 'b'])
    expect(attemptOf(store, QUIZ).map((attempt) => attempt.passed)).toEqual([false, true])
  })

  it('survives a reload, because it went through storage', () => {
    const adapter = new MemoryStorageAdapter()
    new LearnerProgress(adapter).submitQuizAttempt({
      quizId: QUIZ,
      attemptId: 'attempt-1',
      score: 2,
      maxScore: 3,
      passed: false,
    })

    expect(attemptOf(new LearnerProgress(adapter), QUIZ)).toHaveLength(1)
  })

  it('records nothing for a different quiz', () => {
    const store = new LearnerProgress(new MemoryStorageAdapter())
    store.submitQuizAttempt({ quizId: QUIZ, attemptId: 'a', score: 1, maxScore: 1, passed: true })
    expect(attemptOf(store, 'some-other-quiz')).toEqual([])
  })
})
