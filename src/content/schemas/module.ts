import { z } from 'zod'
import {
  LessonSlugSchema,
  ModuleSlugSchema,
  SkillSlugSchema,
  ToolSlugSchema,
  TopicSlugSchema,
  provenanceShape,
} from './primitives.js'

/**
 * A module is the unit of reuse. A roadmap is an ordered selection of modules
 * that already exist; a roadmap never contains a lesson that another roadmap
 * also contains directly. That boundary is what lets 21 roadmaps share ~34
 * modules without duplication.
 */
export const ModuleSchema = z.object({
  id: ModuleSlugSchema,
  title: z.string().min(3),
  summary: z.string().min(20),
  /**
   * What a learner can DO after this module, in behavioural terms.
   * "Understand spreadsheets" is not an outcome. "Clean a spreadsheet with
   * duplicate and inconsistent rows" is.
   */
  outcome: z.string().min(10),
  lessons: z.array(LessonSlugSchema).min(1),
  skills: z.array(SkillSlugSchema).default([]),
  tools: z.array(ToolSlugSchema).default([]),
  /** Shared topics taught here and referenced by several lessons. */
  topics: z.array(TopicSlugSchema).default([]),
  /**
   * An editorial tag for filtering and for the "what kind of work is this"
   * label. Deliberately NOT a progression stage: a module is not inherently a
   * "foundation" — it is a foundation module in one roadmap and a tool module
   * in another. Stage membership belongs to the roadmap, not the module.
   */
  kind: z.enum(['core', 'tool', 'specialization', 'project']).optional(),
  estimatedMinutes: z.number().int().positive().max(20_000),
  ...provenanceShape,
})

export type Module = z.infer<typeof ModuleSchema>
