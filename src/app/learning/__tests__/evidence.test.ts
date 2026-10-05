import { describe, expect, it } from 'vitest'
import { foldEvents } from '@domain/progress/reducer.ts'
import type { NewProgressEvent, ProgressEvent, ProgressState } from '@domain/progress/types.ts'
import {
  evidenceCounts,
  skillEvidenceFor,
  skillEvidenceOverview,
  unmetPrerequisitesFor,
} from '../evidence.ts'

/**
 * SKILL EVIDENCE (M5).
 *
 * These run against the REAL registry, because the question they answer is "does
 * the content that exists actually connect to the learner's log" — a fixture
 * registry would prove the arithmetic and nothing about the wiring.
 *
 * The tests that matter most are the negative ones: exposure is not demonstration,
 * a failed attempt is not demonstration, and a skill no scored check covers can
 * never be demonstrated no matter how much of it you read.
 */

const SKILL = 'administration-organisation'
const READ_ONLY_SKILL = 'research-verification'
const LESSON = 'files-and-folders'
const EXPOSING_LESSON = 'browser-basics'
const QUIZ = 'va-foundations-basics'
const ASSESSMENT = 'client-file-organisation'

let counter = 0

/** Build an event with the id and timestamp the store would have supplied. */
const ev = (payload: NewProgressEvent): ProgressEvent =>
  ({
    ...payload,
    id: `e${(counter += 1)}`,
    at: `2026-10-05T00:00:00.000Z`,
  }) as ProgressEvent

const stateWith = (...events: readonly ProgressEvent[]): ProgressState => foldEvents(events)

const quizAttempt = (passed: boolean): ProgressEvent =>
  ev({
    type: 'quiz.attempted',
    quizId: QUIZ,
    attemptId: 'a1',
    score: passed ? 3 : 0,
    maxScore: 3,
    passed,
    evaluatedBy: 'system',
  })

const assessmentAttempt = (passed: boolean): ProgressEvent =>
  ev({
    type: 'assessment.attempted',
    assessmentId: ASSESSMENT,
    attemptId: 'a1',
    score: passed ? 5 : 2,
    maxScore: 5,
    passed,
    evaluatedBy: 'self',
  })

describe('a skill nothing has touched', () => {
  it('has no evidence at all', () => {
    const evidence = skillEvidenceFor(stateWith(), SKILL)
    expect(evidence.tier).toBe('none')
    expect(evidence.exposedBy).toEqual([])
    expect(evidence.practisedBy).toEqual([])
    expect(evidence.demonstratedBy).toEqual([])
  })
})

describe('exposure', () => {
  it('comes from reading a lesson that teaches the skill', () => {
    const evidence = skillEvidenceFor(
      stateWith(ev({ type: 'lesson.viewed', lessonId: LESSON })),
      SKILL,
    )
    expect(evidence.tier).toBe('exposed')
    expect(evidence.exposedBy).toEqual([LESSON])
  })

  it('comes from completing a lesson too, even if the view was never recorded', () => {
    const evidence = skillEvidenceFor(
      stateWith(ev({ type: 'lesson.completed', lessonId: EXPOSING_LESSON, source: 'manual' })),
      SKILL,
    )
    expect(evidence.tier).toBe('exposed')
  })

  it('does not count a lesson that teaches a different skill', () => {
    // `who-hires-virtual-assists` teaches research-verification, not
    // administration-organisation.
    const evidence = skillEvidenceFor(
      stateWith(ev({ type: 'lesson.viewed', lessonId: 'who-hires-virtual-assists' })),
      SKILL,
    )
    expect(evidence.tier).toBe('none')
  })
})

describe('practice', () => {
  it('comes from attempting an exercise in a lesson that teaches the skill', () => {
    const evidence = skillEvidenceFor(
      stateWith(
        ev({ type: 'lesson.viewed', lessonId: LESSON }),
        ev({
          type: 'exercise.attempted',
          exerciseId: 'organise-a-client-folder-structure',
          lessonId: LESSON,
          selfChecked: true,
        }),
      ),
      SKILL,
    )
    expect(evidence.tier).toBe('practised')
    expect(evidence.practisedBy).toEqual([LESSON])
    // Practice is NOT demonstration — the distinction the whole model exists for.
    expect(evidence.demonstratedBy).toEqual([])
  })

  it('is a higher tier than exposure', () => {
    const exposedOnly = skillEvidenceFor(
      stateWith(ev({ type: 'lesson.viewed', lessonId: LESSON })),
      SKILL,
    )
    const practised = skillEvidenceFor(
      stateWith(
        ev({ type: 'lesson.viewed', lessonId: LESSON }),
        ev({
          type: 'exercise.attempted',
          exerciseId: 'organise-a-client-folder-structure',
          lessonId: LESSON,
          selfChecked: true,
        }),
      ),
      SKILL,
    )
    expect(exposedOnly.tier).toBe('exposed')
    expect(practised.tier).toBe('practised')
  })
})

