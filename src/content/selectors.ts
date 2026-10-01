import type { ContentRegistry } from './registry.ts'
import type { CareerPath, Lesson, Module, Roadmap, Skill } from './schemas/index.ts'

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
