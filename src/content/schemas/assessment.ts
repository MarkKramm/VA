import { z } from 'zod'
import {
  AssessmentSlugSchema,
  DifficultySchema,
  SkillSlugSchema,
  SlugSchema,
  ToolSlugSchema,
  provenanceShape,
} from './primitives.js'
import { PrerequisiteSchema } from './lesson.js'

/**
 * A practical assessment (M5).
 *
 * WHAT IT IS
 *
 * The last step of the learning loop: a learner is given a realistic piece of
 * work, does it outside the platform, and reports the outcome against a published
 * rubric. `PLAN.md` §52 names the shape — scenario, requirements, available tools,
 * instructions, expected deliverable, evaluation criteria, hints, common mistakes,
 * reference guidance — and this is that list, as content.
 *
 * WHY IT IS COMPOSITE
 *
 * `docs/DATA_MODEL.md` says an assessment is composite: it sits ABOVE lessons,
 * exercises and quizzes, and its prerequisites are those entities rather than
 * other assessments. That is also why it owns the platform's one hard lock — a
 * learner cannot pass an assessment until its prerequisite lessons are complete
 * and practised. The gate is computed by `assessmentEligibility` in
 * `src/domain/roadmap/unlock.ts`; this file only declares what the prerequisites
 * are.
 *
 * WHAT IT DELIBERATELY DOES NOT HAVE
 *
 * No `score`, no `passMark`, no `evaluator`, no `attempts` and no learner state.
 * An assessment is content; whether a learner passed is an EVENT, not a field —
 * see `assessment.attempted` in `src/domain/progress/types.ts`. Putting a result
 * in the content would put a second, disagreeing source of truth beside the log.
 *
 * It also does not accept a submission payload. `docs/ARCHITECTURE.md` lists file
 * upload as a deliberate non-feature — there is no backend to put a file in — and
 * `PLAN.md` §73 forbids adding one. So the learner works in their own tools and
 * reports the outcome; the platform never pretends to have inspected their work.
 *
 * `purpose` exists beside `summary` because they answer different questions:
 * `summary` says what the task is, `purpose` says what it proves. A learner
 * deciding whether to spend an hour needs the second one.
 */

/**
 * One rubric line the learner evaluates themselves against.
 *
 * Criteria are a LIST with stable ids rather than a single prose paragraph,
 * because the self-evaluation has to be checkable one line at a time: "did I name
 * every file consistently?" is answerable, and "did I do a good job?" is not.
 * The ids are what the attempt records as met or unmet.
 */
export const AssessmentCriterionSchema = z.object({
  id: SlugSchema,
  description: z.string().min(10),
})

export const AssessmentSchema = z
  .object({
    /** Stable and immutable once published. See primitives.ts. */
    id: AssessmentSlugSchema,
    title: z.string().min(3),
    /** What the task is. */
    summary: z.string().min(10),
    /** What completing it proves. The "why should I spend an hour on this". */
    purpose: z.string().min(10),
    difficulty: DifficultySchema,
    estimatedMinutes: z.number().int().positive().max(600),
    /** Skills this assessment produces evidence for. Checked fail-closed. */
    skills: z.array(SkillSlugSchema).default([]),
    /**
     * The lessons that must be complete — and practised — before this can be
     * attempted. Same shape as `lesson.prerequisites`, so a reason is required:
     * the gate is the platform's one hard lock, and a lock with no explanation is
     * a wall.
     */
    prerequisites: z.array(PrerequisiteSchema).default([]),
    /** The situation the learner is placed in. Prose, and the point of the task. */
    scenario: z.string().min(20),
    /** What the finished work must satisfy. At least one, or there is no task. */
    requirements: z.array(z.string().min(4)).min(1),
    /** Tools the learner needs. A pending collection at M5; references are staged. */
    tools: z.array(ToolSlugSchema).default([]),
    /** The ordered steps. At least one, or the task is not explained. */
    instructions: z.array(z.string().min(4)).min(1),
    /** What the learner actually produces. Concrete, so it can be checked. */
    deliverable: z.string().min(10),
    /**
     * The rubric. At least one line, because a self-evaluation with nothing to
     * evaluate against is not an assessment.
     */
    evaluationCriteria: z.array(AssessmentCriterionSchema).min(1),
    hints: z.array(z.string().min(4)).default([]),
    commonMistakes: z.array(z.string().min(4)).default([]),
    /**
     * How a good answer is shaped, WITHOUT being a model answer to copy. Optional,
     * because some tasks are better described by their rubric than by an example.
     */
    referenceGuidance: z.string().min(10).optional(),
    ...provenanceShape,
  })
  .refine(
    (assessment) =>
      new Set(assessment.evaluationCriteria.map((criterion) => criterion.id)).size ===
      assessment.evaluationCriteria.length,
    {
      path: ['evaluationCriteria'],
      message: 'criterion ids must be unique within an assessment',
    },
  )

export type Assessment = z.infer<typeof AssessmentSchema>
export type AssessmentCriterion = z.infer<typeof AssessmentCriterionSchema>
