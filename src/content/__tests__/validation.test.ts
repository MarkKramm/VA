import { describe, expect, it } from 'vitest'
import { buildRegistryFromSource, type ContentRegistry } from '../registry.ts'
import { validateRegistry } from '../validation.ts'
import {
  leafSkill,
  rootSkill,
  validCareerPath,
  validExercise,
  validLesson,
  validModule,
  validRoadmap,
  validSkill,
} from '@fixtures/content.ts'

/**
 * Validation is tested against constructed content rather than files on disk.
 * That is the only practical way to test the cases that matter most: the invalid
 * ones. A suite that can only assert "the real content is fine" proves very
 * little.
 */

const file = (data: unknown, path = 'content/test-fixture.mdx') => ({ path, data })

const withContent = (args: {
  careerPaths?: unknown[]
  skills?: unknown[]
  lessons?: unknown[]
  exercises?: unknown[]
  modules?: unknown[]
  roadmaps?: unknown[]
}): ContentRegistry =>
  buildRegistryFromSource({
    careerPaths: args.careerPaths ?? [],
    skills: args.skills ?? [],
    lessons: (args.lessons ?? []).map((data) => file(data)),
    exercises: (args.exercises ?? []).map((data) => file(data)),
    modules: (args.modules ?? []).map((data) => file(data)),
    roadmaps: (args.roadmaps ?? []).map((data) => file(data)),
  })

/** A small, entirely valid content set, used as the baseline for failure tests. */
const validSet = () => ({
  careerPaths: [validCareerPath()],
  skills: [rootSkill(), leafSkill()],
  lessons: [validLesson()],
  exercises: [validExercise()],
  modules: [validModule()],
  roadmaps: [validRoadmap()],
})

const errorsFor = (registry: ContentRegistry, rule?: string) =>
  validateRegistry(registry).issues.filter(
    (issue) => issue.severity === 'error' && (rule ? issue.rule === rule : true),
  )

