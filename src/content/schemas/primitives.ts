import { z } from 'zod'

/**
 * Shared vocabulary for every content entity.
 *
 * Ids are the join key of the entire content architecture: every relationship
 * between a roadmap, a module, a lesson, a skill, a tool and a resource is a
 * reference to one of these ids. That makes the rules below architectural
 * rather than stylistic.
 *
 * RULE: an `id` is immutable once published. Renaming one orphans every
 * learner's local progress record, silently and permanently. If a rename is
 * genuinely unavoidable, add the old value to `deprecatedIds` so the migration
 * can find it. See AGENTS.md rule 13 and DECISIONS.md.
 */

export const SlugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case, e.g. "what-is-a-va"')

export const IdSchema = SlugSchema

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date, e.g. "2026-10-01"')

export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

export const StatusSchema = z.enum(['draft', 'review', 'published'])

export const CareerPathSlugSchema = SlugSchema
export const RoadmapSlugSchema = SlugSchema
export const ModuleSlugSchema = SlugSchema
export const LessonSlugSchema = SlugSchema
export const TopicSlugSchema = SlugSchema
export const SkillSlugSchema = SlugSchema
export const ToolSlugSchema = SlugSchema
export const ResourceSlugSchema = SlugSchema
export const ExerciseSlugSchema = SlugSchema
export const QuizSlugSchema = SlugSchema
export const QuestionSlugSchema = SlugSchema
export const AssessmentSlugSchema = SlugSchema
export const LabSlugSchema = SlugSchema

/**
 * Ids this milestone has not created yet. Referencing one is legal in
 * frontmatter — the schema accepts the id — but referential integrity skips
 * validation for a collection that is not registered, so a lesson may stage a
 * `tools:` list before the tool directory exists at M5 without failing the
 * build. See validation.ts.
 */
export const FUTURE_SLUG_SCHEMAS = {
  tools: ToolSlugSchema,
  resources: ResourceSlugSchema,
  exercises: ExerciseSlugSchema,
  quizzes: QuizSlugSchema,
  labs: LabSlugSchema,
  assessments: AssessmentSlugSchema,
  topics: TopicSlugSchema,
  questions: QuestionSlugSchema,
} as const

export type Difficulty = z.infer<typeof DifficultySchema>
export type Status = z.infer<typeof StatusSchema>

/**
 * Provenance fields. Required for publication — see ARCHITECTURE.md.
 *
 * The division of labour is deliberate and non-negotiable: an AI agent drafts,
 * a human edits, and nothing reaches `published` without a named human having
 * signed it off. `content:check` enforces that `published` implies both of
 * these are present.
 */
export const provenanceShape = {
  status: StatusSchema.default('draft'),
  updatedAt: IsoDateSchema,
  changeNote: z.string().max(200).optional(),
  reviewedBy: z.string().min(2).optional(),
  reviewedAt: IsoDateSchema.optional(),
  /** Old ids this entity used to have. Only for genuine renames. See SlugSchema. */
  deprecatedIds: z.array(SlugSchema).default([]),
}
