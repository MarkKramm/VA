import { describe, expect, it } from 'vitest'
import {
  KNOWN_EVENT_TYPES,
  parseProgressExport,
  serializeProgressExport,
} from '../export-validate.ts'
import { createInitialState, foldEvents } from '@domain/progress/reducer.ts'
import {
  PROGRESS_EVENT_TYPES,
  type ProgressEvent,
  type ProgressEventType,
} from '@domain/progress/types.ts'

/**
 * THE EXPORT ROUND TRIP, AND EVENT-TYPE COMPLETENESS (pre-M3 hardening, F5 + F9).
 *
 * Two defects met here. F5: the import validator kept a hand-written list of
 * event types beside the `ProgressEvent` union, so a new variant would be dropped
 * as "unknown" on import. F9: there was a parser but no producer, so the round
 * trip the parser exists for could not be exercised at all.
 *
 * The fixture below is the hinge. It is typed `Record<ProgressEventType,
 * ProgressEvent>`, which makes it a COMPILE-time exhaustiveness check: adding a
 * variant to the union without adding it here fails `tsc`. That is stronger than
 * comparing two hand-written string arrays, which can agree while both being
 * wrong — here the compiler forces the author to look at the canonical set.
 */

/**
 * One event of EVERY variant, keyed by its type.
 *
 * Ids and timestamps are explicit and ascending so the log order is
 * deterministic without a clock. The payloads are the minimum each variant
 * requires plus one field per optional shape (a lab's payload and feedback, a
 * quiz's score) so a round trip that dropped a field would be visible.
 */
const ONE_OF_EACH: Record<ProgressEventType, ProgressEvent> = {
  'lesson.viewed': {
    id: 'e-viewed',
    at: '2026-10-01T09:00:00.000Z',
    type: 'lesson.viewed',
    lessonId: 'lesson-a',
  },
  'lesson.completed': {
    id: 'e-completed',
    at: '2026-10-01T09:01:00.000Z',
    type: 'lesson.completed',
    lessonId: 'lesson-a',
    source: 'manual',
  },
  'lesson.uncompleted': {
    id: 'e-uncompleted',
    at: '2026-10-01T09:02:00.000Z',
    type: 'lesson.uncompleted',
    lessonId: 'lesson-a',
  },
  'topic.completed': {
    id: 'e-topic',
    at: '2026-10-01T09:03:00.000Z',
    type: 'topic.completed',
    topicId: 'topic-a',
    lessonId: 'lesson-a',
    completed: true,
  },
  'exercise.attempted': {
    id: 'e-exercise',
    at: '2026-10-01T09:04:00.000Z',
    type: 'exercise.attempted',
    exerciseId: 'exercise-a',
    lessonId: 'lesson-a',
    selfChecked: true,
  },
  'quiz.attempted': {
    id: 'e-quiz',
    at: '2026-10-01T09:05:00.000Z',
    type: 'quiz.attempted',
    quizId: 'quiz-a',
    attemptId: 'attempt-1',
    score: 7,
    maxScore: 10,
    passed: true,
    evaluatedBy: 'system',
  },
  'lab.submitted': {
    id: 'e-lab',
    at: '2026-10-01T09:06:00.000Z',
    type: 'lab.submitted',
    labId: 'lab-a',
    attemptId: 'attempt-2',
    attemptNumber: 1,
    payload: 'a draft',
    feedbackNotes: ['good start'],
    passed: false,
    evaluatedBy: 'self',
  },
  'assessment.attempted': {
    id: 'e-assessment',
    at: '2026-10-01T09:07:00.000Z',
    type: 'assessment.attempted',
    assessmentId: 'assessment-a',
    attemptId: 'attempt-3',
    score: 8,
    maxScore: 10,
    passed: true,
    evaluatedBy: 'system',
  },
  'roadmap.enrolled': {
    id: 'e-enrolled',
    at: '2026-10-01T09:08:00.000Z',
    type: 'roadmap.enrolled',
    roadmapId: 'roadmap-a',
  },
  'roadmap.unenrolled': {
    id: 'e-unenrolled',
    at: '2026-10-01T09:09:00.000Z',
    type: 'roadmap.unenrolled',
    roadmapId: 'roadmap-a',
  },
  'bookmark.toggled': {
    id: 'e-bookmark',
    at: '2026-10-01T09:10:00.000Z',
    type: 'bookmark.toggled',
    refType: 'lesson',
    refId: 'lesson-a',
  },
  'note.saved': {
    id: 'e-note',
    at: '2026-10-01T09:11:00.000Z',
    type: 'note.saved',
    refType: 'lesson',
    refId: 'lesson-a',
    body: 'a note',
  },
  'portfolio.artifact.added': {
    id: 'e-portfolio',
    at: '2026-10-01T09:12:00.000Z',
    type: 'portfolio.artifact.added',
    artifactId: 'artifact-a',
    roadmapId: 'roadmap-a',
    skills: ['data-cleaning'],
  },
}

