import { registry } from '@/content/registry.ts'
import {
  getModule,
  getRoadmap,
  lessonsOfModule,
  lessonsOfRoadmap,
  modulesOfRoadmap,
  roadmapsByCareerPath,
} from '@/content/selectors.ts'
import type { CareerPath, Lesson, Module, Roadmap, Stage } from '@/content/schemas/index.ts'

/**
 * Content composition for the application layer.
 *
 * WHY THIS FILE EXISTS
 *
 * The ESLint layer-boundary rule forbids `src/features/` and `src/components/`
 * from importing anything matching `content/*` — which includes the `@/content/*`
 * alias. So a feature component cannot read the registry, and cannot import a
 * selector either. `src/app/` is the layer that is allowed to, and it is the
 * layer `ARCHITECTURE.md` describes as "wiring".
 *
 * That makes this file the seam between the curriculum and the UI. It reads the
 * registry through `selectors.ts` — never the raw Maps — and hands plain data to
 * the presentation layer.
 *
 * Two rules this file exists to enforce:
 *
 *  1. **Every read goes through a selector.** No ad-hoc `registry.lessons.get()`
 *     in a component, because that is how the derived-index rule quietly stops
 *     being true. If a query is needed and no selector provides it, add one to
 *     `src/content/selectors.ts` rather than reaching past it here.
 *  2. **Nothing is invented.** Every function returns content that exists. Where
 *     the curriculum is thin — and at M1 it is very thin — the UI shows an
 *     honest empty state instead. Fabricating a plausible-looking lesson list to
 *     fill a dashboard would be a lie the learner discovers later.
 */

/** Every roadmap, in registry order. */
export const allRoadmaps = (): readonly Roadmap[] => [...registry.roadmaps.values()]

/** Every module. */
export const allModules = (): readonly Module[] => [...registry.modules.values()]

/** Every lesson. */
export const allLessons = (): readonly Lesson[] => [...registry.lessons.values()]

/** One roadmap, or undefined if the id is unknown. */
export const findRoadmap = (roadmapId: string): Roadmap | undefined =>
  getRoadmap(registry, roadmapId)

/** One module, or undefined if the id is unknown. */
export const findModule = (moduleId: string): Module | undefined => getModule(registry, moduleId)

/** The modules of a roadmap, in stage order. */
export const modulesInRoadmap = (roadmapId: string): readonly Module[] =>
  modulesOfRoadmap(registry, roadmapId)

/** The lessons of a module, in the module's declared order. */
export const lessonsInModule = (moduleId: string): readonly Lesson[] =>
  lessonsOfModule(registry, moduleId)

/** Every lesson reachable from a roadmap, in order, de-duplicated. */
export const lessonsInRoadmap = (roadmapId: string): readonly Lesson[] =>
  lessonsOfRoadmap(registry, roadmapId)

/**
 * Roadmap stages with their modules resolved, ready to render.
 *
 * Stages are returned as a LIST and each carries its resolved modules. It is
 * deliberately not a map keyed by `kind`: Automation VA has two stages sharing the
 * `specialization` kind, and keying by kind would silently drop one. `NEXT_STEPS.md`
 * calls this out as a thing M1 must set up for M2 without building it, and this
 * return shape is how it is set up.
 */
export interface ResolvedStage {
  readonly stage: Stage
  readonly modules: readonly Module[]
}

export const stagesOfRoadmap = (roadmapId: string): readonly ResolvedStage[] => {
  const roadmap = getRoadmap(registry, roadmapId)
  if (!roadmap) return []
  return roadmap.stages.map((stage) => ({
    stage,
    modules: stage.modules.flatMap((moduleId) => {
      const module = getModule(registry, moduleId)
      return module ? [module] : []
    }),
  }))
}

/** A roadmap plus the totals the shell displays. All derived, never stored. */
export interface RoadmapSummary {
  readonly roadmap: Roadmap
  readonly moduleCount: number
  readonly lessonCount: number
  /**
   * De-duplicated module count.
   *
   * A roadmap may reference the same module in two stages — `beginner-va` does,
   * with `computer-fundamentals` in both "Working habits" and "Choose a
   * direction". Counting it twice would overstate the work, so this counts
   * distinct modules while `modulesInRoadmap` keeps stage order intact.
   */
  readonly distinctModuleCount: number
}

export const summariseRoadmap = (roadmap: Roadmap): RoadmapSummary => {
  const modules = modulesOfRoadmap(registry, roadmap.id)
  const distinct = new Set(roadmap.stages.flatMap((stage) => stage.modules))
  return {
    roadmap,
    moduleCount: modules.length,
    distinctModuleCount: distinct.size,
    lessonCount: lessonsOfRoadmap(registry, roadmap.id).length,
  }
}

/** Every roadmap with its derived totals, for the dashboard and the index page. */
export const allRoadmapSummaries = (): readonly RoadmapSummary[] =>
  allRoadmaps().map(summariseRoadmap)

/** Career paths with their roadmaps resolved, ordered by the path's own `order`. */
export interface CareerPathGroup {
  readonly careerPath: CareerPath
  readonly roadmaps: readonly Roadmap[]
}

export const careerPathGroups = (): readonly CareerPathGroup[] => {
  const grouped = roadmapsByCareerPath(registry)
  const groups: CareerPathGroup[] = []
  for (const [careerPathId, roadmaps] of grouped) {
    const careerPath = registry.careerPaths.get(careerPathId)
    // The selector can produce a group for an id with no career-path record only
    // if content is inconsistent, which referential integrity already forbids.
    // Dropping it here would hide that, so the caller can render it as ungrouped.
    if (careerPath) groups.push({ careerPath, roadmaps })
  }
  return groups
}

/**
 * Total lesson count across the whole curriculum.
 *
 * Used for the "what exists so far" figure on the dashboard. At M1 this is a
 * small number, and that is the honest state of the project rather than a
 * placeholder to be papered over.
 */
export const curriculumTotals = (): {
  readonly roadmaps: number
  readonly modules: number
  readonly lessons: number
  readonly careerPaths: number
} => ({
  roadmaps: registry.roadmaps.size,
  modules: registry.modules.size,
  lessons: registry.lessons.size,
  careerPaths: registry.careerPaths.size,
})

/**
 * The lessons a learner would encounter first, in curriculum order.
 *
 * Deliberately NOT a recommendation. It is the first lessons of the first
 * roadmap, which is a fact about the content rather than a judgement about the
 * learner. Anything that ranks content by what someone should do next is a
 * recommendation engine, and those belong to a later milestone.
 */
export const startingLessons = (limit = 3): readonly Lesson[] => {
  const firstRoadmap = allRoadmaps()[0]
  if (!firstRoadmap) return []
  return lessonsOfRoadmap(registry, firstRoadmap.id).slice(0, limit)
}
