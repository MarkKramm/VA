import { describe, expect, it } from 'vitest'
import { ExerciseSchema } from '../schemas/exercise.ts'
import { buildRegistryFromSource, registry } from '../registry.ts'
import { validateRegistry } from '../validation.ts'
import { exerciseBody, exercisesOfLesson, getExercise, lessonsUsingExercise } from '../selectors.ts'
import { validExercise, validLesson } from '@fixtures/content.ts'

/**
 * THE EXERCISE ENTITY (M2.4).
 *
 * The first PRACTICE entity. These tests cover the three things that make it
 * real rather than decorative:
 *
 *   1. the schema — what an exercise must declare, and what it deliberately
 *      cannot (no `lessonId`, no score, no attempt);
 *   2. the registry and the derived reverse index, so the relationship is
 *      lesson-owned and never authored twice;
 *   3. the real content, including that a lesson actually reaches practice and
 *      that `lesson.exercises` fails closed on an unknown id.
 */

const EXERCISE = 'organise-a-client-folder-structure'
const LESSON = 'files-and-folders'

describe('the exercise schema', () => {
  it('accepts a complete exercise and defaults skills to an empty list', () => {
    const { skills: _ignored, ...withoutSkills } = validExercise()
    const parsed = ExerciseSchema.parse(withoutSkills)
    expect(parsed.skills).toEqual([])
  })

  it('requires at least one self-check criterion', () => {
    // An exercise with nothing to check against is a suggestion, not practice.
    expect(ExerciseSchema.safeParse(validExercise({ selfCheck: [] })).success).toBe(false)
  })

  it('requires a deliverable', () => {
    const { deliverable: _ignored, ...withoutDeliverable } = validExercise()
    expect(ExerciseSchema.safeParse(withoutDeliverable).success).toBe(false)
  })

  it('rejects a non-slug id', () => {
    expect(ExerciseSchema.safeParse(validExercise({ id: 'Not A Slug' })).success).toBe(false)
  })

  it('does not carry a lessonId — the reference is lesson-owned', () => {
    // A stray `lessonId` is not part of the schema. Zod strips unknown keys, so
    // the field is DROPPED rather than stored: an exercise cannot state its own
    // lesson, which is what keeps the reverse index the single source of truth.
    const parsed = ExerciseSchema.parse(validExercise({ lessonId: LESSON }))
    expect(parsed).not.toHaveProperty('lessonId')
  })
})

describe('exercise registry and the derived reverse index', () => {
  it('derives exerciseLessonIds from the lesson side', () => {
    const built = buildRegistryFromSource({
      careerPaths: [],
      skills: [],
      lessons: [{ path: 'content/lessons/x/cleaning-a-spreadsheet.mdx', data: validLesson() }],
      exercises: [{ path: 'content/exercises/x/clean-a-sheet.mdx', data: validExercise() }],
      modules: [],
      roadmaps: [],
    })
    expect(built.exerciseLessonIds.get('clean-a-sheet')).toEqual(['cleaning-a-spreadsheet'])
  })

  it('records no reverse entry for an exercise no lesson references', () => {
    const built = buildRegistryFromSource({
      careerPaths: [],
      skills: [],
      lessons: [],
      exercises: [
        { path: 'content/exercises/x/orphan.mdx', data: validExercise({ id: 'orphan-exercise' }) },
      ],
      modules: [],
      roadmaps: [],
    })
    // Absent rather than an empty list, matching every other reverse index.
    expect(built.exerciseLessonIds.get('orphan-exercise')).toBeUndefined()
  })
})

describe('the real exercise content', () => {
  it('loads the first exercise and its compiled body', () => {
    expect(getExercise(registry, EXERCISE)).toBeDefined()
    expect(exerciseBody(registry, EXERCISE)?.length).toBeGreaterThan(0)
  })

  it('connects the exercise to the Files and Folders lesson', () => {
    expect(exercisesOfLesson(registry, LESSON).map((exercise) => exercise.id)).toEqual([EXERCISE])
    expect(lessonsUsingExercise(registry, EXERCISE).map((lesson) => lesson.id)).toEqual([LESSON])
  })

  it('leaves exercises out of pendingCollections', () => {
    expect(registry.pendingCollections).not.toContain('exercises')
  })

  it('resolves every lesson.exercises reference', () => {
    expect(
      validateRegistry(registry).issues.filter((issue) => issue.rule === 'referential-integrity'),
    ).toEqual([])
  })

  it('makes two lessons reach practice, so no-practice warnings fall by fact', () => {
    // Four M0 lessons. `files-and-folders` has a real exercise (M2.4) and
    // `what-is-a-virtual-assistant` links a quiz (M4.2), so two are still reading
    // pages. The count is pinned so a regression that un-wires either one shows up
    // here rather than being absorbed by the quality rule.
    const noPractice = validateRegistry(registry).issues.filter(
      (issue) => issue.rule === 'quality/no-practice',
    )
    expect(noPractice).toHaveLength(2)
    expect(noPractice.map((issue) => issue.path)).not.toContain(
      'content/lessons/**/files-and-folders.mdx',
    )
    expect(noPractice.map((issue) => issue.path)).not.toContain(
      'content/lessons/**/what-is-a-virtual-assistant.mdx',
    )
  })

  it('authors no lessonId inside any exercise record', () => {
    for (const exercise of registry.exercises.values()) {
      expect(exercise).not.toHaveProperty('lessonId')
    }
  })
})
