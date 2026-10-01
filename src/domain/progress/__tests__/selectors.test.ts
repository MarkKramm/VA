import { beforeEach, describe, expect, it } from 'vitest'
import {
  bookmarkedIds,
  completedLessonCount,
  continueLesson,
  DEFAULT_STAGE_THRESHOLD,
  evidencedSkills,
  isLessonComplete,
  isLessonPractised,
  isRoadmapEnrolled,
  isStageComplete,
  MASTERY_LEVELS,
  masteryLevel,
  moduleProgress,
  roadmapProgress,
  summariseAttempts,
} from '../selectors.ts'
import { foldEvents } from '../reducer.ts'
import {
  incompleteLessons,
  resolveStages,
  type ModulePlan,
  type Plan,
  type RoadmapPlan,
} from '../../roadmap/progress.ts'
import { assessmentEligibility, hasDemonstrated, lessonAccess } from '../../roadmap/unlock.ts'
import {
  completed,
  enrolled,
  practise,
  resetEventCounter,
  viewed,
} from '../../../../tests/fixtures/progress.ts'

beforeEach(() => resetEventCounter())

describe('completion vs practice', () => {
  it('distinguishes a completed lesson from a practised one', () => {
    const readOnly = foldEvents([completed('a')])
    const didWork = foldEvents([completed('a'), practise('a')])
    expect(isLessonComplete(readOnly, 'a')).toBe(true)
    expect(isLessonPractised(readOnly, 'a')).toBe(false)
    expect(isLessonPractised(didWork, 'a')).toBe(true)
    expect(hasDemonstrated(readOnly, 'a')).toBe(false)
    expect(hasDemonstrated(didWork, 'a')).toBe(true)
  })
})

describe('moduleProgress', () => {
  it('returns 0 for an empty module rather than NaN', () => {
    expect(moduleProgress(foldEvents([]), [])).toBe(0)
  })

  it('is the share of completed lessons', () => {
    const state = foldEvents([completed('a'), completed('b')])
    expect(moduleProgress(state, ['a', 'b', 'c', 'd'])).toBe(0.5)
    expect(completedLessonCount(state, ['a', 'b', 'c', 'd'])).toBe(2)
  })
})

describe('roadmapProgress averages over stages, not over lessons', () => {
  it('returns 0 when every stage is empty', () => {
    expect(roadmapProgress(foldEvents([]), { stages: [{ moduleId: '', lessonIds: [] }] })).toBe(0)
  })

  it('cannot reach a high score by completing only the short stages', () => {
    // A roadmap whose last stage is the specialisation must not read as 90%
    // complete when the learner has skipped all of it. This is why the mean is
    // over stages rather than over lessons.
    const state = foldEvents([completed('intro-1'), completed('intro-2'), completed('intro-3')])
    const stages = [
      { moduleId: 'intro', lessonIds: ['intro-1', 'intro-2', 'intro-3'] },
      { moduleId: 'spec', lessonIds: ['spec-1', 'spec-2'] },
    ]
    expect(roadmapProgress(state, { stages })).toBe(0.5)
  })

  it('ignores empty stages entirely', () => {
    const state = foldEvents([completed('a')])
    const stages = [
      { moduleId: 'm1', lessonIds: ['a'] },
      { moduleId: 'empty', lessonIds: [] },
    ]
    expect(roadmapProgress(state, { stages })).toBe(1)
  })

  it('reaches 1 only when every stage is complete', () => {
    const state = foldEvents([completed('a'), completed('b')])
    const stages = [
      { moduleId: 'm1', lessonIds: ['a'] },
      { moduleId: 'm2', lessonIds: ['b'] },
    ]
    expect(roadmapProgress(state, { stages })).toBe(1)
  })
})

describe('stage completion', () => {
  it('uses an 80% threshold by default', () => {
    const state = foldEvents([completed('a'), completed('b'), completed('c'), completed('d')])
    const stage = { moduleId: 'm', lessonIds: ['a', 'b', 'c', 'd', 'e'] }
    expect(moduleProgress(state, stage.lessonIds)).toBe(0.8)
    expect(isStageComplete(state, stage)).toBe(true)
    expect(DEFAULT_STAGE_THRESHOLD).toBe(0.8)
  })

  it('honours an overridden threshold', () => {
    const state = foldEvents([completed('a')])
    const stage = { moduleId: 'm', lessonIds: ['a', 'b'] }
    expect(isStageComplete(state, stage)).toBe(false)
    expect(isStageComplete(state, stage, 0.5)).toBe(true)
  })
})

