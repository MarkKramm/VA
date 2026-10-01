import { describe, expect, it } from 'vitest'
import { buildRegistryFromSource } from '../registry.ts'
import { validateRegistry } from '../validation.ts'
import {
  leafSkill,
  rootSkill,
  validCareerPath,
  validLesson,
  validModule,
} from '@fixtures/content.ts'

/**
 * Regression: a duplicate id must produce a `duplicate-id` error.
 *
 * This was silently unreachable. `checkDuplicateIds` iterated the registry's
 * Maps, and those Maps are built by `indexById` — a `new Map(items.map(...))`,
 * which keeps only the LAST entry for a given id. By the time any check could
 * look, the duplicate was already gone, so the check could never fire.
 *
 * Detection now happens on the pre-index array.
 */
describe('duplicate ids are detectable at all', () => {
  it('fails on two lesson files sharing one id', () => {
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [rootSkill(), leafSkill()],
      lessons: [
        { path: 'content/lessons/a/duplicate-lesson.mdx', data: validLesson() },
        { path: 'content/lessons/b/duplicate-lesson.mdx', data: validLesson() },
      ],
      modules: [{ path: 'content/modules/data-cleaning.mdx', data: validModule() }],
      roadmaps: [],
    })

    const duplicates = validateRegistry(registry).issues.filter(
      (issue) => issue.rule === 'duplicate-id',
    )

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0]?.severity).toBe('error')
    expect(duplicates[0]?.entity).toBe('lesson')
    expect(duplicates[0]?.message).toContain('cleaning-a-spreadsheet')
    // Both real file paths must be named, or the error is not actionable.
    expect(duplicates[0]?.path).toBe('content/lessons/b/duplicate-lesson.mdx')
    expect(duplicates[0]?.message).toContain('content/lessons/a/duplicate-lesson.mdx')
  })

  it('keeps the Map behaviour unchanged: last write wins, as before', () => {
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [rootSkill(), leafSkill()],
      lessons: [
        { path: 'content/lessons/a/dup.mdx', data: validLesson({ title: 'First Version' }) },
        { path: 'content/lessons/b/dup.mdx', data: validLesson({ title: 'Second Version' }) },
      ],
      modules: [{ path: 'content/modules/data-cleaning.mdx', data: validModule() }],
      roadmaps: [],
    })

    // Normal lookup behaviour must not change: one entry, the later one.
    expect(registry.lessons.size).toBe(1)
    expect(registry.lessons.get('cleaning-a-spreadsheet')?.title).toBe('Second Version')
  })

  it('reports a duplicate module id', () => {
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [rootSkill(), leafSkill()],
      lessons: [{ path: 'content/lessons/one.mdx', data: validLesson() }],
      modules: [
        { path: 'content/modules/first.mdx', data: validModule() },
        { path: 'content/modules/second.mdx', data: validModule() },
      ],
      roadmaps: [],
    })
    const duplicates = validateRegistry(registry).issues.filter(
      (issue) => issue.rule === 'duplicate-id' && issue.entity === 'module',
    )
    expect(duplicates).toHaveLength(1)
  })

  it('reports a duplicate career-path id', () => {
    const registry = buildRegistryFromSource({
      careerPaths: [
        { path: 'content/career-paths.ts[0]', data: validCareerPath({ title: 'First' }) },
        { path: 'content/career-paths.ts[1]', data: validCareerPath({ title: 'Second' }) },
      ],
      skills: [],
      lessons: [],
      modules: [],
      roadmaps: [],
    })
    const duplicates = validateRegistry(registry).issues.filter(
      (issue) => issue.rule === 'duplicate-id' && issue.entity === 'career-path',
    )
    expect(duplicates).toHaveLength(1)
  })

  it('reports the same id in two DIFFERENT entity types without a false positive', () => {
    // 'data-cleaning' is both a skill id and a module id in the fixtures. That is
    // legal — ids only need to be unique within an entity type — and the check
    // must not flag it.
    const registry = buildRegistryFromSource({
      careerPaths: [validCareerPath()],
      skills: [rootSkill(), leafSkill()],
      lessons: [{ path: 'content/lessons/one.mdx', data: validLesson() }],
      modules: [{ path: 'content/modules/data-cleaning.mdx', data: validModule() }],
      roadmaps: [],
    })
    expect(
      validateRegistry(registry).issues.filter((issue) => issue.rule === 'duplicate-id'),
    ).toEqual([])
  })

  it('produces no duplicate-id error for the real content', () => {
    return import('../registry.ts').then(({ registry }) => {
      expect(
        validateRegistry(registry).issues.filter((issue) => issue.rule === 'duplicate-id'),
      ).toEqual([])
    })
  })
})
