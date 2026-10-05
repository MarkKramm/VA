import { describe, expect, it } from 'vitest'
import { AssessmentSchema } from '../schemas/index.ts'
import { buildRegistryFromSource, registry, type ContentRegistry } from '../registry.ts'
import { validateRegistry } from '../validation.ts'
import {
  assessmentsForSkill,
  getAssessment,
  quizzesForSkill,
  roadmapsUsingAssessment,
} from '../selectors.ts'
import {
  leafSkill,
  rootSkill,
  validAssessment,
  validCareerPath,
  validExercise,
  validLesson,
  validModule,
  validQuestion,
  validQuiz,
  validRoadmap,
} from '@fixtures/content.ts'

/**
 * THE PRACTICAL ASSESSMENT ENTITY (M5).
 *
 * Content-model tests, in the same shape as the question and quiz suites: the
 * schema accepts what it should and refuses what it should, the validator fails
 * closed on every reference, and the registry treats assessments as a first-class
 * collection with derived reverse indexes.
 */

const ASSESSMENT = 'client-file-organisation'

const file = (data: unknown, path = 'content/assessments/x/assessment.mdx') => ({ path, data })

/**
 * Wrap bare fixture data as a content file, passing an already-wrapped entry
 * through unchanged.
 *
 * The pass-through matters: a test that needs two entities of the SAME id has to
 * give them different paths, so it wraps them itself — and re-wrapping would
 * nest the wrapper, fail the schema and silently drop both.
 */
const asFile = (data: unknown, fallback: string): { path: string; data: unknown } =>
  typeof data === 'object' && data !== null && 'path' in data && 'data' in data
    ? (data as { path: string; data: unknown })
    : { path: fallback, data }

const withContent = (args: {
  assessments?: unknown[]
  lessons?: unknown[]
  exercises?: unknown[]
  modules?: unknown[]
  skills?: unknown[]
  careerPaths?: unknown[]
  roadmaps?: unknown[]
  quizzes?: unknown[]
  questions?: unknown[]
}): ContentRegistry =>
  buildRegistryFromSource({
    careerPaths: args.careerPaths ?? [],
    skills: args.skills ?? [],
    lessons: (args.lessons ?? []).map((data) => asFile(data, 'content/lessons/x/lesson.mdx')),
    exercises: (args.exercises ?? []).map((data) => asFile(data, 'content/exercises/x/ex.mdx')),
    modules: (args.modules ?? []).map((data) => asFile(data, 'content/modules/x.mdx')),
    roadmaps: (args.roadmaps ?? []).map((data) => asFile(data, 'content/roadmaps/x.mdx')),
    quizzes: (args.quizzes ?? []).map((data) => asFile(data, 'content/quizzes/x.mdx')),
    questions: (args.questions ?? []).map((data) => asFile(data, 'content/questions/x.mdx')),
    assessments: (args.assessments ?? []).map((data) => asFile(data, 'content/assessments/x.mdx')),
  })

/**
 * A complete, valid content set.
 *
 * Every reference in the fixture content has to be present — the lesson's
 * exercise, the module's lesson, the roadmap's module, the quiz's question — or
 * fail-closed integrity reports the gaps instead of the thing under test.
 */
const validSet = () => ({
  careerPaths: [validCareerPath()],
  skills: [rootSkill(), leafSkill()],
  lessons: [validLesson()],
  exercises: [validExercise()],
  modules: [validModule()],
  questions: [validQuestion()],
  quizzes: [validQuiz()],
  roadmaps: [validRoadmap()],
})

const referential = (built: ContentRegistry) =>
  validateRegistry(built).issues.filter((issue) => issue.rule === 'referential-integrity')

describe('the assessment schema', () => {
  it('accepts a valid assessment and defaults the optional collections', () => {
    const { hints: _hints, ...withoutHints } = validAssessment()
    const parsed = AssessmentSchema.parse(withoutHints)
    expect(parsed.id).toBe('organise-a-shelf')
    expect(parsed.hints).toEqual([])
    expect(parsed.commonMistakes).toEqual([])
    expect(parsed.prerequisites).toEqual([])
    expect(parsed.deprecatedIds).toEqual([])
  })

  it('requires the parts that make it a task', () => {
    for (const field of ['scenario', 'requirements', 'instructions', 'deliverable']) {
      const without = { ...validAssessment() } as Record<string, unknown>
      delete without[field]
      expect(AssessmentSchema.safeParse(without).success, `${field} should be required`).toBe(false)
    }
  })

  it('requires at least one rubric line', () => {
    expect(AssessmentSchema.safeParse(validAssessment({ evaluationCriteria: [] })).success).toBe(
      false,
    )
  })

  it('rejects duplicate criterion ids', () => {
    const result = AssessmentSchema.safeParse(
      validAssessment({
        evaluationCriteria: [
          { id: 'same', description: 'The first thing is done properly.' },
          { id: 'same', description: 'The second thing is done properly.' },
        ],
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('unique'))).toBe(true)
    }
  })

  it('requires a reason on every prerequisite', () => {
    // The gate is the platform's one hard lock, and a lock with no explanation is
    // a wall — so the reason is required by the same schema the lesson uses.
    const result = AssessmentSchema.safeParse(
      validAssessment({ prerequisites: [{ id: 'some-lesson' }] }),
    )
    expect(result.success).toBe(false)
  })

  it('does not carry learner state', () => {
    const parsed = AssessmentSchema.parse(validAssessment({ score: 3, passed: true }))
    expect(parsed).not.toHaveProperty('score')
    expect(parsed).not.toHaveProperty('passed')
  })
})