describe('mastery is a number internally and a level externally', () => {
  it('returns no summary for no attempts', () => {
    expect(summariseAttempts([])).toEqual({
      score: 0,
      confidence: 0,
      best: 0,
      recentMean: 0,
      attempts: 0,
    })
  })

  it('uses the best score but a recency-weighted recent mean', () => {
    const summary = summariseAttempts([
      { attemptId: 'a', at: '1', score: 10, maxScore: 10, passed: true, evaluatedBy: 'system' },
      { attemptId: 'b', at: '2', score: 4, maxScore: 10, passed: false, evaluatedBy: 'system' },
    ])
    expect(summary.best).toBe(1)
    expect(summary.recentMean).toBeCloseTo(0.7, 5)
    expect(summary.attempts).toBe(2)
  })

  it('saturates confidence rather than growing without bound', () => {
    const many = Array.from({ length: 40 }, (_unused, index) => ({
      attemptId: `a${index}`,
      at: String(index),
      score: 1,
      maxScore: 1,
      passed: true,
      evaluatedBy: 'system' as const,
    }))
    expect(summariseAttempts(many).confidence).toBe(1)
  })

  it('handles a zero max score without dividing by zero', () => {
    const summary = summariseAttempts([
      { attemptId: 'a', at: '1', score: 0, maxScore: 0, passed: false, evaluatedBy: 'self' },
    ])
    expect(summary.best).toBe(0)
  })

  it('maps a score to a level, and never exposes the raw decimal', () => {
    expect(masteryLevel(0)).toBe('not-started')
    expect(masteryLevel(0.01)).toBe('aware')
    expect(masteryLevel(0.5)).toBe('able')
    expect(masteryLevel(0.8)).toBe('proficient')
    expect(masteryLevel(1)).toBe('mastered')
    // Every level the function can return is one of the five declared levels, so
    // a UI switch statement cannot fall through to an unhandled value.
    for (const score of [0, 0.2, 0.45, 0.75, 0.95, 1]) {
      expect(MASTERY_LEVELS).toContain(masteryLevel(score))
    }
  })
})

describe('soft gating', () => {
  it('reports a lesson with met prerequisites as available', () => {
    const state = foldEvents([completed('a')])
    expect(lessonAccess(state, [{ id: 'a', reason: 'Builds on the earlier lesson.' }])).toEqual({
      state: 'available',
    })
  })

  it('warns but does NOT lock, and explains why', () => {
    const state = foldEvents([])
    const result = lessonAccess(state, [
      { id: 'a', reason: 'This lesson assumes XLOOKUP from Spreadsheet Lookups.' },
    ])
    expect(result.state).toBe('advisory')
    if (result.state === 'advisory') {
      expect(result.unmet).toHaveLength(1)
      expect(result.unmet[0]?.reason).toContain('XLOOKUP')
    }
  })

  it('treats a lesson with no prerequisites as available', () => {
    expect(lessonAccess(foldEvents([]), [])).toEqual({ state: 'available' })
  })
})

