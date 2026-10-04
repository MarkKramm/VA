import { describe, expect, it } from 'vitest'
import { buildRegistry, buildRegistryFromSource, registry } from '../registry.ts'
import { validateRegistry } from '../validation.ts'
import {
  validCareerPath,
  validExercise,
  validLesson,
  validModule,
  validRoadmap,
  validSkill,
} from '../../../tests/fixtures/content.ts'

describe('the real M0 content', () => {
  it('loads with no schema errors', () => {
    const schemaErrors = registry.issues.filter((issue) => issue.rule === 'schema')
    expect(
      schemaErrors,
      schemaErrors.map((i) => `${i.path} ${i.field}: ${i.message}`).join('\n'),
    ).toEqual([])
  })

  it('indexes every entity by id', () => {
    expect(registry.careerPaths.size).toBe(16)
    expect(registry.roadmaps.size).toBe(2)
    expect(registry.modules.size).toBe(2)
    expect(registry.lessons.size).toBe(4)
    expect(registry.exercises.size).toBeGreaterThanOrEqual(1)
    expect(registry.skills.size).toBeGreaterThan(10)
  })

  it('reports a non-zero content payload, so the eager-glob question is measurable', () => {
    expect(registry.payloadBytes).toBeGreaterThan(0)
  })

  it('attaches a compiled body to every real lesson, keyed by lesson id (M2.2)', () => {
    // The body must be reachable by ID — the stable identity a route uses — not by
    // the file path it happens to live at. A lesson with no body would render an
    // empty page, so every real lesson must have one.
    expect(registry.lessonBodies.size).toBe(registry.lessons.size)
    for (const lessonId of registry.lessons.keys()) {
      const body = registry.lessonBodies.get(lessonId)
      expect(body, `lesson ${lessonId} has no compiled body`).toBeDefined()
      expect(body?.length).toBeGreaterThan(0)
    }
  })

  it('produces a body whose root nodes are all valid compiled kinds', () => {
    for (const body of registry.lessonBodies.values()) {
      for (const node of body) {
        expect(['text', 'element', 'component']).toContain(node.kind)
      }
    }
  })

  it('lists the collections this milestone has not built yet, and no longer lists activated ones', () => {
    for (const pending of ['tools', 'resources', 'labs', 'assessments', 'topics']) {
      expect(registry.pendingCollections).toContain(pending)
    }
    // M2.4 activated the exercise collection, and M4.1 activated questions and
    // quizzes, so none of the three may still be pending — a collection that is
    // registered has its references CHECKED rather than skipped.
    expect(registry.pendingCollections).not.toContain('exercises')
    expect(registry.pendingCollections).not.toContain('questions')
    expect(registry.pendingCollections).not.toContain('quizzes')
  })

  it('attaches a compiled body to every real exercise, keyed by exercise id (M2.4)', () => {
    // Same contract as lesson bodies: the body is reachable by the stable id,
    // and an exercise with no body would render an empty Practice card.
    expect(registry.exerciseBodies.size).toBe(registry.exercises.size)
    for (const exerciseId of registry.exercises.keys()) {
      const body = registry.exerciseBodies.get(exerciseId)
      expect(body, `exercise ${exerciseId} has no compiled body`).toBeDefined()
      expect(body?.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate ids', () => {
    expect(validateRegistry(registry).issues.filter((i) => i.rule === 'duplicate-id')).toEqual([])
  })

  it('resolves every reference', () => {
    expect(
      validateRegistry(registry).issues.filter((i) => i.rule === 'referential-integrity'),
    ).toEqual([])
  })

  it('has no cycles', () => {
    expect(validateRegistry(registry).issues.filter((i) => i.rule === 'cycle')).toEqual([])
  })

  it('has no orphans, because the M0 content set is deliberately complete', () => {
    const orphans = validateRegistry(registry).issues.filter((i) => i.rule === 'orphan')
    expect(orphans.map((i) => `${i.entity}: ${i.message}`)).toEqual([])
  })

  it('publishes nothing, because nothing has been human-reviewed yet', () => {
    const published = [
      ...registry.lessons.values(),
      ...registry.modules.values(),
      ...registry.roadmaps.values(),
    ].filter((entity) => entity.status === 'published')
    expect(published).toEqual([])
  })
})

describe('buildRegistry is deterministic', () => {
  it('produces the same indexes on repeated calls', () => {
    const a = buildRegistry()
    const b = buildRegistry()
    expect([...a.lessons.keys()]).toEqual([...b.lessons.keys()])
    expect([...a.moduleRoadmapIds.entries()]).toEqual([...b.moduleRoadmapIds.entries()])
    expect(a.payloadBytes).toBe(b.payloadBytes)
  })
})

describe('buildRegistryFromSource', () => {
  it('can be built from fixture content rather than files on disk', () => {
    const built = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [validSkill({ id: 'data', parent: undefined }), validSkill()],
      lessons: [{ path: 'content/fixture.mdx', data: validLesson() }],
      exercises: [{ path: 'content/fixture-exercise.mdx', data: validExercise() }],
      modules: [{ path: 'content/fixture.mdx', data: validModule() }],
      roadmaps: [{ path: 'content/fixture.mdx', data: validRoadmap() }],
    })
    expect(built.lessons.size).toBe(1)
    expect(built.exercises.size).toBe(1)
    // The reverse index is derived from the lesson side, so the exercise knows
    // which lessons use it without ever naming one itself.
    expect(built.exerciseLessonIds.get('clean-a-sheet')).toEqual(['cleaning-a-spreadsheet'])
    expect(built.moduleRoadmapIds.get('data-cleaning')).toEqual(['data-entry-va'])
    expect(built.issues).toEqual([])
  })

  it('reports zero payload bytes for source that is not the real content', () => {
    const built = buildRegistryFromSource({
      careerPaths: [],
      skills: [],
      lessons: [],
      modules: [],
      roadmaps: [],
    })
    expect(built.payloadBytes).toBe(0)
  })
})
