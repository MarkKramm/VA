import { z } from 'zod'
import { CareerPathSlugSchema, provenanceShape } from './primitives.js'

/**
 * A career path is taxonomy, not curriculum.
 *
 * It groups roadmaps so a learner can browse "everything under Real Estate"
 * without the grouping being hard-coded in a component. `plan.md` §29's future
 * verticals (Medical, Legal, Insurance, Mortgage, Recruitment, Education,
 * Travel, Podcast, YouTube, Property Management, Amazon, Etsy) attach as `parent`
 * nodes, which is why the taxonomy is a tree and not a flat list.
 *
 * This is a first-class entity rather than a free string on a roadmap: an
 * unvalidated `careerPath: "automation"` that silently matches nothing is the
 * one dangling reference a design premised on "every reference resolves" must
 * not permit.
 */
export const CareerPathSchema = z.object({
  id: CareerPathSlugSchema,
  title: z.string().min(3),
  summary: z.string().min(20),
  /** A key into the curated icon set (src/components/icons at M1). Never a raw SVG blob. */
  icon: z.string().min(2).optional(),
  /** Parent node, for nesting. A cycle is a validation error. */
  parent: CareerPathSlugSchema.optional(),
  /** Display order in browse views. */
  order: z.number().int().min(0),
  ...provenanceShape,
})

export type CareerPath = z.infer<typeof CareerPathSchema>