describe('the one hard lock: assessment eligibility', () => {
  const activities = { 'lesson-a': ['ex-a'], 'lesson-b': ['ex-b'] }

  it('blocks an assessment when a required lesson is not complete', () => {
    const result = assessmentEligibility(foldEvents([]), {
      requiredLessons: ['lesson-a'],
      activitiesOfLesson: activities,
      attemptedActivities: new Set(['ex-a']),
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons[0]).toContain('Complete the lesson')
  })

  it('blocks an assessment when the lesson is read but never practised', () => {
    // This is the requirement that stops a learner recording a "job ready" score
    // on the strength of checkboxes alone.
    const state = foldEvents([completed('lesson-a')])
    const result = assessmentEligibility(state, {
      requiredLessons: ['lesson-a'],
      activitiesOfLesson: activities,
      attemptedActivities: new Set(),
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons[0]).toContain('reading is not the same as doing')
  })

  it('allows the assessment once the lesson is both completed and practised', () => {
    const state = foldEvents([completed('lesson-a'), practise('lesson-a')])
    const result = assessmentEligibility(state, {
      requiredLessons: ['lesson-a'],
      activitiesOfLesson: activities,
      attemptedActivities: new Set(['ex-a']),
    })
    expect(result).toEqual({ eligible: true, reasons: [] })
  })

  it('reports every unmet requirement, not just the first', () => {
    const result = assessmentEligibility(foldEvents([]), {
      requiredLessons: ['lesson-a', 'lesson-b'],
      activitiesOfLesson: activities,
      attemptedActivities: new Set(),
    })
    expect(result.reasons).toHaveLength(2)
  })
})

describe('continue learning', () => {
  it('returns undefined when nothing has been viewed', () => {
    expect(continueLesson(foldEvents([]))).toBeUndefined()
  })

  it('skips lessons already completed', () => {
    const state = foldEvents([
      viewed('lesson-a', '2026-10-01T09:00:00.000Z'),
      completed('lesson-a', '2026-10-01T09:30:00.000Z'),
      viewed('lesson-b', '2026-10-01T10:00:00.000Z'),
    ])
    expect(continueLesson(state)).toBe('lesson-b')
  })
})

describe('bookmarks, enrolment and portfolio evidence', () => {
  it('lists bookmarked ids of one type only', () => {
    const state = foldEvents([
      { id: 'x1', at: '1', type: 'bookmark.toggled', refType: 'lesson', refId: 'a' },
      { id: 'x2', at: '2', type: 'bookmark.toggled', refType: 'tool', refId: 'canva' },
    ] as never)
    expect(bookmarkedIds(state, 'lesson')).toEqual(['a'])
    expect(bookmarkedIds(state, 'tool')).toEqual(['canva'])
  })

  it('reports enrolment', () => {
    expect(isRoadmapEnrolled(foldEvents([enrolled('beginner-va')]), 'beginner-va')).toBe(true)
    expect(isRoadmapEnrolled(foldEvents([]), 'beginner-va')).toBe(false)
  })

  it('collects the skills with portfolio evidence', () => {
    const state = foldEvents([
      {
        id: 'p1',
        at: '1',
        type: 'portfolio.artifact.added',
        artifactId: 'a1',
        roadmapId: 'r',
        skills: ['data-entry', 'data-cleaning'],
      },
      {
        id: 'p2',
        at: '2',
        type: 'portfolio.artifact.added',
        artifactId: 'a2',
        roadmapId: 'r',
        skills: ['data-entry'],
      },
    ] as never)
    expect(new Set(evidencedSkills(state))).toEqual(new Set(['data-entry', 'data-cleaning']))
  })
})

describe('roadmap plan resolution', () => {
  const plan: Plan = new Map<string, ModulePlan>([
    ['mod-a', { moduleId: 'mod-a', lessonIds: ['a1', 'a2'] }],
    ['mod-b', { moduleId: 'mod-b', lessonIds: ['b1'] }],
  ])
  const roadmap: RoadmapPlan = {
    roadmapId: 'r',
    stages: [
      { kind: 'foundation', moduleIds: ['mod-a'] },
      { kind: 'specialization', moduleIds: ['mod-b', 'mod-a'] },
    ],
  }

  it('resolves a stage to the lesson ids it covers, in order', () => {
    expect(resolveStages(roadmap, plan)).toEqual([
      { moduleId: 'mod-a', lessonIds: ['a1', 'a2'] },
      { moduleId: 'mod-b', lessonIds: ['b1', 'a1', 'a2'] },
    ])
  })

  it('lists a roadmap’s lessons in order, without duplicates', () => {
    // mod-a appears in two stages. The learner should still see each lesson once.
    expect(incompleteLessons(roadmap, plan)).toEqual(['a1', 'a2', 'b1'])
  })

  it('tolerates a module id that is not in the plan, rather than throwing', () => {
    const withGhost: RoadmapPlan = {
      roadmapId: 'r',
      stages: [{ kind: 'core', moduleIds: ['ghost'] }],
    }
    expect(incompleteLessons(withGhost, plan)).toEqual([])
  })
})
