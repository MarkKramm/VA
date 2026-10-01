import { z } from 'zod'
import {
  ExerciseSlugSchema,
  LabSlugSchema,
  LessonSlugSchema,
  QuizSlugSchema,
  ResourceSlugSchema,
  SkillSlugSchema,
  ToolSlugSchema,
  TopicSlugSchema,
  DifficultySchema,
  provenanceShape,
} from './primitives.js'

/**
 * A topic is a named, addressable concept inside a lesson.
 *
 * Two forms, and the distinction is the whole point of the entity:
 *
 *  - `inline` (the default): the lesson declares an anchor and the MDX headings
 *    carry matching ids. Cheap, no extra file, and correct for most lessons.
 *
 *  - `shared`: the concept is taught in several lessons, so it lives once in
 *    content/topics/*.mdx and each lesson *references* it. This is the
 *    anti-duplication mechanism for concepts, exactly parallel to how modules
 *    avoid duplicating lessons.
 *
 * It is also the anti-contradiction surface. A claim two lessons might state
 * differently — an hourly rate, whether a niche is saturated, what a pricing
 * tier includes — is written once here and referenced, per CONTENT_GUIDELINES.md.
 */
export const TopicAnchorSchema = z
  .object({
    id: TopicSlugSchema,
    title: z.string().min(3),
    kind: z.enum(['inline', 'shared']).default('inline'),
    /** Required when `kind === 'shared'`: the slug of a content/topics/*.mdx entity. */
    sharedRef: TopicSlugSchema.optional(),
    skills: z.array(SkillSlugSchema).default([]),
  })
  .refine((t) => t.kind === 'inline' || t.sharedRef !== undefined, {
    message: 'a shared topic must declare sharedRef',
    path: ['sharedRef'],
  })

/**
 * A prerequisite is advisory, never a lock — except when it gates an assessment.
 *
 * Q6 settled soft gating: locked-but-clickable content with a stated reason,
 * because walls cause abandonment on a free platform. `reason` exists so the
 * advisory is specific and therefore useful: "This lesson assumes XLOOKUP from
 * Spreadsheet Lookups" is actionable; "You have unmet prerequisites" is not.
 */
export const PrerequisiteSchema = z.object({
  id: LessonSlugSchema,
  reason: z.string().min(10).max(200),
})

export const LessonSchema = z.object({
  /** Stable and immutable once published. See primitives.ts. */
  id: LessonSlugSchema,
  title: z.string().min(3),
  /** Extra search keys: "VA", "virtual assistant", "GSheets", "freelance help". */
  aliases: z.array(z.string().min(1)).max(12).default([]),
  summary: z.string().min(10),
  /**
   * Required, and non-empty. This single requirement does more for content
   * quality than any amount of prose guidance: a lesson without a stated
   * objective is a page, not a lesson.
   */
  objectives: z.array(z.string().min(4)).min(1),
  topics: z.array(TopicAnchorSchema).default([]),
  skills: z.array(SkillSlugSchema).default([]),
  tools: z.array(ToolSlugSchema).default([]),
  resources: z.array(ResourceSlugSchema).default([]),
  prerequisites: z.array(PrerequisiteSchema).default([]),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().positive().max(600),
  exercises: z.array(ExerciseSlugSchema).default([]),
  quiz: QuizSlugSchema.optional(),
  lab: LabSlugSchema.optional(),
  related: z.array(LessonSlugSchema).default([]),
  ...provenanceShape,
})

export type Lesson = z.infer<typeof LessonSchema>
export type TopicAnchor = z.infer<typeof TopicAnchorSchema>

/**
 * Structural rule enforced by validation, not by Zod: a lesson with neither an
 * exercise, a quiz, nor a lab is a reading page. `content:check` warns about
 * it. This is the strongest guarantee that the platform teaches rather than
 * hosts articles — see ARCHITECTURE.md.
 */
export const LESSON_REACHES_PRACTICE = (lesson: {
  exercises: readonly unknown[]
  quiz?: unknown
  lab?: unknown
}): boolean => lesson.exercises.length > 0 || Boolean(lesson.quiz) || Boolean(lesson.lab)