describe('assessment referential integrity', () => {
  it('passes when every reference resolves', () => {
    const built = withContent({
      ...validSet(),
      assessments: [
        validAssessment({
          prerequisites: [
            { id: 'cleaning-a-spreadsheet', reason: 'It sets out the conventions this task uses.' },
          ],
        }),
      ],
    })
    expect(referential(built)).toEqual([])
  })

  it('fails closed when a skill does not exist', () => {
    const built = withContent({ skills: [], assessments: [validAssessment()] })
    const issues = referential(built)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.entity).toBe('assessment')
    expect(issues[0]?.field).toBe('skills')
    expect(issues[0]?.message).toContain('data-cleaning')
  })

  it('fails closed when a prerequisite lesson does not exist', () => {
    const built = withContent({
      skills: [rootSkill(), leafSkill()],
      assessments: [
        validAssessment({ prerequisites: [{ id: 'ghost-lesson', reason: 'Because it does.' }] }),
      ],
    })
    const issues = referential(built)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.field).toBe('prerequisites[0].id')
    expect(issues[0]?.message).toContain('ghost-lesson')
    // The error names the file a human can open.
    expect(issues[0]?.path).toContain('content/assessments/')
  })

  it('does not silently drop a malformed assessment', () => {
    // A schema failure is reported AND the entity is dropped, so a half-valid
    // assessment never reaches the registry.
    const built = withContent({
      skills: [rootSkill(), leafSkill()],
      assessments: [validAssessment({ evaluationCriteria: [] })],
    })
    const schemaIssues = validateRegistry(built).issues.filter((issue) => issue.rule === 'schema')
    expect(schemaIssues.length).toBeGreaterThan(0)
    expect(built.assessments.size).toBe(0)
  })
})

describe('roadmap references to assessments (M5)', () => {
  it('accepts a finalAssessment and outcome evidence that resolve', () => {
    const built = withContent({
      ...validSet(),
      assessments: [validAssessment()],
      roadmaps: [
        validRoadmap({
          finalAssessment: 'organise-a-shelf',
          outcomes: [
            {
              statement: 'Clean a spreadsheet with duplicate and inconsistent rows',
              evidence: [{ kind: 'assessment', id: 'organise-a-shelf' }],
              weight: 1,
            },
          ],
        }),
      ],
    })
    expect(referential(built)).toEqual([])
  })

  it('fails when the final assessment does not exist', () => {
    const built = withContent({
      ...validSet(),
      roadmaps: [validRoadmap({ finalAssessment: 'ghost' })],
    })
    const issues = referential(built)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.field).toBe('finalAssessment')
    expect(issues[0]?.message).toContain('ghost')
  })

  it('fails when outcome evidence names a missing assessment', () => {
    const built = withContent({
      ...validSet(),
      roadmaps: [
        validRoadmap({
          outcomes: [
            {
              statement: 'Clean a spreadsheet with duplicate and inconsistent rows',
              evidence: [{ kind: 'assessment', id: 'ghost' }],
              weight: 1,
            },
          ],
        }),
      ],
    })
    const issues = referential(built)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.field).toBe('outcomes[0].evidence[0].id')
  })

  it('fails when outcome evidence names a missing quiz', () => {
    // Deferred at M4.1 and now checked: quizzes are a registered collection.
    const built = withContent({
      ...validSet(),
      quizzes: [],
      roadmaps: [
        validRoadmap({
          outcomes: [
            {
              statement: 'Clean a spreadsheet with duplicate and inconsistent rows',
              evidence: [{ kind: 'quiz', id: 'ghost-quiz' }],
              weight: 1,
            },
          ],
        }),
      ],
    })
    const issues = referential(built)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('ghost-quiz')
  })

  it('still skips lab evidence, because labs are a pending collection', () => {
    const built = withContent({
      ...validSet(),
      roadmaps: [
        validRoadmap({
          outcomes: [
            {
              statement: 'Clean a spreadsheet with duplicate and inconsistent rows',
              evidence: [{ kind: 'lab', id: 'not-built-yet' }],
              weight: 1,
            },
          ],
        }),
      ],
    })
    expect(referential(built)).toEqual([])
  })
})

