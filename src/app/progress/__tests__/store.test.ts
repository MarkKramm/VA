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

  it('drops unreadable events instead of folding nonsense', () => {
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
    expect(store.getState().events).toHaveLength(1)
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
