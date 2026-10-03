import type { ContentRegistry } from './registry.ts'
import type { CompiledBody } from '@content/mdx/tree.ts'
import type { CareerPath, Exercise, Lesson, Module, Roadmap, Skill } from './schemas/index.ts'

/**
 * Read-only queries over the registry.
 *
 * Every read the application performs goes through this file. The application
 * never reaches into the raw content maps directly, which is what makes the
 * "derived reverse indexes" rule enforceable: if a relationship is not exposed
 * here as a selector, it does not exist, and adding it means adding a function
 * rather than an ad-hoc lookup scattered across components.
 */

export const getLesson = (registry: ContentRegistry, lessonId: string): Lesson | undefined =>
  registry.lessons.get(lessonId)

/**
 * A lesson's compiled body, or `undefined` when the lesson has none.
 *
 * `undefined` is a real state, not an error: content that failed validation has
 * no body, and the UI is expected to render an honest empty state rather than a
 * broken page. Returning `[]` here would make "no body" and "an empty body"
 * indistinguishable.
 */
export const lessonBody = (registry: ContentRegistry, lessonId: string): CompiledBody | undefined =>
  registry.lessonBodies.get(lessonId)

export const getExercise = (registry: ContentRegistry, exerciseId: string): Exercise | undefined =>
  registry.exercises.get(exerciseId)

/**
 * An exercise's compiled body, or `undefined` when it has none (M2.4).
 *
 * Same contract as `lessonBody`: `undefined` is "no body", not an error, and the
 * UI renders an honest empty state rather than a broken section.
 */
export const exerciseBody = (
  registry: ContentRegistry,
  exerciseId: string,
): CompiledBody | undefined => registry.exerciseBodies.get(exerciseId)

export const getModule = (registry: ContentRegistry, moduleId: string): Module | undefined =>
  registry.modules.get(moduleId)

export const getRoadmap = (registry: ContentRegistry, roadmapId: string): Roadmap | undefined =>
  registry.roadmaps.get(roadmapId)

export const getCareerPath = (registry: ContentRegistry, id: string): CareerPath | undefined =>
  registry.careerPaths.get(id)

export const getSkill = (registry: ContentRegistry, id: string): Skill | undefined =>
  registry.skills.get(id)

/** The lessons of a module, in the module's own declared order. */
export const lessonsOfModule = (registry: ContentRegistry, moduleId: string): Lesson[] => {
  const module = registry.modules.get(moduleId)
  if (!module) return []
  return module.lessons.flatMap((id) => {
    const lesson = registry.lessons.get(id)
    return lesson ? [lesson] : []
  })
}

/**
 * The roadmaps a module appears in. This is the payoff of the whole
 * id-reference model: no roadmap ever declares that it contains a module another
 * roadmap already contains, and this query is still always correct.
 */
export const roadmapsUsingModule = (registry: ContentRegistry, moduleId: string): Roadmap[] =>
  (registry.moduleRoadmapIds.get(moduleId) ?? []).flatMap((id) => {
    const roadmap = registry.roadmaps.get(id)
    return roadmap ? [roadmap] : []
  })

/** The modules of a roadmap, in stage order. */
export const modulesOfRoadmap = (registry: ContentRegistry, roadmapId: string): Module[] => {
  const moduleIds = registry.roadmapModuleIds.get(roadmapId) ?? []
  return moduleIds.flatMap((id) => {
    const module = registry.modules.get(id)
    return module ? [module] : []
  })
}

/** Every lesson reachable from a roadmap, in order, without duplicates. */
export const lessonsOfRoadmap = (registry: ContentRegistry, roadmapId: string): Lesson[] => {
  const seen = new Set<string>()
  const out: Lesson[] = []
  for (const module of modulesOfRoadmap(registry, roadmapId)) {
    for (const lesson of lessonsOfModule(registry, module.id)) {
      if (seen.has(lesson.id)) continue
      seen.add(lesson.id)
      out.push(lesson)
    }
  }
  return out
}

/** Lessons that teach a given skill, at either lesson or topic level. */
export const lessonsForSkill = (registry: ContentRegistry, skillId: string): Lesson[] =>
  (registry.skillLessonIds.get(skillId) ?? []).flatMap((id) => {
    const lesson = registry.lessons.get(id)
    return lesson ? [lesson] : []
  })

/**
 * Resolve a list of lesson ids to lesson records, dropping unknown ids.
 *
 * Order is PRESERVED exactly as given, and duplicates are dropped the same way
 * `lessonsOfRoadmap` drops them. This is what lets a caller turn a lesson's
 * `related` (or `prerequisites`) ids into records without reaching into the raw
 * map, and without the order-in / order-out guarantee being lost.
 */
export const lessonsByIds = (registry: ContentRegistry, lessonIds: readonly string[]): Lesson[] => {
  const seen = new Set<string>()
  const out: Lesson[] = []
  for (const id of lessonIds) {
    if (seen.has(id)) continue
    const lesson = registry.lessons.get(id)
    if (!lesson) continue
    seen.add(id)
    out.push(lesson)
  }
  return out
}

/**
 * The exercises a lesson references, in the lesson's declared order (M2.4).
 *
 * The relationship is lesson-owned (`lesson.exercises`), so this resolves the
 * lesson's own list rather than reading a reverse index. Duplicates are dropped
 * and unknown ids are skipped here; an unknown id is already a referential
 * integrity ERROR at validation time, so this only has to avoid throwing.
 */