describe('referential integrity', () => {
  it('accepts content where every reference resolves', () => {
    expect(errorsFor(withContent(validSet()), 'referential-integrity')).toEqual([])
  })

  it('rejects a roadmap pointing at a career path that does not exist', () => {
    const registry = withContent({
      ...validSet(),
      roadmaps: [validRoadmap({ careerPath: 'ghost' })],
    })
    const issues = errorsFor(registry, 'referential-integrity')
    expect(issues).toHaveLength(1)
    expect(issues[0]?.field).toBe('careerPath')
    expect(issues[0]?.message).toContain('ghost')
    // A real failure always names a file a human can open. Referential-integrity
    // issues are reported against the conventional path derived from the id,
    // which is where the file actually lives for real content.
    expect(issues[0]?.path).toBe('content/roadmaps/data-entry-va.mdx')
  })

  it('names the exact stage and module index of a bad reference', () => {
    const registry = withContent({
      ...validSet(),
      roadmaps: [
        validRoadmap({
          stages: [
            { kind: 'core' as const, modules: ['data-cleaning'] },
            { kind: 'assessment' as const, modules: ['ghost-module'] },
          ],
        }),
      ],
    })
    expect(errorsFor(registry, 'referential-integrity')[0]?.field).toBe('stages[1].modules[0]')
  })

  it('rejects a lesson prerequisite that does not exist', () => {
    const registry = withContent({
      ...validSet(),
      lessons: [
        validLesson({
          prerequisites: [{ id: 'ghost-lesson', reason: 'Builds on the earlier lesson.' }],
        }),
      ],
    })
    expect(errorsFor(registry, 'referential-integrity')[0]?.field).toBe('prerequisites[0].id')
  })

  it('rejects a lesson referencing a skill that does not exist', () => {
    const registry = withContent({
      ...validSet(),
      lessons: [validLesson({ skills: ['nope'] })],
    })
    expect(errorsFor(registry, 'referential-integrity')[0]?.message).toContain('nope')
  })

  it('rejects a skill whose parent does not exist', () => {
    const registry = withContent({
      ...validSet(),
      skills: [rootSkill(), leafSkill({ parent: 'ghost' })],
    })
    const issues = errorsFor(registry, 'referential-integrity')
    const skillIssue = issues.find((issue) => issue.entity === 'skill')
    expect(skillIssue?.field).toBe('parent')
    expect(skillIssue?.message).toContain('ghost')
  })

  it('does NOT fail references to collections that do not exist yet', () => {
    // tools, quizzes and labs arrive at M5, M4 and M6. A lesson may stage them,
    // and the build must not block work in progress.
    const registry = withContent({
      ...validSet(),
      lessons: [validLesson({ tools: ['canva'], lab: 'phishing-spotting' })],
    })
    expect(errorsFor(registry, 'referential-integrity')).toEqual([])
  })

  it('rejects a lesson referencing an exercise that does not exist (M2.4)', () => {
    // The lesson owns the reference, so this is what makes "every lesson reaches
    // practice" real: a name that resolves to nothing fails the build.
    const registry = withContent({
      ...validSet(),
      lessons: [validLesson({ exercises: ['ghost-exercise'] })],
    })
    const issues = errorsFor(registry, 'referential-integrity')
    expect(issues[0]?.field).toBe('exercises[0]')
    expect(issues[0]?.message).toContain('ghost-exercise')
  })

  it('rejects an exercise referencing a skill that does not exist (M2.4)', () => {
    const registry = withContent({
      ...validSet(),
      exercises: [validExercise({ skills: ['nope'] })],
    })
    const issue = errorsFor(registry, 'referential-integrity').find((i) => i.entity === 'exercise')
    expect(issue?.field).toBe('skills')
    expect(issue?.message).toContain('nope')
  })

  it('fails CLOSED when a lesson references an exercise but no exercise collection exists', () => {
    // The exercise collection is optional at the fixture seam, but omitting it is
    // NOT a way to skip the reference: `validLesson` names `clean-a-sheet` by
    // default, and with no exercises provided that is an error. Fail-open here
    // would let a lesson claim practice it cannot deliver.
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [rootSkill(), leafSkill()],
      lessons: [{ path: 'content/lessons/x/cleaning-a-spreadsheet.mdx', data: validLesson() }],
      modules: [],
      roadmaps: [],
    })
    expect(
      errorsFor(registry, 'referential-integrity').some((i) => i.field === 'exercises[0]'),
    ).toBe(true)
  })
})

describe('schema validation', () => {
  it('rejects a lesson with no objectives', () => {
    const issues = errorsFor(withContent({ lessons: [validLesson({ objectives: [] })] }), 'schema')
    expect(issues[0]?.entity).toBe('lesson')
    expect(issues[0]?.message).toMatch(/too small|at least 1/i)
  })

  it('rejects a non-slug id', () => {
    expect(
      errorsFor(withContent({ lessons: [validLesson({ id: 'Not A Slug' })] }), 'schema')[0]?.field,
    ).toBe('id')
  })

  it('rejects a roadmap with no lane, because the field is required on purpose', () => {
    const { lane: _ignored, ...withoutLane } = validRoadmap()
    const issues = errorsFor(withContent({ roadmaps: [withoutLane] }), 'schema')
    expect(issues.some((issue) => issue.field === 'lane')).toBe(true)
  })

  it('rejects a stage with no modules', () => {
    const registry = withContent({
      roadmaps: [validRoadmap({ stages: [{ kind: 'core' as const, modules: [] }] })],
    })
    expect(errorsFor(registry, 'schema').length).toBeGreaterThan(0)
  })

  it('rejects a roadmap with no outcomes, because readiness depends on them', () => {
    const registry = withContent({ roadmaps: [validRoadmap({ outcomes: [] })] })
    expect(errorsFor(registry, 'schema')[0]?.entity).toBe('roadmap')
  })

  it('drops an invalid entity rather than keeping partial data', () => {
    const registry = withContent({ lessons: [validLesson({ id: 'Bad Id' })] })
    expect(registry.lessons.size).toBe(0)
  })
})

