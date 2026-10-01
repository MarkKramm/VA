import { z } from 'zod'
import { IdSchema, SlugSchema } from './primitives.js'

/**
 * How a skill relates to its parent. The tree is a taxonomy; this is the edge
 * label. `contains` is the normal case. `requires` and `enables` are available
 * for the (rare) case where a relationship is genuinely directional.
 */
export const SkillRelationSchema = z.enum(['contains', 'requires', 'enables'])

export const SkillSchema = z.object({
  id: IdSchema,
  title: z.string().min(2),
  summary: z.string().min(10).optional(),
  /** Parent skill. A cycle is a validation error. */
  parent: SlugSchema.optional(),
  relation: SkillRelationSchema.default('contains'),
  /**
   * A short, plain-language gloss. Rendered wherever a skill name appears: the
   * audience is complete beginners (Q10) and unexplained jargon is one of the
   * main reasons a learning platform gets abandoned in week one.
   */
  gloss: z.string().max(140).optional(),
  order: z.number().int().min(0).default(0),
})

export type Skill = z.infer<typeof SkillSchema>

export const SkillTreeSchema = z.array(SkillSchema)