export const exercisesOfLesson = (registry: ContentRegistry, lessonId: string): Exercise[] => {
  const lesson = registry.lessons.get(lessonId)
  if (!lesson) return []
  const seen = new Set<string>()
  const out: Exercise[] = []
  for (const exerciseId of lesson.exercises) {
    if (seen.has(exerciseId)) continue
    const exercise = registry.exercises.get(exerciseId)
    if (!exercise) continue
    seen.add(exerciseId)
    out.push(exercise)
  }
  return out
}

/**
 * The lessons that reference an exercise, via the derived `exerciseLessonIds`.
 *
 * An exercise carries no `lessonId`; this is the reverse of the lesson-owned
 * reference, computed by the registry, exactly as `roadmapsUsingModule` reverses
 * the roadmap-owned module reference.
 */
export const lessonsUsingExercise = (registry: ContentRegistry, exerciseId: string): Lesson[] =>
  (registry.exerciseLessonIds.get(exerciseId) ?? []).flatMap((id) => {
    const lesson = registry.lessons.get(id)
    return lesson ? [lesson] : []
  })

/** Resolve a list of skill ids to skill records, in the order given, dropping unknown ids. */
export const skillsByIds = (registry: ContentRegistry, skillIds: readonly string[]): Skill[] =>
  skillIds.flatMap((id) => {
    const skill = registry.skills.get(id)
    return skill ? [skill] : []
  })

export const modulesForSkill = (registry: ContentRegistry, skillId: string): Module[] =>
  (registry.skillModuleIds.get(skillId) ?? []).flatMap((id) => {
    const module = registry.modules.get(id)
    return module ? [module] : []
  })

export const modulesOfLesson = (registry: ContentRegistry, lessonId: string): Module[] =>
  (registry.lessonModuleIds.get(lessonId) ?? []).flatMap((id) => {
    const module = registry.modules.get(id)
    return module ? [module] : []
  })

/** The career paths a lesson belongs to, derived through its modules' roadmaps. */
export const careerPathsOfLesson = (registry: ContentRegistry, lessonId: string): CareerPath[] =>
  (registry.lessonCareerPathIds.get(lessonId) ?? []).flatMap((id) => {
    const careerPath = registry.careerPaths.get(id)
    return careerPath ? [careerPath] : []
  })

/**
 * The FIRST module that declares a lesson, in registry order.
 *
 * `lessonModuleIds` is a reverse index, so it is already in the order the modules
 * were indexed. A lesson can legitimately appear in more than one module (that is
 * the whole reuse model), but a lesson page needs ONE parent to build a
 * breadcrumb and a "where this sits" statement. Returning the first is
 * deterministic because the registry indexes in sorted file order, and returning
 * a single module rather than a list keeps the caller from having to invent a
 * rule for what "the" parent is.
 *
 * The full list is still available via `modulesOfLesson` for any caller that
 * genuinely needs every membership.
 */
export const primaryModuleOfLesson = (
  registry: ContentRegistry,
  lessonId: string,
): Module | undefined => {
  const [firstModuleId] = registry.lessonModuleIds.get(lessonId) ?? []
  return firstModuleId ? registry.modules.get(firstModuleId) : undefined
}

/** The first roadmap that contains a lesson, through its primary module. */
export const primaryRoadmapOfLesson = (
  registry: ContentRegistry,
  lessonId: string,
): Roadmap | undefined => {
  const module = primaryModuleOfLesson(registry, lessonId)
  if (!module) return undefined
  const [firstRoadmapId] = registry.moduleRoadmapIds.get(module.id) ?? []
  return firstRoadmapId ? registry.roadmaps.get(firstRoadmapId) : undefined
}

/** The roadmaps grouped under each career path, in display order. */
export const roadmapsByCareerPath = (registry: ContentRegistry): Map<string, Roadmap[]> => {
  const grouped = new Map<string, Roadmap[]>()
  const careerPaths = [...registry.careerPaths.values()].sort((a, b) => a.order - b.order)
  for (const careerPath of careerPaths) grouped.set(careerPath.id, [])
  for (const roadmap of registry.roadmaps.values()) {
    const bucket = grouped.get(roadmap.careerPath)
    if (bucket) bucket.push(roadmap)
    else grouped.set(roadmap.careerPath, [roadmap])
  }
  return grouped
}

/** Direct children of a career path, used to build the taxonomy tree in the UI. */
export const childCareerPaths = (registry: ContentRegistry, parentId: string): CareerPath[] =>
  [...registry.careerPaths.values()]
    .filter((careerPath) => careerPath.parent === parentId)
    .sort((a, b) => a.order - b.order)

export const rootCareerPaths = (registry: ContentRegistry): CareerPath[] =>
  [...registry.careerPaths.values()]
    .filter((careerPath) => careerPath.parent === undefined)
    .sort((a, b) => a.order - b.order)

export const childSkills = (registry: ContentRegistry, parentId: string): Skill[] =>
  [...registry.skills.values()]
    .filter((skill) => skill.parent === parentId)
    .sort((a, b) => a.order - b.order)

export const rootSkills = (registry: ContentRegistry): Skill[] =>
  [...registry.skills.values()]
    .filter((skill) => skill.parent === undefined)
    .sort((a, b) => a.order - b.order)