describe('cycles', () => {
  it('detects a skill parent cycle', () => {
    // Ids must be at least two characters, so single letters are not valid
    // fixtures — a detail worth knowing about the schema.
    const registry = withContent({
      skills: [
        validSkill({ id: 'alpha', parent: 'beta' }),
        validSkill({ id: 'beta', parent: 'alpha' }),
      ],
    })
    expect(errorsFor(registry, 'cycle')[0]?.message).toContain('cycle detected')
  })

  it('detects a career-path parent cycle', () => {
    const registry = withContent({
      careerPaths: [
        validCareerPath({ id: 'x-ray', parent: 'yankee' }),
        validCareerPath({ id: 'yankee', parent: 'x-ray', order: 1 }),
      ],
    })
    expect(errorsFor(registry, 'cycle').length).toBeGreaterThan(0)
  })

  it('detects a lesson prerequisite cycle', () => {
    const registry = withContent({
      ...validSet(),
      lessons: [
        validLesson({
          id: 'lesson-first',
          prerequisites: [{ id: 'lesson-second', reason: 'Builds on the second lesson.' }],
        }),
        validLesson({
          id: 'lesson-second',
          prerequisites: [{ id: 'lesson-first', reason: 'Builds on the first lesson.' }],
        }),
      ],
    })
    const cycles = errorsFor(registry, 'cycle')
    expect(cycles.length).toBeGreaterThan(0)
    expect(cycles[0]?.message).toMatch(/lesson-first.*lesson-second|lesson-second.*lesson-first/)
  })

  it('detects a cycle that does not pass through a first prerequisite', () => {
    // The naive implementation follows only the first prerequisite of each node
    // and misses this entirely. Three lessons, cycle via the second prerequisite.
    const registry = withContent({
      lessons: [
        validLesson({ id: 'lesson-one' }),
        validLesson({
          id: 'lesson-two',
          prerequisites: [
            { id: 'lesson-one', reason: 'Starts from the first lesson here.' },
            { id: 'lesson-three', reason: 'Also needs the third lesson.' },
          ],
        }),
        validLesson({
          id: 'lesson-three',
          prerequisites: [{ id: 'lesson-two', reason: 'Loops back to the second lesson.' }],
        }),
      ],
    })
    expect(errorsFor(registry, 'cycle').length).toBeGreaterThan(0)
  })

  it('accepts a normal hierarchy, which is not a cycle', () => {
    expect(errorsFor(withContent(validSet()), 'cycle')).toEqual([])
  })
})

describe('orphans are warnings, not errors', () => {
  it('warns about a lesson in no module without failing the build', () => {
    const registry = withContent({
      ...validSet(),
      lessons: [validLesson(), validLesson({ id: 'stray-lesson', title: 'A Stray Lesson' })],
    })
    const summary = validateRegistry(registry)
    const orphan = summary.issues.find(
      (issue) => issue.rule === 'orphan' && issue.entity === 'lesson',
    )
    expect(orphan?.severity).toBe('warning')
    expect([orphan?.path, orphan?.message].join(' ')).toContain('stray-lesson')
    expect(summary.errors).toBe(0)
  })
})

describe('provenance', () => {
  it('rejects published content with no named reviewer', () => {
    const registry = withContent({
      ...validSet(),
      lessons: [validLesson({ status: 'published' as const })],
    })
    const issue = errorsFor(registry, 'provenance')[0]
    expect(issue?.message).toMatch(/reviewedBy/)
    expect(issue?.severity).toBe('error')
  })

  it('accepts published content with a named reviewer', () => {
    const registry = withContent({
      ...validSet(),
      lessons: [
        validLesson({
          status: 'published' as const,
          reviewedBy: 'MarkKramm',
          reviewedAt: '2026-10-01',
        }),
      ],
    })
    expect(errorsFor(registry, 'provenance')).toEqual([])
  })

  it('does not require a reviewer for draft content', () => {
    expect(errorsFor(withContent(validSet()), 'provenance')).toEqual([])
  })
})