describe('demonstration', () => {
  it('comes from passing the quiz whose questions cover the skill', () => {
    const evidence = skillEvidenceFor(stateWith(quizAttempt(true)), SKILL)
    expect(evidence.tier).toBe('demonstrated')
    expect(evidence.demonstratedBy).toEqual([{ kind: 'quiz', id: QUIZ }])
  })

  it('comes from passing the practical assessment that claims the skill', () => {
    const evidence = skillEvidenceFor(stateWith(assessmentAttempt(true)), SKILL)
    expect(evidence.tier).toBe('demonstrated')
    expect(evidence.demonstratedBy).toEqual([{ kind: 'assessment', id: ASSESSMENT }])
  })

  it('does NOT come from a failed attempt', () => {
    // A failed check is a real signal about the learner; counting it as
    // demonstration would make the tier meaningless.
    const evidence = skillEvidenceFor(
      stateWith(quizAttempt(false), assessmentAttempt(false)),
      SKILL,
    )
    expect(evidence.tier).toBe('none')
    expect(evidence.demonstratedBy).toEqual([])
  })

  it('does NOT come from reading and practising alone', () => {
    const evidence = skillEvidenceFor(
      stateWith(
        ev({ type: 'lesson.viewed', lessonId: LESSON }),
        ev({ type: 'lesson.viewed', lessonId: EXPOSING_LESSON }),
        ev({
          type: 'exercise.attempted',
          exerciseId: 'organise-a-client-folder-structure',
          lessonId: LESSON,
          selfChecked: true,
        }),
      ),
      SKILL,
    )
    expect(evidence.tier).toBe('practised')
    expect(evidence.demonstratedBy).toEqual([])
  })

  it('can never happen for a skill no scored check covers', () => {
    // `research-verification` is taught by a lesson with no exercise and covered
    // by no question or assessment, so reading it is all the platform can know.
    const evidence = skillEvidenceFor(
      stateWith(
        ev({ type: 'lesson.viewed', lessonId: 'who-hires-virtual-assists' }),
        ev({ type: 'lesson.completed', lessonId: 'who-hires-virtual-assists', source: 'manual' }),
        quizAttempt(true),
        assessmentAttempt(true),
      ),
      READ_ONLY_SKILL,
    )
    expect(evidence.tier).toBe('exposed')
    expect(evidence.demonstratedBy).toEqual([])
  })
})

describe('the overview', () => {
  it('counts each tier, and never a score', () => {
    const counts = evidenceCounts(
      stateWith(
        ev({ type: 'lesson.viewed', lessonId: LESSON }),
        ev({ type: 'lesson.viewed', lessonId: 'who-hires-virtual-assists' }),
        quizAttempt(true),
      ),
    )
    // Two skills from `files-and-folders`/`browser-basics`-adjacent content plus
    // whatever the quiz covers — asserted as a shape rather than a magic number.
    expect(counts.demonstrated).toBeGreaterThan(0)
    expect(counts.exposed).toBeGreaterThan(0)
    expect(counts.demonstrated + counts.practised + counts.exposed).toBeLessThanOrEqual(
      evidenceCounts(stateWith()).none,
    )
  })

  it('lists only skills the learner has met', () => {
    const overview = skillEvidenceOverview(
      stateWith(ev({ type: 'lesson.viewed', lessonId: LESSON })),
    )
    expect(overview.map((entry) => entry.skill.id)).toContain(SKILL)
    expect(overview.every((entry) => entry.tier !== 'none')).toBe(true)
    // A skill nobody has touched is not listed at all.
    expect(overview.map((entry) => entry.skill.id)).not.toContain(READ_ONLY_SKILL)
  })

  it('is deterministic: the same log gives the same evidence', () => {
    const events = [ev({ type: 'lesson.viewed', lessonId: LESSON }), quizAttempt(true)]
    expect(skillEvidenceFor(stateWith(...events), SKILL)).toEqual(
      skillEvidenceFor(stateWith(...events), SKILL),
    )
  })
})

describe('unmet prerequisites', () => {
  it('lists a prerequisite the learner has not completed', () => {
    const unmet = unmetPrerequisitesFor(stateWith(), 'who-hires-virtual-assists')
    expect(unmet.map((lesson) => lesson.id)).toEqual(['what-is-a-virtual-assistant'])
  })

  it('drops it once the lesson is complete', () => {
    const unmet = unmetPrerequisitesFor(
      stateWith(
        ev({ type: 'lesson.completed', lessonId: 'what-is-a-virtual-assistant', source: 'manual' }),
      ),
      'who-hires-virtual-assists',
    )
    expect(unmet).toEqual([])
  })

  it('returns nothing for a lesson with no prerequisites', () => {
    expect(unmetPrerequisitesFor(stateWith(), LESSON)).toEqual([])
  })
})
