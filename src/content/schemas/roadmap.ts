import { z } from 'zod'
import {
  AssessmentSlugSchema,
  ModuleSlugSchema,
  RoadmapSlugSchema,
  CareerPathSlugSchema,
  DifficultySchema,
  provenanceShape,
} from './primitives.js'

/**
 * The progression vocabulary from `plan.md` §38, extended to cover the stages
 * the original five-value list could not express: Projects, Portfolio and Job
 * Preparation.
 *
 * `Stage.kind` is the *progression stage* and is owned by the roadmap. It is a
 * different vocabulary from `Module.kind`, which is an editorial tag. Conflating
 * the two was a v4 error.
 */
export const StageKindSchema = z.enum([
  'foundation',
  'core',
  'tool',
  'specialization',
  'projects',
  'practice',
  'portfolio',
  'career-prep',
  'assessment',
])

export const StageSchema = z.object({
  kind: StageKindSchema,
  /** Defaults to a label derived from `kind` when omitted. */
  title: z.string().min(2).optional(),
  /** A list, not a map: two stages may legitimately share a kind. */
  modules: z.array(ModuleSlugSchema).min(1),
  /** Why this stage exists for THIS roadmap. Optional, and genuinely useful. */
  note: z.string().max(200).optional(),
})

/**
 * Employment, freelance, or both.
 *
 * REQUIRED, with no default. An earlier version defaulted to `both`, which made
 * `both` mean "nobody has decided yet" rather than a deliberate editorial
 * claim. Forcing the statement is free and prevents silent drift across 21
 * roadmaps.
 *
 * The lane controls *emphasis*, never availability: content on the other track is
 * deprioritised, never hidden. That is consistent with the soft-gating decision
 * (Q6) and is what makes this a field sufficient rather than a list.
 *
 * Revisit as `tracks[]` only if a learner needs a *different module selection*
 * within a single roadmap — not a different emphasis, and not more or less
 * content. A third lane (e.g. `agency`) is an enum value, not a trigger. See
 * DECISIONS.md and AGENTS.md.
 */
export const LaneSchema = z.enum(['employment', 'freelance', 'both'])

/** What proves an outcome was achieved. See §4.6 of the implementation plan. */
export const OutcomeSchema = z.object({
  /** "Can triage an inbox into a daily plan" — behavioural, not descriptive. */
  statement: z.string().min(10),
  /** Quiz, lab and assessment slugs that constitute evidence for this outcome. */
  evidence: z
    .array(
      z.union([
        z.object({ kind: z.literal('quiz'), id: z.string().min(2) }),
        z.object({ kind: z.literal('lab'), id: z.string().min(2) }),
        z.object({ kind: z.literal('assessment'), id: z.string().min(2) }),
      ]),
    )
    .default([]),
  weight: z.number().min(0).max(1).default(1),
})

export const RoadmapSchema = z.object({
  id: RoadmapSlugSchema,
  title: z.string().min(3),
  aliases: z.array(z.string().min(1)).max(12).default([]),
  summary: z.string().min(20),
  /** Validated against content/career-paths.ts. Never a free string. */
  careerPath: CareerPathSlugSchema,
  lane: LaneSchema,
  stages: z.array(StageSchema).min(1),
  /**
   * Job readiness is computed from these, weighted by evidence — NOT from
   * lesson completion. A learner who completes everything and fails every quiz
   * must not be told they are job-ready; that is the platform's single worst
   * possible failure mode.
   */
  outcomes: z.array(OutcomeSchema).min(1),
  estimatedWeeks: z.number().int().positive().max(520),
  level: DifficultySchema,
  finalAssessment: AssessmentSlugSchema.optional(),
  ...provenanceShape,
})

export type Roadmap = z.infer<typeof RoadmapSchema>
export type Stage = z.infer<typeof StageSchema>
export type StageKind = z.infer<typeof StageKindSchema>
export type Outcome = z.infer<typeof OutcomeSchema>