/** The fixture as a log, in the canonical order the store would hold it. */
const allEvents = (): ProgressEvent[] => PROGRESS_EVENT_TYPES.map((type) => ONE_OF_EACH[type])

describe('event-type completeness (F5)', () => {
  it('has a fixture for every variant the runtime set knows, and vice versa', () => {
    // The `Record<ProgressEventType, …>` annotation already makes a missing or
    // extra variant a COMPILE error. This asserts the same fact at runtime, so
    // the guarantee is visible in the test output rather than only in `tsc`.
    expect(Object.keys(ONE_OF_EACH).sort()).toEqual([...PROGRESS_EVENT_TYPES].sort())
  })

  it('recognises every variant as known to the import validator', () => {
    // The defect F5 fixed: a variant that is not in KNOWN_EVENT_TYPES is silently
    // dropped on import. Every variant the union declares must be accepted.
    for (const type of PROGRESS_EVENT_TYPES) {
      expect(KNOWN_EVENT_TYPES.has(type), `${type} is not a known event type`).toBe(true)
    }
  })
})

describe('export serialization (F9)', () => {
  it('produces the exact shape the parser validates', () => {
    const state = foldEvents(allEvents())
    const json = JSON.parse(serializeProgressExport(state)) as {
      version: number
      events: unknown[]
    }
    expect(json.version).toBe(state.version)
    expect(json.events).toHaveLength(allEvents().length)
  })

  it('round-trips EVERY event variant through serialize → parse', () => {
    // The heart of F9. `skipped` must be 0 and the recovered log must equal the
    // original — which can only hold if every one of the variants survived both
    // the serializer and the validator. A single missing type would show up as a
    // skipped event and a shorter log.
    const state = foldEvents(allEvents())
    const result = parseProgressExport(serializeProgressExport(state))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toBe(0)
    expect(result.state.events).toEqual(state.events)
    expect(result.state.derived).toEqual(state.derived)
  })

  it('preserves a payload field, not just the event envelope', () => {
    // A round trip that kept only `id`/`at`/`type` would pass a shallow check and
    // lose every score and note body. Assert a field from each shape survives.
    const state = foldEvents(allEvents())
    const result = parseProgressExport(serializeProgressExport(state))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const quiz = result.state.events.find((event) => event.type === 'quiz.attempted')
    const note = result.state.events.find((event) => event.type === 'note.saved')
    const lab = result.state.events.find((event) => event.type === 'lab.submitted')
    expect(quiz && 'score' in quiz ? quiz.score : undefined).toBe(7)
    expect(note && 'body' in note ? note.body : undefined).toBe('a note')
    expect(lab && 'feedbackNotes' in lab ? lab.feedbackNotes : undefined).toEqual(['good start'])
  })

  it('is deterministic — the same state serializes identically', () => {
    const state = foldEvents(allEvents())
    expect(serializeProgressExport(state)).toBe(serializeProgressExport(state))
  })

  it('round-trips to a byte-identical string, so a re-export is stable', () => {
    const state = foldEvents(allEvents())
    const once = serializeProgressExport(state)
    const reparsed = parseProgressExport(once)
    expect(reparsed.ok).toBe(true)
    if (!reparsed.ok) return
    expect(serializeProgressExport(reparsed.state)).toBe(once)
  })

  it('serializes an empty state into a valid, importable file', () => {
    const result = parseProgressExport(serializeProgressExport(createInitialState()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.events).toEqual([])
    expect(result.skipped).toBe(0)
  })
})