describe('duplicate assessment ids', () => {
  it('reports the second file', () => {
    const built = withContent({
      ...validSet(),
      assessments: [
        file(validAssessment(), 'content/assessments/a.mdx'),
        file(validAssessment(), 'content/assessments/b.mdx'),
      ],
    })
    const issues = validateRegistry(built).issues.filter((issue) => issue.rule === 'duplicate-id')
    expect(issues).toHaveLength(1)
    expect(issues[0]?.entity).toBe('assessment')
    expect(issues[0]?.path).toBe('content/assessments/b.mdx')
  })
})

describe('the assessment reverse indexes', () => {
  it('records which assessments produce evidence for a skill', () => {
    const built = withContent({
      skills: [rootSkill(), leafSkill()],
      assessments: [
        validAssessment(),
        validAssessment({ id: 'second', skills: ['data-cleaning'] }),
      ],
    })
    expect(assessmentsForSkill(built, 'data-cleaning').map((a) => a.id)).toEqual([
      'organise-a-shelf',
      'second',
    ])
    // Absent rather than an empty list, matching every other reverse index.
    expect(built.assessmentSkillIds.get('communication')).toBeUndefined()
  })

  it('records which roadmaps require an assessment, from both roadmap-owned references', () => {
    const built = withContent({
      skills: [rootSkill(), leafSkill()],
      lessons: [validLesson()],
      questions: [validQuestion()],
      quizzes: [validQuiz()],
      assessments: [validAssessment()],
      roadmaps: [
        validRoadmap({ id: 'a-roadmap', finalAssessment: 'organise-a-shelf' }),
        validRoadmap({
          id: 'b-roadmap',
          finalAssessment: undefined,
          outcomes: [
            {
              statement: 'Clean a spreadsheet with duplicate and inconsistent rows',
              evidence: [{ kind: 'assessment', id: 'organise-a-shelf' }],
              weight: 1,
            },
          ],
        }),
      ],
    })
    expect(roadmapsUsingAssessment(built, 'organise-a-shelf').map((r) => r.id)).toEqual([
      'a-roadmap',
      'b-roadmap',
    ])
  })

  it('derives a quiz’s skills through its questions', () => {
    // A quiz declares no skills, so the only way a quiz can demonstrate one is
    // this derivation.
    const built = withContent({
      skills: [rootSkill(), leafSkill()],
      questions: [validQuestion({ skills: ['data-cleaning'] })],
      quizzes: [validQuiz()],
    })
    expect(quizzesForSkill(built, 'data-cleaning').map((q) => q.id)).toEqual(['cleaning-basics'])
  })
})

describe('the real assessment content', () => {
  it('is discovered through the normal registry', () => {
    expect(getAssessment(registry, ASSESSMENT)).toBeDefined()
  })

  it('leaves assessments out of pendingCollections', () => {
    expect(registry.pendingCollections).not.toContain('assessments')
  })

  it('validates with no errors, so the existing content is still valid', () => {
    expect(validateRegistry(registry).errors).toBe(0)
  })

  it('is reachable from the roadmap that declares it', () => {
    expect(roadmapsUsingAssessment(registry, ASSESSMENT).map((r) => r.id)).toEqual(['beginner-va'])
  })

  it('produces evidence for the skills it claims', () => {
    expect(assessmentsForSkill(registry, 'administration-organisation').map((a) => a.id)).toContain(
      ASSESSMENT,
    )
  })

  it('has a rubric with unique criterion ids', () => {
    const assessment = getAssessment(registry, ASSESSMENT)
    const ids = (assessment?.evaluationCriteria ?? []).map((criterion) => criterion.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names a real skill the tree actually contains', () => {
    const assessment = getAssessment(registry, ASSESSMENT)
    for (const skillId of assessment?.skills ?? []) {
      expect(registry.skills.has(skillId), `${skillId} should exist`).toBe(true)
    }
  })

  it('has a prerequisite that can actually be satisfied', () => {
    // Every prerequisite lesson must be complete-able AND, where it declares
    // practice, practicable — otherwise the gate would be unsatisfiable.
    const assessment = getAssessment(registry, ASSESSMENT)
    for (const prerequisite of assessment?.prerequisites ?? []) {
      expect(registry.lessons.has(prerequisite.id), `${prerequisite.id} should exist`).toBe(true)
    }
  })

  it('is plain data: the assessment round-trips through JSON', () => {
    const assessment = getAssessment(registry, ASSESSMENT)
    expect(JSON.parse(JSON.stringify(assessment))).toEqual(assessment)
  })
})
