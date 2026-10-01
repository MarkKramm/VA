import type { ModuleId, RoadmapId } from '../progress/types.ts'
import { isStageComplete, moduleProgress, type StageProgressInput } from '../progress/selectors.ts'

/**
 * Roadmap progress, expressed in terms of a resolved plan.
 *
 * Separated from progress/selectors.ts because a "stage" is a content concept
 * while a "selector" is a state concept. This file is the seam where the two
 * meet, and it still takes plain data rather than importing the registry —
 * `src/app/hooks/` does the composition.
 */

export interface RoadmapPlan {
  readonly roadmapId: RoadmapId
  readonly stages: readonly {
    readonly kind: string
    readonly title?: string
    readonly moduleIds: readonly ModuleId[]
  }[]
}

export interface ModulePlan {
  readonly moduleId: ModuleId
  readonly lessonIds: readonly string[]
}

export type Plan = ReadonlyMap<ModuleId, ModulePlan>

/** Resolve a roadmap's stages into the lesson ids each stage covers, in order. */
export const resolveStages = (roadmap: RoadmapPlan, plan: Plan): StageProgressInput[] =>
  roadmap.stages.map((stage) => ({
    moduleId: stage.moduleIds[0] ?? '',
    lessonIds: stage.moduleIds.flatMap((moduleId) => plan.get(moduleId)?.lessonIds ?? []),
  }))

export const roadmapProgress = (
  state: Parameters<typeof moduleProgress>[0],
  roadmap: RoadmapPlan,
  plan: Plan,
): number => {
  const stages = resolveStages(roadmap, plan)
  const usable = stages.filter((stage) => stage.lessonIds.length > 0)
  if (usable.length === 0) return 0
  const total = usable.reduce((sum, stage) => sum + moduleProgress(state, stage.lessonIds), 0)
  return total / usable.length
}

/** Incomplete lessons inside a roadmap, in roadmap order. The "what next" candidate pool. */
export const incompleteLessons = (roadmap: RoadmapPlan, plan: Plan): string[] => {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const stage of roadmap.stages) {
    for (const moduleId of stage.moduleIds) {
      for (const lessonId of plan.get(moduleId)?.lessonIds ?? []) {
        if (seen.has(lessonId)) continue
        seen.add(lessonId)
        ordered.push(lessonId)
      }
    }
  }
  return ordered
}

export { isStageComplete }
