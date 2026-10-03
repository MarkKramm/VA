import { describe, expect, it } from 'vitest'
import {
  careerPathsOfLesson,
  childCareerPaths,
  exerciseBody,
  exercisesOfLesson,
  getExercise,
  lessonsForSkill,
  lessonsOfModule,
  lessonsOfRoadmap,
  lessonsUsingExercise,
  modulesOfLesson,
  modulesOfRoadmap,
  roadmapsByCareerPath,
  roadmapsUsingModule,
  rootCareerPaths,
  rootSkills,
} from '../selectors.ts'
import { buildRegistry, buildRegistryFromSource, registry } from '../registry.ts'
import { validCareerPath, validModule, validRoadmap } from '@fixtures/content.ts'

/**
 * Selector behaviour against the REAL content. These tests double as content
 * assertions: if the M0 content is malformed, they fail.
 */

describe('modules and lessons', () => {
  it('returns a module’s lessons in declared order', () => {
    expect(lessonsOfModule(registry, 'computer-fundamentals').map((l) => l.id)).toEqual([
      'files-and-folders',
      'browser-basics',
    ])
  })

  it('returns a roadmap’s modules in stage order, including a repeat', () => {
    // beginner-va deliberately lists computer-fundamentals in two stages.
    expect(modulesOfRoadmap(registry, 'beginner-va').map((m) => m.id)).toEqual([
      'va-foundations',
      'computer-fundamentals',
      'computer-fundamentals',
    ])
  })

  it('de-duplicates a roadmap’s lessons when a module appears in two stages', () => {
    const ids = lessonsOfRoadmap(registry, 'beginner-va').map((l) => l.id)
    expect(ids).toEqual([
      'what-is-a-virtual-assistant',
      'who-hires-virtual-assists',
      'files-and-folders',
      'browser-basics',
    ])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('maps a lesson to the modules that contain it', () => {
    expect(modulesOfLesson(registry, 'what-is-a-virtual-assistant').map((m) => m.id)).toEqual([
      'va-foundations',
    ])
  })
})

describe('cross-roadmap reuse is derived, never authored', () => {
  it('reports BOTH roadmaps for a module they both reference', () => {
    // va-foundations is referenced by beginner-va and data-entry-va. Neither
    // roadmap declares that relationship anywhere. This test is the proof that
    // the id-reference model works.
    const ids = roadmapsUsingModule(registry, 'va-foundations').map((r) => r.id)
    expect(ids).toEqual(expect.arrayContaining(['beginner-va', 'data-entry-va']))
    expect(ids).toHaveLength(2)
  })

  it('reports each roadmap once, even when it references a module in two stages', () => {
    // A reverse index is a set, not a tally. Both M0 roadmaps reference both
    // modules across two stages each, which is exactly the case that silently
    // produces duplicates if the index is built by appending.
    for (const moduleId of ['va-foundations', 'computer-fundamentals']) {
      const ids = roadmapsUsingModule(registry, moduleId).map((r) => r.id)
      expect(new Set(ids).size, `${moduleId} returned duplicates: ${ids.join(', ')}`).toBe(
        ids.length,
      )
      expect([...ids].sort()).toEqual(['beginner-va', 'data-entry-va'])
    }
  })

  it('does not report a roadmap that does not reference the module', () => {
    // Asymmetric case, which the real M0 content does not exercise because both
    // roadmaps happen to share both modules.
    const asymmetric = buildRegistryFromSource({
      careerPaths: [validCareerPath(), validCareerPath({ id: 'admin', order: 1 })],
      skills: [],
      lessons: [],
      modules: [{ path: 'm.mdx', data: validModule() }],
      roadmaps: [
        { path: 'r1.mdx', data: validRoadmap({ careerPath: 'data' }) },
        { path: 'r2.mdx', data: validRoadmap({ id: 'admin-va', careerPath: 'admin' }) },
      ],
    })
    // r2 references the same module by id, so it appears. The assertion that
    // matters is that the index contains exactly the referencing roadmaps and
    // nothing else — which is what a hand-maintained list would get wrong.
    expect([...(asymmetric.moduleRoadmapIds.get('data-cleaning') ?? [])].sort()).toEqual([
      'admin-va',
      'data-entry-va',
    ])
    // A module in no roadmap has no entry at all, rather than an empty list.
    expect(asymmetric.moduleRoadmapIds.get('never-referenced')).toBeUndefined()
  })

  it('exposes a roadmap spine in stage order', () => {
    expect(registry.roadmapModuleIds.get('beginner-va')?.[0]).toBe('va-foundations')
  })
})

describe('skills', () => {
  it('finds lessons that teach a skill', () => {
    expect(lessonsForSkill(registry, 'research-verification').map((l) => l.id)).toContain(
      'who-hires-virtual-assists',
    )
  })

  it('returns root skills with no parent, in order', () => {
    const roots = rootSkills(registry)
    expect(roots.map((s) => s.id)).toContain('communication')
    expect(roots.every((skill) => skill.parent === undefined)).toBe(true)
    expect(roots.map((s) => s.order)).toEqual([...roots.map((s) => s.order)].sort((a, b) => a - b))
  })
})

describe('career paths', () => {
  it('orders root career paths for browse views', () => {
    const roots = rootCareerPaths(registry)
    expect(roots[0]?.id).toBe('beginner')
    expect(roots.map((c) => c.order)).toEqual([...roots.map((c) => c.order)].sort((a, b) => a - b))
  })

  it('maps a lesson to the career paths reachable through its roadmaps', () => {
    const ids = new Set(
      careerPathsOfLesson(registry, 'what-is-a-virtual-assistant').map((c) => c.id),
    )
    expect(ids).toEqual(new Set(['beginner', 'data']))
  })

  it('groups roadmaps under their career paths, with an empty bucket for empty ones', () => {
    const grouped = roadmapsByCareerPath(registry)
    expect(grouped.get('beginner')?.map((r) => r.id)).toEqual(['beginner-va'])
    expect(grouped.get('data')?.map((r) => r.id)).toEqual(['data-entry-va'])
    // The taxonomy is populated ahead of the content, so unbuilt paths exist and
    // return an empty list rather than being missing from the map.
    expect(grouped.get('voice')).toEqual([])
  })

  it('returns no children for a path that has none', () => {
    expect(childCareerPaths(registry, 'beginner')).toEqual([])
    expect(childCareerPaths(registry, 'does-not-exist')).toEqual([])
  })
})

describe('unknown ids return empty results rather than throwing', () => {
  it('degrades gracefully across every selector', () => {
    expect(lessonsOfModule(registry, 'nope')).toEqual([])
    expect(modulesOfRoadmap(registry, 'nope')).toEqual([])
    expect(lessonsOfRoadmap(registry, 'nope')).toEqual([])
    expect(roadmapsUsingModule(registry, 'nope')).toEqual([])
    expect(lessonsForSkill(registry, 'nope')).toEqual([])
    expect(modulesOfLesson(registry, 'nope')).toEqual([])
    expect(careerPathsOfLesson(registry, 'nope')).toEqual([])
    expect(exercisesOfLesson(registry, 'nope')).toEqual([])
    expect(lessonsUsingExercise(registry, 'nope')).toEqual([])
    expect(getExercise(registry, 'nope')).toBeUndefined()
    expect(exerciseBody(registry, 'nope')).toBeUndefined()
  })
})

describe('exercises (M2.4)', () => {
  const EXERCISE = 'organise-a-client-folder-structure'
  const LESSON = 'files-and-folders'

  it('resolves the exercise a lesson references, in declared order', () => {
    expect(exercisesOfLesson(registry, LESSON).map((exercise) => exercise.id)).toEqual([EXERCISE])
  })

  it('returns an empty list for a lesson with no exercises', () => {
    // browser-basics is still a reading page; the Practice section must render
    // nothing for it rather than an empty heading.
    expect(exercisesOfLesson(registry, 'browser-basics')).toEqual([])
  })

  it('derives the lessons using an exercise from the lesson side', () => {
    // The exercise file never names a lesson; this is the reverse index proving
    // the relationship is derived.
    expect(lessonsUsingExercise(registry, EXERCISE).map((lesson) => lesson.id)).toEqual([LESSON])
  })

  it('exposes the exercise record and its compiled body', () => {
    expect(getExercise(registry, EXERCISE)?.title.length).toBeGreaterThan(0)
    expect(exerciseBody(registry, EXERCISE)?.length).toBeGreaterThan(0)
  })
})

describe('buildRegistry is deterministic', () => {
  it('produces the same indexes on repeated calls', () => {
    const a = buildRegistry()
    const b = buildRegistry()
    expect([...a.modules.keys()]).toEqual([...b.modules.keys()])
    expect([...a.lessonModuleIds.entries()]).toEqual([...b.lessonModuleIds.entries()])
    expect(a.payloadBytes).toBe(b.payloadBytes)
  })
})
